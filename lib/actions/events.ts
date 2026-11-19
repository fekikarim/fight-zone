"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import {
  createEventSchema,
  updateEventSchema,
  registerForEventSchema,
  cancelRegistrationSchema,
  paymentPlanSchema,
  decideRegistrationSchema,
  submitPaymentProofSchema,
  reviewPaymentSchema,
  recordInPersonPaymentSchema,
  recordAttendanceSchema,
  eventStatusSchema,
  invitationSchema,
  deleteEventSchema,
  readCreateEventForm,
  readUpdateEventForm,
} from "@/lib/validations/events";
import { issuesToFieldErrors, type FieldErrors } from "@/lib/validations/form-errors";
import { logError } from "@/lib/errors";
import { notifyEventCancellation } from "@/lib/email/cancellation";
import type { RegistrationStatus } from "@/lib/types/events";
import type { Database } from "@/types/database.types";

type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

/**
 * V1 event actions. Every state change runs through a SECURITY DEFINER RPC
 * (see supabase/migrations/20261118000300_*) that authenticates, authorizes,
 * locks, audits and notifies — these actions validate input, call the RPC,
 * translate errors and revalidate affected pages.
 */

export type EventActionResultCode = "ok" | "full" | "already" | "closed" | "not_available" | "error";

export interface EventActionState {
  ok: boolean;
  message?: string;
  eventId?: string;
  code?: EventActionResultCode;
  registrationStatus?: RegistrationStatus;
  fieldErrors?: FieldErrors;
}

function revalidateEvents(eventId?: string) {
  for (const p of ["/events", "/member", "/member/events", "/member/schedule", "/admin", "/admin/events",
    "/admin/calendar", "/admin/payments", "/admin/registrations"]) {
    revalidatePath(p);
  }
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/member/events/${eventId}`);
    revalidatePath(`/admin/events/${eventId}`);
  }
}

/** Our RPCs raise curated, user-safe messages with these SQLSTATEs. */
const SAFE_CODES = new Set(["42501", "P0002", "23505", "22023", "54000"]);

function rpcFailure(error: { code?: string; message?: string }, fallback: string): EventActionState {
  const safe = error.code && SAFE_CODES.has(error.code) && error.message;
  const message = safe ? error.message! : fallback;
  let code: EventActionResultCode = "error";
  if (message.includes("fully booked")) code = "full";
  else if (message.includes("already registered")) code = "already";
  else if (/closed|already started|not opened/i.test(message)) code = "closed";
  else if (message.includes("not available")) code = "not_available";
  return { ok: false, code, message };
}

const UPDATE_FIELD_MAP = {
  category: "category",
  requirements: "requirements",
  registration_opens_at: "registration_opens_at",
  registration_closes_at: "registration_closes_at",
  requires_approval: "requires_approval",
  waitlist_enabled: "waitlist_enabled",
  cancellation_deadline_hours: "cancellation_deadline_hours",
} as const;

// ─────────────────────────────────────────────────────────────
// Event CRUD (Seif)
// ─────────────────────────────────────────────────────────────

export async function createEvent(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = createEventSchema.safeParse(readCreateEventForm(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const d = parsed.data;
  const isIndividual = d.event_format === "INDIVIDUAL";

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: d.title,
      description: d.description ?? null,
      event_type: d.event_type,
      event_format: d.event_format,
      status: d.publish ? "PUBLISHED" : "DRAFT",
      start_at: d.start_at,
      end_at: d.end_at ?? null,
      location: d.location ?? null,
      is_public: d.is_public,
      // Individual = exactly one participant; visibility is a separate choice.
      max_participants: isIndividual ? 1 : d.max_participants,
      is_free: d.is_free,
      price_tnd: d.is_free ? null : d.price_tnd ?? null,
      image_url: d.image_url ?? null,
      category: d.category ?? null,
      tags: d.tags ?? [],
      requirements: d.requirements ?? null,
      registration_opens_at: d.registration_opens_at ?? null,
      registration_closes_at: d.registration_closes_at ?? null,
      requires_approval: d.requires_approval ?? false,
      waitlist_enabled: isIndividual ? false : d.waitlist_enabled ?? false,
      cancellation_deadline_hours: d.cancellation_deadline_hours ?? 0,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to create event", error);
    if (error.code === "42501") return { ok: false, message: "You do not have permission to create events." };
    if (error.code === "23514") return { ok: false, message: "Some values are not allowed. Please review the form and try again." };
    return { ok: false, message: "We could not create the event. Please try again." };
  }
  revalidateEvents(data.id);
  return { ok: true, eventId: data.id, message: d.publish ? "Event published" : "Draft saved" };
}

export async function updateEvent(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = updateEventSchema.safeParse(readUpdateEventForm(formData));
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  const { is_free, price_tnd, eventId, event_format, tags, ...rest } = parsed.data;
  const patch: Record<string, unknown> = {};
  const updates = patch as EventUpdate;
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && !(k in UPDATE_FIELD_MAP)) patch[k] = v;
  }
  for (const k of Object.keys(UPDATE_FIELD_MAP) as Array<keyof typeof UPDATE_FIELD_MAP>) {
    if (formData.has(k)) {
      patch[k] = rest[k] ?? (k === "requires_approval" || k === "waitlist_enabled" ? false : k === "cancellation_deadline_hours" ? 0 : null);
    }
  }
  if (formData.has("tags")) updates.tags = tags ?? [];
  if (event_format !== undefined) {
    updates.event_format = event_format;
    if (event_format === "INDIVIDUAL") {
      updates.max_participants = 1;
      updates.waitlist_enabled = false;
    }
  }
  if (formData.get("description") === "") updates.description = null;
  if (formData.get("location") === "") updates.location = null;
  if (formData.has("end_at") && !formData.get("end_at")) updates.end_at = null;
  if (is_free !== undefined) {
    updates.is_free = is_free;
    updates.price_tnd = is_free ? null : price_tnd ?? null;
  }

  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.from("events").update(updates).eq("id", eventId);
  if (error) {
    logError("Failed to update event", error, { eventId });
    if (error.message?.includes("Cannot reduce capacity")) {
      return { ok: false, message: error.message, fieldErrors: { max_participants: error.message } };
    }
    return { ok: false, message: "We could not update the event. Please try again." };
  }
  revalidateEvents(eventId);
  return { ok: true, eventId, message: "Changes saved" };
}

/** Publish / unpublish (draft) / cancel / archive. */
export async function setEventStatus(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = eventStatusSchema.safeParse({
    eventId: formData.get("eventId"),
    status: formData.get("status"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_event_status", {
    p_event_id: parsed.data.eventId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason ?? undefined,
  });
  if (error) {
    logError("Failed to change event status", error, { eventId: parsed.data.eventId });
    return rpcFailure(error, "We could not change the event status. Please try again.");
  }
  revalidateEvents(parsed.data.eventId);
  const labels = { DRAFT: "Moved back to draft", PUBLISHED: "Event published", CANCELLED: "Event cancelled — members were notified", ARCHIVED: "Event archived" };
  return { ok: true, eventId: parsed.data.eventId, message: labels[parsed.data.status] };
}

/** Copies an event as a new draft (no registrations). */
export async function duplicateEvent(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = deleteEventSchema.safeParse({ eventId: formData.get("eventId") });
  if (!parsed.success) return { ok: false, message: "Invalid event." };
  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data: src, error: readError } = await supabase
    .from("events")
    .select(`title, description, event_type, event_format, start_at, end_at, location, is_public, max_participants,
             is_free, price_tnd, image_url, category, tags, requirements, requires_approval, waitlist_enabled,
             cancellation_deadline_hours`)
    .eq("id", parsed.data.eventId)
    .single();
  if (readError || !src) return { ok: false, message: "Event not found." };
  // Same weekday/time, one week later if the original is in the past.
  const week = 7 * 24 * 60 * 60 * 1000;
  let start = new Date(src.start_at).getTime();
  const duration = src.end_at ? new Date(src.end_at).getTime() - start : null;
  while (start < Date.now()) start += week;
  const title = `${src.title} (copy)`.slice(0, 200);
  const { data, error } = await supabase
    .from("events")
    .insert({
      ...src,
      title,
      status: "DRAFT",
      start_at: new Date(start).toISOString(),
      end_at: duration != null ? new Date(start + duration).toISOString() : null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) {
    logError("Failed to duplicate event", error);
    return { ok: false, message: "We could not duplicate the event. Please try again." };
  }
  revalidateEvents(data.id);
  return { ok: true, eventId: data.id, message: "Draft copy created" };
}

/** Hard delete is only for drafts without any registration history. */
export async function deleteEvent(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = deleteEventSchema.safeParse({ eventId: formData.get("eventId") });
  if (!parsed.success) return { ok: false, message: "Invalid event." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data: ev } = await supabase.from("events").select("status").eq("id", parsed.data.eventId).maybeSingle();
  const { count } = await supabase
    .from("event_participants")
    .select("id", { count: "exact", head: true })
    .eq("event_id", parsed.data.eventId);
  if (!ev) return { ok: false, message: "Event not found." };
  if (ev.status !== "DRAFT" || (count ?? 0) > 0) {
    return {
      ok: false,
      message: "Only drafts with no registrations can be deleted. Cancel or archive this event instead to keep its history.",
    };
  }
  const { error } = await supabase.from("events").delete().eq("id", parsed.data.eventId);
  if (error) {
    logError("Failed to delete event", error, { eventId: parsed.data.eventId });
    return { ok: false, message: "We could not delete the event. Please try again." };
  }
  revalidateEvents();
  return { ok: true, eventId: parsed.data.eventId, message: "Draft deleted" };
}

export async function setEventInvitation(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = invitationSchema.safeParse({
    eventId: formData.get("eventId"),
    memberId: formData.get("memberId"),
    invited: formData.get("invited") === "true",
  });
  if (!parsed.success) return { ok: false, message: "Choose a member." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_event_invitation", {
    p_event_id: parsed.data.eventId,
    p_member_id: parsed.data.memberId,
    p_invited: parsed.data.invited,
  });
  if (error) {
    logError("Failed to update invitation", error);
    return rpcFailure(error, "We could not update the invitation.");
  }
  revalidateEvents(parsed.data.eventId);
  return { ok: true, eventId: parsed.data.eventId, message: parsed.data.invited ? "Member invited" : "Invitation removed" };
}

// ─────────────────────────────────────────────────────────────
// Member registration
// ─────────────────────────────────────────────────────────────

export async function registerForEvent(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = registerForEventSchema.safeParse({
    eventId: formData.get("eventId"),
    paymentMethod: formData.get("paymentMethod") ?? undefined,
    plannedDate: formData.get("plannedDate") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  // Seif manages events from /admin and never takes a member seat.
  await requireRole(["MEMBER"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_event_with_plan", {
    p_event_id: parsed.data.eventId,
    p_payment_method: parsed.data.paymentMethod,
    p_planned_date: parsed.data.plannedDate,
    p_note: parsed.data.note,
  });
  if (error) {
    if (!SAFE_CODES.has(error.code ?? "")) logError("Failed to register for event", error, { eventId: parsed.data.eventId });
    return rpcFailure(error, "We could not complete your registration. Please try again.");
  }
  revalidateEvents(parsed.data.eventId);
  const status = (data?.[0]?.registration_status ?? "CONFIRMED") as RegistrationStatus;
  return { ok: true, code: "ok", eventId: parsed.data.eventId, registrationStatus: status };
}

export async function cancelMyRegistration(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = cancelRegistrationSchema.safeParse({ registrationId: formData.get("registrationId") });
  if (!parsed.success) return { ok: false, message: "Invalid registration." };
  const user = await requireRole(["MEMBER"]);
  const supabase = await createClient();
  const { data: reg } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("id", parsed.data.registrationId)
    .maybeSingle();
  const { error } = await supabase.rpc("cancel_my_registration", { p_registration_id: parsed.data.registrationId });
  if (error) {
    if (!SAFE_CODES.has(error.code ?? "")) logError("Failed to cancel registration", error);
    return rpcFailure(error, "We could not cancel your registration. Please try again.");
  }
  if (reg?.event_id) {
    revalidateEvents(reg.event_id);
    void notifyEventCancellation({ eventId: reg.event_id, memberId: user.id });
  }
  return { ok: true, code: "ok", eventId: reg?.event_id, message: "Registration cancelled" };
}

/** Member records an uploaded bank-transfer proof (file already in private storage). */
export async function submitPaymentProof(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = submitPaymentProofSchema.safeParse({
    registrationId: formData.get("registrationId"),
    proofPath: formData.get("proofPath"),
    amount: formData.get("amount"),
    reference: formData.get("reference") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  await requireRole(["MEMBER"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_payment_proof", {
    p_registration_id: parsed.data.registrationId,
    p_proof_path: parsed.data.proofPath,
    p_amount: parsed.data.amount,
    p_reference: parsed.data.reference ?? undefined,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) {
    if (!SAFE_CODES.has(error.code ?? "")) logError("Failed to submit payment proof", error);
    return rpcFailure(error, "We could not submit your proof. Please try again.");
  }
  revalidateEvents();
  return { ok: true, message: "Proof sent — Coach Seif will review it" };
}

// ─────────────────────────────────────────────────────────────
// Seif: registrations, payments, attendance
// ─────────────────────────────────────────────────────────────

async function eventIdOfRegistration(registrationId: string): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("event_participants").select("event_id").eq("id", registrationId).maybeSingle();
  return data?.event_id;
}

export async function decideRegistration(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = decideRegistrationSchema.safeParse({
    registrationId: formData.get("registrationId"),
    decision: formData.get("decision"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_registration", {
    p_registration_id: parsed.data.registrationId,
    p_decision: parsed.data.decision,
    p_reason: parsed.data.reason ?? undefined,
  });
  if (error) {
    if (!SAFE_CODES.has(error.code ?? "")) logError("Failed to decide registration", error);
    return rpcFailure(error, "We could not update the registration. Please try again.");
  }
  revalidateEvents(await eventIdOfRegistration(parsed.data.registrationId));
  const msg = { CONFIRM: "Registration confirmed", REJECT: "Registration declined", CANCEL: "Registration cancelled" };
  return { ok: true, message: msg[parsed.data.decision] };
}

export async function reviewPayment(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = reviewPaymentSchema.safeParse({
    submissionId: formData.get("submissionId"),
    decision: formData.get("decision"),
    amount: formData.get("amount") || undefined,
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_payment_submission", {
    p_submission_id: parsed.data.submissionId,
    p_decision: parsed.data.decision,
    p_amount: parsed.data.amount ?? undefined,
    p_reason: parsed.data.reason ?? undefined,
  });
  if (error) {
    if (!SAFE_CODES.has(error.code ?? "")) logError("Failed to review payment", error);
    return rpcFailure(error, "We could not save the review. Please try again.");
  }
  revalidateEvents();
  return { ok: true, message: parsed.data.decision === "CONFIRM" ? "Payment confirmed" : "Proof rejected — the member was told why" };
}

export async function recordInPersonPayment(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = recordInPersonPaymentSchema.safeParse({
    registrationId: formData.get("registrationId"),
    amount: formData.get("amount"),
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_in_person_payment", {
    p_registration_id: parsed.data.registrationId,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) {
    if (!SAFE_CODES.has(error.code ?? "")) logError("Failed to record in-person payment", error);
    return rpcFailure(error, "We could not record the payment. Please try again.");
  }
  revalidateEvents(await eventIdOfRegistration(parsed.data.registrationId));
  return { ok: true, message: "Payment recorded" };
}

export async function recordAttendance(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = recordAttendanceSchema.safeParse({
    registrationId: formData.get("registrationId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_attendance", {
    p_registration_id: parsed.data.registrationId,
    p_status: parsed.data.status,
  });
  if (error) {
    if (!SAFE_CODES.has(error.code ?? "")) logError("Failed to record attendance", error);
    return rpcFailure(error, "We could not record attendance. Please try again.");
  }
  revalidateEvents(await eventIdOfRegistration(parsed.data.registrationId));
  revalidatePath("/member/profile");
  return { ok: true, message: parsed.data.status === "ATTENDED" ? "Marked as attended" : parsed.data.status === "NO_SHOW" ? "Marked as no-show" : "Attendance cleared" };
}

/** Member changes how/when they will pay (bank-transfer plans are posted to Seif). */
export async function setMyPaymentPlan(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const parsed = paymentPlanSchema.safeParse({
    registrationId: formData.get("registrationId"),
    paymentMethod: formData.get("paymentMethod") ?? undefined,
    plannedDate: formData.get("plannedDate") ?? undefined,
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  }
  await requireRole(["MEMBER"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_payment_plan", {
    p_registration_id: parsed.data.registrationId,
    p_payment_method: parsed.data.paymentMethod!,
    p_planned_date: parsed.data.plannedDate,
    p_note: parsed.data.note,
  });
  if (error) {
    if (!SAFE_CODES.has(error.code ?? "")) logError("Failed to set payment plan", error);
    return rpcFailure(error, "We could not save your payment plan.");
  }
  revalidateEvents(await eventIdOfRegistration(parsed.data.registrationId));
  revalidatePath("/member/messages");
  return { ok: true, message: parsed.data.paymentMethod === "BANK_TRANSFER" ? "Plan saved — Coach Seif has been told" : "Plan saved: in person" };
}
