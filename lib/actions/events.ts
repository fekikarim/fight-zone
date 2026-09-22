"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAuthenticated, requireRole } from "@/lib/auth/guards";
import {
  createEventSchema,
  updateEventSchema,
  registerForEventSchema,
  cancelEventRegistrationSchema,
  updateParticipantStatusSchema,
  updateParticipantPaymentSchema,
  deleteEventSchema,
} from "@/lib/validations/events";
import { logError } from "@/lib/errors";
import { notifyEventCancellation } from "@/lib/email/cancellation";

export type EventActionResultCode =
  | "ok"
  | "full"
  | "already"
  | "closed"
  | "not_available"
  | "error";

export interface EventActionState {
  ok: boolean;
  message?: string;
  eventId?: string;
  /** Machine-readable outcome so the UI can render the right state. */
  code?: EventActionResultCode;
}

function revalidateEvents(eventId?: string) {
  revalidatePath("/events");
  revalidatePath("/member/events");
  revalidatePath("/member/schedule");
  revalidatePath("/admin/events");
  revalidatePath("/admin/calendar");
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/member/events/${eventId}`);
    revalidatePath(`/admin/events/${eventId}`);
  }
}

/**
 * Registers the current member for an event.  The database trigger
 * enforces capacity and deadline — the action merely inserts the row
 * with member_id derived from the session.
 */
export async function registerForEvent(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = registerForEventSchema.safeParse({
    eventId: formData.get("eventId"),
  });
  if (!parsed.success) return { ok: false, message: "Invalid event." };

  const user = await assertAuthenticated();
  const supabase = await createClient();

  const { error } = await supabase.from("event_participants").insert({
    event_id: parsed.data.eventId,
    member_id: user.id,
    status: "JOINED",
  });

  if (error) {
    logError("Failed to register for event", error, { eventId: parsed.data.eventId });
    if (error.code === "23505") {
      return {
        ok: false,
        code: "already",
        message: "You are already registered for this event.",
      };
    }
    if (error.code === "42501" || error.message?.includes("fully booked")) {
      return { ok: false, code: "full", message: "This event is fully booked." };
    }
    if (error.message?.includes("already started")) {
      return {
        ok: false,
        code: "closed",
        message: "Registration is closed — this event has already started.",
      };
    }
    if (error.message?.includes("not available")) {
      return {
        ok: false,
        code: "not_available",
        message: "Registration is not available for this event.",
      };
    }
    return {
      ok: false,
      code: "error",
      message: "We could not complete your registration. Please try again.",
    };
  }

  revalidateEvents(parsed.data.eventId);
  return { ok: true, code: "ok", eventId: parsed.data.eventId };
}

/**
 * Cancels the current member's registration for an event.
 * The transition trigger enforces that only valid transitions are allowed.
 */
export async function cancelEventRegistration(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = cancelEventRegistrationSchema.safeParse({
    eventId: formData.get("eventId"),
  });
  if (!parsed.success) return { ok: false, message: "Invalid event." };

  const user = await assertAuthenticated();
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_participants")
    .update({ status: "CANCELLED" })
    .eq("event_id", parsed.data.eventId)
    .eq("member_id", user.id)
    .not("status", "in", "(CANCELLED,ATTENDED,NO_SHOW)");

  if (error) {
    logError("Failed to cancel event registration", error, { eventId: parsed.data.eventId });
    return {
      ok: false,
      code: "error",
      message: "We could not cancel your registration. Please try again.",
    };
  }

  revalidateEvents(parsed.data.eventId);

  // Out-of-band email notification: fires only after the cancellation has
  // committed. It runs in the background and can never block or fail the
  // cancellation (the user's confirmation is DB-authoritative).
  void notifyEventCancellation({ eventId: parsed.data.eventId, memberId: user.id });

  return { ok: true, code: "ok", eventId: parsed.data.eventId };
}

/**
 * Creates a new event.  Staff-only (enforced by RLS + this guard).
 */
export async function createEvent(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = createEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    event_type: formData.get("event_type"),
    start_at: formData.get("start_at"),
    end_at: formData.get("end_at") || undefined,
    location: formData.get("location") || undefined,
    is_public: formData.get("is_public") === "true",
    max_participants: formData.get("max_participants") || undefined,
    is_free: formData.get("is_free") !== "false",
    price_tnd: formData.get("price_tnd") || undefined,
    image_url: formData.get("image_url") || undefined,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Please check the submitted information.";
    return { ok: false, message: msg };
  }

  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
      event_type: parsed.data.event_type,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at,
      location: parsed.data.location,
      is_public: parsed.data.is_public,
      max_participants: parsed.data.max_participants ?? null,
      is_free: parsed.data.is_free,
      price_tnd: parsed.data.is_free ? null : parsed.data.price_tnd ?? null,
      image_url: parsed.data.image_url ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to create event", error);
    return { ok: false, message: "We could not create the event. Please try again." };
  }

  revalidateEvents(data.id);
  return { ok: true, eventId: data.id };
}

/**
 * Updates an existing event.  Staff-only.  Validates dates when both are provided.
 */
export async function updateEvent(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = updateEventSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    event_type: formData.get("event_type") || undefined,
    start_at: formData.get("start_at") || undefined,
    end_at: formData.get("end_at") || undefined,
    location: formData.get("location") || undefined,
    is_public: formData.get("is_public") !== null ? formData.get("is_public") === "true" : undefined,
    max_participants: formData.get("max_participants") || undefined,
    is_free: formData.get("is_free") !== null ? formData.get("is_free") !== "false" : undefined,
    price_tnd: formData.get("price_tnd") !== null ? formData.get("price_tnd") || undefined : undefined,
    image_url: formData.get("image_url") !== null ? formData.get("image_url") || undefined : undefined,
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Please check the submitted information.";
    return { ok: false, message: msg };
  }

  const { is_free, price_tnd, eventId, ...rest } = parsed.data;
  const updates = {
    ...rest,
    is_free,
    price_tnd: is_free ? null : price_tnd ?? null,
  };

  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", eventId);

  if (error) {
    logError("Failed to update event", error, { eventId });
    return { ok: false, message: "We could not update the event. Please try again." };
  }

  revalidateEvents(eventId);
  return { ok: true, eventId };
}

/**
 * Updates a participant's status (staff-only).  Used to mark ATTENDED,
 * NO_SHOW, or CANCELLED.  The transition trigger enforces valid state changes.
 */
export async function updateParticipantStatus(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = updateParticipantStatusSchema.safeParse({
    participantId: formData.get("participantId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { ok: false, message: msg };
  }

  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_participants")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.participantId);

  if (error) {
    logError("Failed to update participant status", error, {
      participantId: parsed.data.participantId,
    });
    if (error.code === "42501") {
      return { ok: false, message: "This status change is not allowed." };
    }
    return { ok: false, message: "We could not update the participant. Please try again." };
  }

  revalidateEvents();
  return { ok: true };
}

/**
 * Staff confirms local payment / attendance on a participant.
 * The column guard (guard_event_participant_self) blocks members from doing this.
 */
export async function updateParticipantPayment(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = updateParticipantPaymentSchema.safeParse({
    participantId: formData.get("participantId"),
    payment_status: formData.get("payment_status"),
    attended: formData.get("attended") === "true",
  });

  if (!parsed.success) return { ok: false, message: "Invalid input." };

  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_participants")
    .update({
      payment_status: parsed.data.payment_status,
      attended: parsed.data.attended,
    })
    .eq("id", parsed.data.participantId);

  if (error) {
    logError("Failed to update participant payment/attendance", error, {
      participantId: parsed.data.participantId,
    });
    return { ok: false, message: "We could not update the participant. Please try again." };
  }

  revalidateEvents();
  return { ok: true };
}

/**
 * Deletes an event (staff-only).  Cascades to event_participants.
 */
export async function deleteEvent(
  _prev: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const parsed = deleteEventSchema.safeParse({ eventId: formData.get("eventId") });
  if (!parsed.success) return { ok: false, message: "Invalid event." };

  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", parsed.data.eventId);

  if (error) {
    logError("Failed to delete event", error, { eventId: parsed.data.eventId });
    return { ok: false, message: "We could not delete the event. Please try again." };
  }

  revalidateEvents();
  return { ok: true, eventId: parsed.data.eventId };
}
