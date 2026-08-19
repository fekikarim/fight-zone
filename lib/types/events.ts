/**
 * Shared event shapes.  Pure types only — safe to import from
 * server queries, server actions, and client components alike.
 */

export type EventType = "TRAINING" | "WORKSHOP" | "COMPETITION" | "SEMINAR" | "OTHER";

export type ParticipationStatus =
  | "JOINED"
  | "INTERESTED"
  | "CANCELLED"
  | "ATTENDED"
  | "NO_SHOW";

export interface EventSummary {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  event_type: EventType;
  is_public: boolean;
  max_participants: number | null;
  created_at: string;
}

export interface EventDetail extends EventSummary {
  created_by: string;
  participant_count: number;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  member_id: string;
  status: ParticipationStatus;
  joined_at: string;
  member_name: string | null;
  member_avatar: string | null;
}

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
