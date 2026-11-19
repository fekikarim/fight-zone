import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { AuthenticationError, DatabaseError, logError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  EventDetail,
  EventParticipant,
  EventSummary,
  MemberRegistration,
  RegistrationStatus,
  ScheduleItem,
} from "@/lib/types/events";

/**
 * V1 event reads. Visibility is enforced by RLS (`events_select_visible`:
 * published/cancelled + public-or-invited; staff see everything). Seat
 * counts come from SECURITY DEFINER aggregates because registration rows
 * are private to their owner.
 */

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export const EVENT_COLUMNS = `id, title, description, start_at, end_at, location, event_type, event_format,
  status, is_public, max_participants, is_free, price_tnd, image_url, category, tags, requirements,
  registration_opens_at, registration_closes_at, requires_approval, waitlist_enabled,
  cancellation_deadline_hours, cancellation_reason, created_at, created_by` as const;

type EventSelect = Pick<
  EventRow,
  | "id" | "title" | "description" | "start_at" | "end_at" | "location" | "event_type" | "event_format"
  | "status" | "is_public" | "max_participants" | "is_free" | "price_tnd" | "image_url" | "category"
  | "tags" | "requirements" | "registration_opens_at" | "registration_closes_at" | "requires_approval"
  | "waitlist_enabled" | "cancellation_deadline_hours" | "cancellation_reason" | "created_at" | "created_by"
>;

export function toEventDetail(event: EventSelect, seatsTaken: number): EventDetail {
  const max = event.max_participants;
  const summary: EventSummary = {
    id: event.id,
    title: event.title,
    description: event.description,
    start_at: event.start_at,
    end_at: event.end_at,
    location: event.location,
    event_type: event.event_type,
    event_format: event.event_format === "INDIVIDUAL" ? "INDIVIDUAL" : "COLLECTIVE",
    status: event.status,
    is_public: event.is_public,
    max_participants: max,
    is_free: event.is_free,
    price_tnd: event.price_tnd == null ? null : Number(event.price_tnd),
    image_url: event.image_url,
    category: event.category,
    tags: event.tags ?? [],
    requirements: event.requirements,
    registration_opens_at: event.registration_opens_at,
    registration_closes_at: event.registration_closes_at,
    requires_approval: event.requires_approval,
    waitlist_enabled: event.waitlist_enabled,
    cancellation_deadline_hours: event.cancellation_deadline_hours,
    cancellation_reason: event.cancellation_reason,
    created_at: event.created_at,
  };
  return {
    ...summary,
    created_by: event.created_by,
    participant_count: seatsTaken,
    spots_left: max != null ? Math.max(0, max - seatsTaken) : null,
    is_private: !event.is_public,
    is_private_coaching: !event.is_public && max === 1,
  };
}

async function staffSeatMap(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_staff_event_participant_counts");
  const map = new Map<string, number>();
  if (error) {
    logError("Query failed: staff seat counts", error);
    return map;
  }
  for (const row of data ?? []) map.set(row.event_id, Number(row.active_count));
  return map;
}

async function publicSeatMap(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_event_participant_counts");
  const map = new Map<string, number>();
  if (error) {
    logError("Query failed: public seat counts", error);
    return map;
  }
  for (const row of data ?? []) map.set(row.event_id, Number(row.active_count));
  return map;
}

export interface PublicEventFilters {
  type?: string;
  category?: string;
  q?: string;
  when?: "upcoming" | "past";
  availability?: "open";
  limit?: number;
}

/** Published public events (RLS hides drafts/private). */
export const getPublicEvents = cache(async (filters: PublicEventFilters = {}): Promise<EventDetail[]> => {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let query = supabase.from("events").select(EVENT_COLUMNS).eq("is_public", true).eq("status", "PUBLISHED");
  if (filters.when === "past") query = query.lt("start_at", nowIso).order("start_at", { ascending: false });
  else query = query.gte("start_at", nowIso).order("start_at", { ascending: true });
  if (filters.type) query = query.eq("event_type", filters.type as EventRow["event_type"]);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.q) query = query.ilike("title", `%${filters.q.replace(/[%_,()]/g, " ").trim()}%`);
  query = query.limit(Math.min(filters.limit ?? 60, 100));

  const { data, error } = await query;
  if (error) {
    logError("Query failed: public events", error);
    return [];
  }
  const seats = await publicSeatMap();
  const events = (data ?? []).map((e) => toEventDetail(e, seats.get(e.id) ?? 0));
  return filters.availability === "open"
    ? events.filter((e) => e.spots_left == null || e.spots_left > 0 || e.waitlist_enabled)
    : events;
});

/** Distinct categories of published public events (filter chips). */
export const getPublicEventCategories = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("category")
    .eq("is_public", true)
    .eq("status", "PUBLISHED")
    .not("category", "is", null)
    .limit(500);
  if (error) return [];
  return [...new Set((data ?? []).map((r) => r.category).filter((c): c is string => !!c))].sort();
});

/** Event visible to the caller (public, invited, or staff) — null if not. */
async function getVisibleEvent(eventId: string): Promise<EventSelect | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select(EVENT_COLUMNS).eq("id", eventId).maybeSingle();
  if (error) {
    if (error.code === "22P02") return null; // malformed uuid
    logError("Query failed: event detail", error, { eventId });
    throw new DatabaseError(undefined, { cause: error });
  }
  return data;
}

async function seatsFor(eventId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_event_seats_taken", { p_event_id: eventId });
  if (error) {
    logError("Query failed: event seats", error, { eventId });
    return 0;
  }
  return Number(data ?? 0);
}

/** Public detail page: only published public events. */
export const getPublicEventById = cache(async (eventId: string): Promise<EventDetail | null> => {
  const event = await getVisibleEvent(eventId);
  if (!event || !event.is_public || (event.status !== "PUBLISHED" && event.status !== "CANCELLED")) return null;
  return toEventDetail(event, await seatsFor(eventId));
});

/** Member detail: public or invited (RLS decides). */
export const getMemberEventViewById = cache(async (eventId: string): Promise<EventDetail | null> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  const event = await getVisibleEvent(eventId);
  if (!event) return null;
  return toEventDetail(event, await seatsFor(eventId));
});

/** Staff detail: any status. */
export const getStaffEventById = cache(async (eventId: string): Promise<EventDetail | null> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  const event = await getVisibleEvent(eventId);
  if (!event) return null;
  return toEventDetail(event, await seatsFor(eventId));
});

const REGISTRATION_COLUMNS = `id, event_id, registration_status, payment_status, attendance_status, amount_due_tnd,
  decision_reason, created_at, payment_method, planned_payment_date,
  payment_submissions ( id, status, amount_declared, rejection_reason, created_at )` as const;

type RegistrationRow = {
  id: string;
  event_id: string;
  registration_status: RegistrationStatus;
  payment_status: MemberRegistration["payment_status"];
  attendance_status: MemberRegistration["attendance_status"];
  amount_due_tnd: number;
  decision_reason: string | null;
  created_at: string;
  payment_method: string | null;
  planned_payment_date: string | null;
  payment_submissions: Array<{
    id: string;
    status: "SUBMITTED" | "CONFIRMED" | "REJECTED";
    amount_declared: number;
    rejection_reason: string | null;
    created_at: string;
  }> | null;
};

function toMemberRegistration(r: RegistrationRow): MemberRegistration {
  const latest = [...(r.payment_submissions ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    id: r.id,
    event_id: r.event_id,
    registration_status: r.registration_status,
    payment_status: r.payment_status,
    attendance_status: r.attendance_status,
    amount_due_tnd: Number(r.amount_due_tnd),
    decision_reason: r.decision_reason,
    created_at: r.created_at,
    payment_method: r.payment_method === "CASH" || r.payment_method === "BANK_TRANSFER" ? r.payment_method : null,
    planned_payment_date: r.planned_payment_date,
    latest_submission: latest
      ? { ...latest, amount_declared: Number(latest.amount_declared) }
      : null,
  };
}

/** The signed-in member's registration for one event (any status). */
export const getMemberEventRegistration = cache(async (eventId: string): Promise<MemberRegistration | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_participants")
    .select(REGISTRATION_COLUMNS)
    .eq("event_id", eventId)
    .eq("member_id", user.id)
    .maybeSingle();
  if (error) {
    logError("Query failed: member event registration", error, { eventId });
    return null;
  }
  return data ? toMemberRegistration(data as unknown as RegistrationRow) : null;
});

export interface MemberEventEntry {
  registration: MemberRegistration;
  event: EventDetail;
}

/** All of the member's registrations with their events (newest first). */
export const getMemberRegisteredEvents = cache(async (): Promise<MemberEventEntry[]> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_participants")
    .select(`${REGISTRATION_COLUMNS}, events ( ${EVENT_COLUMNS} )`)
    .eq("member_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    logError("Query failed: member registered events", error);
    return [];
  }
  type Row = RegistrationRow & { events: EventSelect | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.events)
    .map((r) => ({ registration: toMemberRegistration(r), event: toEventDetail(r.events!, 0) }));
});

/** Confirmed upcoming events for the member schedule. */
export const getMemberSchedule = cache(async (): Promise<ScheduleItem[]> => {
  const entries = await getMemberRegisteredEvents();
  const now = Date.now();
  return entries
    .filter(
      (e) =>
        (e.registration.registration_status === "CONFIRMED" || e.registration.registration_status === "PENDING") &&
        e.event.status === "PUBLISHED" &&
        new Date(e.event.end_at ?? e.event.start_at).getTime() >= now - 2 * 60 * 60 * 1000,
    )
    .map((e) => ({
      kind: "event" as const,
      id: e.event.id,
      title: e.event.title,
      start_at: e.event.start_at,
      end_at: e.event.end_at,
      location: e.event.location,
      status: e.registration.registration_status,
    }))
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, 50);
});

/** All registrations for one event (staff), grouped client-side by status. */
export const getEventParticipants = cache(async (eventId: string): Promise<EventParticipant[]> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_participants")
    .select(
      `id, event_id, member_id, registration_status, payment_status, attendance_status, amount_due_tnd,
       decision_reason, joined_at, payment_method, planned_payment_date,
       member_profiles ( profiles ( full_name, email, phone, avatar_url ) ),
       payment_submissions ( id, status )`,
    )
    .eq("event_id", eventId)
    .order("joined_at", { ascending: true })
    .limit(500);
  if (error) {
    logError("Query failed: event participants", error, { eventId });
    return [];
  }
  type Row = {
    id: string;
    event_id: string;
    member_id: string;
    registration_status: RegistrationStatus;
    payment_status: EventParticipant["payment_status"];
    attendance_status: EventParticipant["attendance_status"];
    amount_due_tnd: number;
    decision_reason: string | null;
    joined_at: string;
    payment_method: string | null;
    planned_payment_date: string | null;
    member_profiles: {
      profiles: { full_name: string | null; email: string; phone: string | null; avatar_url: string | null } | null;
    } | null;
    payment_submissions: Array<{ id: string; status: string }> | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    event_id: r.event_id,
    member_id: r.member_id,
    registration_status: r.registration_status,
    payment_status: r.payment_status,
    attendance_status: r.attendance_status,
    amount_due_tnd: Number(r.amount_due_tnd),
    decision_reason: r.decision_reason,
    joined_at: r.joined_at,
    member_name: r.member_profiles?.profiles?.full_name ?? null,
    member_email: r.member_profiles?.profiles?.email ?? null,
    member_phone: r.member_profiles?.profiles?.phone ?? null,
    member_avatar: r.member_profiles?.profiles?.avatar_url ?? null,
    open_submission_id: r.payment_submissions?.find((s) => s.status === "SUBMITTED")?.id ?? null,
    payment_method: r.payment_method === "CASH" || r.payment_method === "BANK_TRANSFER" ? r.payment_method : null,
    planned_payment_date: r.planned_payment_date,
  }));
});

export interface AdminEventFilters {
  status?: Database["public"]["Enums"]["event_status"];
  when?: "upcoming" | "past";
  q?: string;
}

/** Admin event list (all statuses) with seat counts. */
export const getAdminEvents = cache(async (filters: AdminEventFilters = {}): Promise<EventDetail[]> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let query = supabase.from("events").select(EVENT_COLUMNS).limit(300);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.when === "upcoming") query = query.gte("start_at", nowIso).order("start_at", { ascending: true });
  else if (filters.when === "past") query = query.lt("start_at", nowIso).order("start_at", { ascending: false });
  else query = query.order("start_at", { ascending: false });
  if (filters.q) query = query.ilike("title", `%${filters.q.replace(/[%_,()]/g, " ").trim()}%`);
  const { data, error } = await query;
  if (error) {
    logError("Query failed: admin events", error);
    return [];
  }
  const seats = await staffSeatMap();
  return (data ?? []).map((e) => toEventDetail(e, seats.get(e.id) ?? 0));
});

/** Admin calendar range (same canonical events table). */
export const getCalendarEvents = cache(async (from: string, to: string): Promise<EventDetail[]> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .gte("start_at", from)
    .lte("start_at", to)
    .neq("status", "ARCHIVED")
    .order("start_at", { ascending: true });
  if (error) {
    logError("Query failed: admin calendar events", error, { from, to });
    return [];
  }
  const seats = await staffSeatMap();
  return (data ?? []).map((e) => toEventDetail(e, seats.get(e.id) ?? 0));
});

/** Private-event invitees (staff). */
export const getEventInvitations = cache(
  async (eventId: string): Promise<Array<{ member_id: string; full_name: string | null; email: string }>> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_invitations")
      .select("member_id, profiles!event_invitations_member_id_fkey ( full_name, email )")
      .eq("event_id", eventId);
    if (error) {
      logError("Query failed: event invitations", error, { eventId });
      return [];
    }
    type Row = { member_id: string; profiles: { full_name: string | null; email: string } | null };
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      member_id: r.member_id,
      full_name: r.profiles?.full_name ?? null,
      email: r.profiles?.email ?? "",
    }));
  },
);
