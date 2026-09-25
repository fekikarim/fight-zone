/**
 * Shared event shapes.  Pure types only — safe to import from
 * server queries, server actions, and client components alike.
 */

export type EventType = "TRAINING" | "WORKSHOP" | "COMPETITION" | "SEMINAR" | "OTHER";

/** Individual (one-on-one coaching) vs collective (group) event format. */
export type EventFormat = "INDIVIDUAL" | "COLLECTIVE";

export type ParticipationStatus =
  | "JOINED"
  | "INTERESTED"
  | "CANCELLED"
  | "ATTENDED"
  | "NO_SHOW";

export type EventPaymentStatus = "UNPAID" | "PAID" | "NOT_REQUIRED";

export interface EventSummary {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  event_type: EventType;
  event_format: EventFormat;
  is_public: boolean;
  max_participants: number | null;
  is_free: boolean;
  price_tnd: number | null;
  image_url: string | null;
  created_at: string;
}

export interface EventDetail extends EventSummary {
  created_by: string;
  participant_count: number;
  /** Active (non-cancelled) participant count, for "spots left". */
  spots_left: number | null;
  /** True when this is a private one-on-one coaching event (capacity 1). */
  is_private_coaching: boolean;
}

/** Cash-payment notice shown on every paid event (no online payments). */
export const CASH_PAYMENT_NOTICE =
  "Paid in cash with the coach before the event starts.";

export interface EventParticipant {
  id: string;
  event_id: string;
  member_id: string;
  status: ParticipationStatus;
  payment_status: EventPaymentStatus;
  attended: boolean;
  joined_at: string;
  member_name: string | null;
  member_avatar: string | null;
}

/** Local payment / attendance status label map. */
export const eventPaymentStatusLabel: Record<EventPaymentStatus, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  NOT_REQUIRED: "Free",
};

export interface ScheduleItem {
  kind: "booking" | "event";
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  status: string;
}

/** Derive a human-readable event lifecycle status from fields. */
export function getEventLifecycleStatus(
  isPublic: boolean,
  startAt: string,
  endAt: string | null,
): "draft" | "upcoming" | "ongoing" | "past" {
  if (!isPublic) return "draft";
  const now = Date.now();
  const start = new Date(startAt).getTime();
  if (start > now) return "upcoming";
  if (endAt) {
    const end = new Date(endAt).getTime();
    if (end < now) return "past";
  }
  return "ongoing";
}

/** Map event_type to a human-readable label. */
export const eventTypeLabel: Record<string, string> = {
  TRAINING: "Training",
  WORKSHOP: "Workshop",
  COMPETITION: "Competition",
  SEMINAR: "Seminar",
  OTHER: "Event",
};

/** Map participation_status to a human-readable label. */
export const participationStatusLabel: Record<string, string> = {
  JOINED: "Registered",
  INTERESTED: "Interested",
  CANCELLED: "Cancelled",
  ATTENDED: "Attended",
  NO_SHOW: "No-show",
};

/** Resolve the deep-link path for an event resource. */
export function getEventHref(role: "public" | "member" | "staff", eventId: string): string {
  switch (role) {
    case "staff":
      return `/admin/events/${eventId}`;
    case "member":
      return `/member/events/${eventId}`;
    default:
      return `/events/${eventId}`;
  }
}
