/**
 * Shared data types for Fight Zone email templates. These are plain,
 * serializable shapes produced by the email jobs / cancellation handler
 * and consumed by the template builders — templates do NOT reach into the
 * database directly.
 */

export type DeliveryType =
  | "EVENT_REMINDER_COACH"
  | "EVENT_REMINDER_MEMBER"
  | "DAILY_COACH_REPORT"
  | "EVENT_CANCELLATION_ALERT"
  | "EVENT_EMPTY_ALERT";

/** Minimal event facts needed across all templates. */
export interface EmailEvent {
  id: string;
  title: string;
  description: string | null;
  startAt: string; // ISO timestamptz
  endAt: string | null;
  location: string | null;
  eventType: string;
  isPublic: boolean;
  maxParticipants: number | null; // null = unlimited
  participantCount: number; // active (status != CANCELLED)
  isFree: boolean;
  priceTnd: number | null;
}

export interface EmailPayload {
  subject: string;
  html: string;
}

export interface CoachReminderData {
  seifName: string;
  event: EmailEvent;
  manageUrl: string;
  calendarUrl: string;
}

export interface MemberReminderData {
  memberName: string;
  event: EmailEvent;
  eventUrl: string;
  memberUrl: string;
}

export interface DailyReportData {
  seifName: string;
  dateKey: string; // YYYY-MM-DD (business timezone)
  events: EmailEvent[]; // sorted chronologically
  reportUrl: string;
}

export interface CancellationAlertData {
  seifName: string;
  memberName: string;
  memberEmail: string | null;
  event: EmailEvent; // participantCount already reflects the post-cancel value
  eventManageUrl: string;
}

export interface EmptyEventAlertData {
  seifName: string;
  event: EmailEvent; // participantCount === 0
  eventManageUrl: string;
}
