/**
 * Shared event shapes (V1). Pure types + pure helpers — safe to import from
 * server queries, server actions, and client components alike.
 *
 * V1 keeps four SEPARATE lifecycles (see docs/v1/V1_AUDIT_AND_PLAN.md §2):
 * event status, registration status, payment status, attendance status.
 */

export type EventType = "TRAINING" | "WORKSHOP" | "COMPETITION" | "SEMINAR" | "OTHER";

/** Individual (one-person) vs collective (group) event format. */
export type EventFormat = "INDIVIDUAL" | "COLLECTIVE";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "ARCHIVED";
export type RegistrationStatus = "PENDING" | "CONFIRMED" | "WAITLISTED" | "REJECTED" | "CANCELLED";
export type EventPaymentStatus = "NOT_REQUIRED" | "UNPAID" | "PROOF_SUBMITTED" | "PAID" | "REJECTED" | "WAIVED";
export type AttendanceStatus = "UNMARKED" | "ATTENDED" | "NO_SHOW";
export type PaymentSubmissionStatus = "SUBMITTED" | "CONFIRMED" | "REJECTED";

/** Registrations that hold a seat (owner-decision default: pending reserves). */
export const SEAT_HOLDING: readonly RegistrationStatus[] = ["PENDING", "CONFIRMED"];
export const ACTIVE_REGISTRATION: readonly RegistrationStatus[] = ["PENDING", "CONFIRMED", "WAITLISTED"];

export interface EventSummary {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  event_type: EventType;
  event_format: EventFormat;
  status: EventStatus;
  is_public: boolean;
  max_participants: number | null;
  is_free: boolean;
  price_tnd: number | null;
  image_url: string | null;
  category: string | null;
  tags: string[];
  requirements: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  requires_approval: boolean;
  waitlist_enabled: boolean;
  cancellation_deadline_hours: number;
  cancellation_reason: string | null;
  created_at: string;
}

export interface EventDetail extends EventSummary {
  created_by: string;
  /** Seats taken (PENDING + CONFIRMED). */
  participant_count: number;
  spots_left: number | null;
  /** Private (invitation-only) event. */
  is_private: boolean;
  /** @deprecated V0 name — same as `is_private && max_participants === 1`. */
  is_private_coaching: boolean;
}

/** The signed-in member's registration for one event. */
export interface MemberRegistration {
  id: string;
  event_id: string;
  registration_status: RegistrationStatus;
  payment_status: EventPaymentStatus;
  attendance_status: AttendanceStatus;
  amount_due_tnd: number;
  decision_reason: string | null;
  created_at: string;
  payment_method: "CASH" | "BANK_TRANSFER" | null;
  planned_payment_date: string | null;
  latest_submission: {
    id: string;
    status: PaymentSubmissionStatus;
    amount_declared: number;
    rejection_reason: string | null;
    created_at: string;
  } | null;
}

/** A registration as Seif sees it. */
export interface EventParticipant {
  id: string;
  event_id: string;
  member_id: string;
  registration_status: RegistrationStatus;
  payment_status: EventPaymentStatus;
  attendance_status: AttendanceStatus;
  amount_due_tnd: number;
  decision_reason: string | null;
  joined_at: string;
  member_name: string | null;
  member_email: string | null;
  member_phone: string | null;
  member_avatar: string | null;
  open_submission_id: string | null;
  payment_method: "CASH" | "BANK_TRANSFER" | null;
  planned_payment_date: string | null;
}

export interface ScheduleItem {
  kind: "event";
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  status: string;
}

export const registrationStatusLabel: Record<RegistrationStatus, string> = {
  PENDING: "Awaiting approval",
  CONFIRMED: "Confirmed",
  WAITLISTED: "Waitlisted",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
};

export const eventPaymentStatusLabel: Record<EventPaymentStatus, string> = {
  NOT_REQUIRED: "Free",
  UNPAID: "Payment due",
  PROOF_SUBMITTED: "Proof under review",
  PAID: "Paid",
  REJECTED: "Proof rejected",
  WAIVED: "Covered by reward",
};

export const attendanceStatusLabel: Record<AttendanceStatus, string> = {
  UNMARKED: "Not recorded",
  ATTENDED: "Attended",
  NO_SHOW: "No-show",
};

export const eventStatusLabel: Record<EventStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

/** Manual-payment notice (no online payments in V1). */
export const MANUAL_PAYMENT_NOTICE =
  "Payment is made in person or by bank transfer and confirmed manually by Coach Seif. No online payment.";
/** @deprecated V0 name. */
export const CASH_PAYMENT_NOTICE = MANUAL_PAYMENT_NOTICE;

export type EventDisplayState =
  | "draft"
  | "cancelled"
  | "archived"
  | "completed"
  | "in_progress"
  | "full"
  | "registration_not_open"
  | "registration_closed"
  | "open";

/** Derived, time-aware display state (never stored). */
export function getEventDisplayState(
  event: Pick<
    EventDetail,
    "status" | "start_at" | "end_at" | "spots_left" | "registration_opens_at" | "registration_closes_at" | "waitlist_enabled"
  >,
  now: number = Date.now(),
): EventDisplayState {
  if (event.status === "DRAFT") return "draft";
  if (event.status === "CANCELLED") return "cancelled";
  if (event.status === "ARCHIVED") return "archived";
  const start = new Date(event.start_at).getTime();
  const end = event.end_at ? new Date(event.end_at).getTime() : start + 2 * 60 * 60 * 1000;
  if (now >= end) return "completed";
  if (now >= start) return "in_progress";
  if (event.registration_opens_at && now < new Date(event.registration_opens_at).getTime()) return "registration_not_open";
  if (event.registration_closes_at && now >= new Date(event.registration_closes_at).getTime()) return "registration_closed";
  if (event.spots_left === 0 && !event.waitlist_enabled) return "full";
  return "open";
}

export const eventDisplayStateLabel: Record<EventDisplayState, string> = {
  draft: "Draft",
  cancelled: "Cancelled",
  archived: "Archived",
  completed: "Completed",
  in_progress: "In progress",
  full: "Full",
  registration_not_open: "Opens soon",
  registration_closed: "Registration closed",
  open: "Open",
};

/** @deprecated V0 helper kept for older callers. */
export function getEventLifecycleStatus(
  isPublic: boolean,
  startAt: string,
  endAt: string | null,
): "draft" | "upcoming" | "ongoing" | "past" {
  if (!isPublic) return "draft";
  const now = Date.now();
  const start = new Date(startAt).getTime();
  if (start > now) return "upcoming";
  if (endAt && new Date(endAt).getTime() < now) return "past";
  return "ongoing";
}

export const eventTypeLabel: Record<string, string> = {
  TRAINING: "Training",
  WORKSHOP: "Workshop",
  COMPETITION: "Competition",
  SEMINAR: "Seminar",
  OTHER: "Event",
};

/** Formats a TND amount with millimes, e.g. 45 → "45.000 TND". */
export function formatTnd(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  return `${value.toFixed(3)} TND`;
}

/** Short price label: "Free" or "45 TND" (drops trailing millimes). */
export function priceLabel(event: Pick<EventSummary, "is_free" | "price_tnd">): string {
  if (event.is_free || !event.price_tnd) return "Free";
  const v = Number(event.price_tnd);
  return `${Number.isInteger(v) ? v : v.toFixed(3)} TND`;
}

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
