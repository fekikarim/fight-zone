import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/supabase/config";
import { deliverEmail } from "@/lib/email/send";
import {
  buildDailyCoachReportEmail,
  buildEmptyEventAlertEmail,
  buildEventReminderCoachEmail,
  buildEventReminderMemberEmail,
} from "@/lib/email/templates";
import type { EmailEvent } from "@/lib/email/types";
import {
  BUSINESS_TIMEZONE,
  businessDateKey,
  businessDayEnd,
  businessDayStart,
} from "@/lib/timezone";
import { logError } from "@/lib/errors";

export const REMINDER_WINDOW_MINUTES = 30;
/** Empty-event scan window: events starting within the next 12 hours. */
export const EMPTY_EVENT_WINDOW_HOURS = 12;

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  location: string | null;
  event_type: string;
  is_public: boolean;
  max_participants: number | null;
  is_free: boolean;
  price_tnd: number | null;
  created_by: string;
  participant_count: number;
}

interface Contact {
  id: string;
  email: string;
  full_name: string | null;
}

interface EventParticipant {
  member_id: string;
  email: string;
  full_name: string | null;
}

function toEmailEvent(row: EventRow): EmailEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    eventType: row.event_type,
    isPublic: row.is_public,
    maxParticipants: row.max_participants,
    participantCount: row.participant_count,
    isFree: row.is_free,
    priceTnd: row.price_tnd,
  };
}

/**
 * Resolves the COACH recipient for a given event. Prefers the event
 * creator if they are staff (single-coach model), otherwise falls back to
 * the first staff recipient returned by `get_staff_recipients`.
 */
async function resolveCoachForEvent(
  createdBy: string,
  fallback: Contact[] | null,
): Promise<Contact | null> {
  const admin = createAdminClient();
  const { data: creator, error } = await admin.rpc("get_profile_contact", {
    p_profile_id: createdBy,
  });
  if (!error && creator && creator.length > 0) {
    return creator[0];
  }
  return fallback && fallback.length > 0 ? fallback[0] : null;
}

/** The primary staff recipient (first COACH, else ADMIN). */
async function primaryStaff(): Promise<Contact | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_staff_recipients");
  if (error) {
    throw new Error(`get_staff_recipients failed: ${error.message}`);
  }
  return data && data.length > 0 ? data[0] : null;
}

/** URL fragments shared by templates. */
function urlsForEvent(eventId: string) {
  const base = getSiteUrl();
  return {
    eventUrl: `${base}/events/${eventId}`,
    manageUrl: `${base}/coach/events/${eventId}`,
  };
}

/**
 * Job 1: 30-minute reminders.
 * Finds events starting within the next N minutes and emails:
 *   * the coach (owner) a participant summary;
 *   * each JOINED member a reminder.
 * Each recipient is processed independently so one failure never aborts
 * the batch, and every message is idempotent (never sent twice) via the
 * delivery log under (type, key, recipient).
 */
export async function sendEventReminders(now: Date = new Date()): Promise<void> {
  const admin = createAdminClient();
  const end = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60_000);

  const { data: events, error } = await admin.rpc("get_events_in_range", {
    p_start: now.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) throw new Error(`get_events_in_range (reminders) failed: ${error.message}`);
  if (!events || events.length === 0) return;

  const staff = await primaryStaff().catch(() => null);

  for (const row of events) {
    const event = toEmailEvent(row as EventRow);
    const urls = urlsForEvent(event.id);

    // Coach reminder.
    try {
      const coach = await resolveCoachForEvent(row.created_by, staff ? [staff] : null);
      if (coach?.email) {
        await deliverEmail({
          type: "EVENT_REMINDER_COACH",
          key: `coach-remind:${event.id}`,
          recipient: coach.email,
          subject: `Reminder: ${event.title}`,
          render: () =>
            buildEventReminderCoachEmail({
              seifName: coach.full_name ?? "Coach",
              event,
              manageUrl: urls.manageUrl,
              calendarUrl: urls.eventUrl,
            }),
        });
      }
    } catch (err) {
      logError("sendEventReminders: coach reminder skipped", err, { eventId: event.id });
    }

    // Member reminders (JOINED only).
    try {
      const { data: members, error: mErr } = await admin.rpc(
        "get_event_joined_participants",
        { p_event_id: event.id },
      );
      if (mErr) {
        logError("sendEventReminders: participants query failed", new Error(mErr.message), {
          eventId: event.id,
        });
        continue;
      }
      for (const m of (members ?? []) as EventParticipant[]) {
        try {
          await deliverEmail({
            type: "EVENT_REMINDER_MEMBER",
            key: `member-remind:${event.id}:${m.member_id}`,
            recipient: m.email,
            subject: `Fight Zone: ${event.title} starts in 30 minutes`,
            render: () =>
              buildEventReminderMemberEmail({
                memberName: m.full_name ?? "there",
                event,
                eventUrl: urls.eventUrl,
                memberUrl: urls.manageUrl,
              }),
          });
        } catch (memberErr) {
          logError("sendEventReminders: one member skipped", memberErr, {
            eventId: event.id,
            memberId: m.member_id,
          });
        }
      }
    } catch (err) {
      logError("sendEventReminders: member batch skipped", err, { eventId: event.id });
    }
  }
}

/**
 * Job 2: daily 7 AM coach report.
 * Emails the coach (single message per business day, key = YYYY-MM-DD in
 * the business timezone) with today's full schedule and participant counts.
 */
export async function sendDailyCoachReport(now: Date = new Date()): Promise<void> {
  const admin = createAdminClient();
  const start = businessDayStart(now);
  const end = businessDayEnd(now);
  const dateKey = businessDateKey(now);

  const { data: events, error } = await admin.rpc("get_events_in_range", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) throw new Error(`get_events_in_range (daily) failed: ${error.message}`);

  const coach = await primaryStaff();
  if (!coach?.email) return;

  const eventList = (events ?? []).map((row) => toEmailEvent(row as EventRow));

  await deliverEmail({
    type: "DAILY_COACH_REPORT",
    key: `daily:${dateKey}`,
    recipient: coach.email,
    subject: `Coach daily report — ${dateKey}`,
    render: () =>
      buildDailyCoachReportEmail({
        seifName: coach.full_name ?? "Coach",
        dateKey,
        events: eventList,
        reportUrl: `${getSiteUrl()}/coach/events`,
      }),
  });
}

/**
 * Job 3: empty-event alerts.
 * Emails the coach when an upcoming event (within the next N hours) has
 * zero active participants, so they can promote or fill it. One message
 * per event; idempotent via the delivery log (key = event id).
 */
export async function sendEmptyEventAlerts(now: Date = new Date()): Promise<void> {
  const admin = createAdminClient();
  const end = new Date(now.getTime() + EMPTY_EVENT_WINDOW_HOURS * 3_600_000);

  const { data: events, error } = await admin.rpc("get_events_in_range", {
    p_start: now.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) throw new Error(`get_events_in_range (empty) failed: ${error.message}`);

  const coach = await primaryStaff();
  if (!coach?.email) return;

  for (const row of (events ?? []) as EventRow[]) {
    if (row.participant_count > 0) continue;
    const event = toEmailEvent(row);
    try {
      await deliverEmail({
        type: "EVENT_EMPTY_ALERT",
        key: `empty:${event.id}`,
        recipient: coach.email,
        subject: `No participants yet: ${event.title}`,
        render: () =>
          buildEmptyEventAlertEmail({
            seifName: coach.full_name ?? "Coach",
            event,
            eventManageUrl: urlsForEvent(event.id).manageUrl,
          }),
      });
    } catch (err) {
      logError("sendEmptyEventAlerts: alert skipped", err, { eventId: event.id });
    }
  }
}

export { BUSINESS_TIMEZONE };
