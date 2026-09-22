/**
 * Fight Zone transactional email templates.
 *
 * Pure functions: each takes a data shape from `types.ts` and returns the
 * Resend send payload (`{ subject, html }`). Importing this module has no
 * side effects — it does not read env vars, connect to the DB, or invoke
 * the SMTP/HTTPS client. Delivery is orchestrated by `lib/email/delivery.ts`.
 */

import type {
  CancellationAlertData,
  CoachReminderData,
  DailyReportData,
  EmailPayload,
  EmptyEventAlertData,
  MemberReminderData,
} from "@/lib/email/types";
import {
  escapeHtml,
  escapeMultiLine,
  renderButton,
  renderEmailLayout,
  renderMeta,
  renderRule,
} from "@/lib/email/layout";
import {
  formatBusinessDate,
  formatBusinessTime,
  businessDateKey,
} from "@/lib/timezone";

/** Formats a start/end range like "18:30 – 20:00" (or "18:30" if no end). */
function formatEventWindow(startAt: string, endAt: string | null): string {
  const start = formatBusinessTime(startAt);
  if (!endAt) return start;
  return `${start} – ${formatBusinessTime(endAt)}`;
}

function eventMeta(event: {
  startAt: string;
  endAt: string | null;
  location: string | null;
}): string {
  const date = formatBusinessDate(event.startAt);
  const time = formatEventWindow(event.startAt, event.endAt);
  let html = renderMeta("Date", date) + renderMeta("Time", time);
  if (event.location) html += renderMeta("Location", event.location);
  return html;
}

export function buildEventReminderCoachEmail(data: CoachReminderData): EmailPayload {
  const e = data.event;
  const title = `Reminder: ${e.title} starts in 30 minutes`;
  const body = [
    `<p style="margin:0 0 18px 0;">Hi ${escapeHtml(data.seifName)},</p>`,
    `<p style="margin:0 0 18px 0;">Your event is starting in 30 minutes. Here is the latest participant summary:</p>`,
    renderRule(),
    eventMeta(e),
    renderRule(),
    `<div style="margin:6px 0;">`,
    `<div style="color:#52525b;">Participants</div>`,
    `<div style="font-size:20px;font-weight:bold;color:#18181b;">${e.participantCount}</div>`,
    `</div>`,
    renderButton(data.manageUrl, "Open event dashboard"),
    `<p style="margin:0;font-size:13px;color:#52525b;">Manage this event on Fight Zone.`,
    `</p>`,
  ].join("");
  return {
    subject: title,
    html: renderEmailLayout({ preheader: title, title, bodyHtml: body }),
  };
}

export function buildEventReminderMemberEmail(data: MemberReminderData): EmailPayload {
  const e = data.event;
  const title = `Fight Zone: ${e.title} starts in 30 minutes`;
  const body = [
    `<p style="margin:0 0 18px 0;">Hi ${escapeHtml(data.memberName)},</p>`,
    `<p style="margin:0 0 18px 0;">Just a reminder that you are booked for <strong>${escapeHtml(e.title)}</strong>. We can't wait to see you there.</p>`,
    renderRule(),
    eventMeta(e),
    ...(e.description ? [`<p style="margin:6px 0 0 0;color:#52525b;">${escapeMultiLine(e.description)}</p>`] : []),
    renderRule(),
    renderButton(data.eventUrl, "View event"),
    `<p style="margin:0;font-size:13px;color:#52525b;">Need to cancel? Review your bookings on Fight Zone.</p>`,
  ].join("");
  return {
    subject: title,
    html: renderEmailLayout({ preheader: title, title, bodyHtml: body }),
  };
}

export function buildDailyCoachReportEmail(data: DailyReportData): EmailPayload {
  const title = `Coach daily report — ${formatBusinessDate(data.dateKey)}`;
  const preheader = `${data.events.length} event${data.events.length === 1 ? "" : "s"} scheduled today.`;
  const hasEvents = data.events.length > 0;

  const eventRows = hasEvents
    ? data.events
        .map((e) => {
          const time = formatEventWindow(e.startAt, e.endAt);
          const spots = e.maxParticipants == null ? "Unlimited" : `${e.participantCount}/${e.maxParticipants}`;
          return [
            `<tr>`,
            `<td style="padding:10px 12px;border-top:1px solid #e4e4e7;font-weight:600;">${escapeHtml(e.title)}</td>`,
            `<td style="padding:10px 12px;border-top:1px solid #e4e4e7;">${escapeHtml(time)}</td>`,
            `<td style="padding:10px 12px;border-top:1px solid #e4e4e7;">${escapeHtml(spots)}</td>`,
            `<td style="padding:10px 12px;border-top:1px solid #e4e4e7;">${escapeHtml(e.location ?? "—")}</td>`,
            `</tr>`,
          ].join("");
        })
        .join("")
    : "";

  const body = [
    `<p style="margin:0 0 18px 0;">Hi ${escapeHtml(data.seifName)},</p>`,
    hasEvents
      ? `<p style="margin:0 0 18px 0;">Here is your schedule for today:</p>`
      : `<p style="margin:0 0 18px 0;">You have <strong>no events scheduled</strong> for today.</p>`,
    ...(hasEvents
      ? [
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 8px 0;">`,
          `<tr style="background-color:#18181b;color:#ffffff;">`,
          `<td style="padding:8px 12px;font-size:13px;font-weight:bold;">Event</td>`,
          `<td style="padding:8px 12px;font-size:13px;font-weight:bold;">Time</td>`,
          `<td style="padding:8px 12px;font-size:13px;font-weight:bold;">Spots</td>`,
          `<td style="padding:8px 12px;font-size:13px;font-weight:bold;">Location</td>`,
          `</tr>`,
          eventRows,
          `</table>`,
        ]
      : []),
    renderRule(),
    renderButton(data.reportUrl, "Open today's schedule"),
  ].join("");
  return {
    subject: title,
    html: renderEmailLayout({ preheader, title, bodyHtml: body }),
  };
}

export function buildCancellationAlertEmail(data: CancellationAlertData): EmailPayload {
  const e = data.event;
  const title = `Cancellation: ${data.memberName} left ${e.title}`;
  const body = [
    `<p style="margin:0 0 18px 0;">Hi ${escapeHtml(data.seifName)},</p>`,
    `<p style="margin:0 0 18px 0;"><strong>${escapeHtml(data.memberName)}</strong>${data.memberEmail ? ` (${escapeHtml(data.memberEmail)})` : ""} cancelled their participation in <strong>${escapeHtml(e.title)}</strong>.</p>`,
    renderRule(),
    eventMeta(e),
    renderRule(),
    `<div style="margin:6px 0;">`,
    `<div style="color:#52525b;">Remaining participants</div>`,
    `<div style="font-size:20px;font-weight:bold;color:#18181b;">${e.participantCount}</div>`,
    `</div>`,
    renderButton(data.eventManageUrl, "Open event dashboard"),
  ].join("");
  return {
    subject: title,
    html: renderEmailLayout({ preheader: title, title, bodyHtml: body }),
  };
}

export function buildEmptyEventAlertEmail(data: EmptyEventAlertData): EmailPayload {
  const e = data.event;
  const title = `No participants yet: ${e.title}`;
  const body = [
    `<p style="margin:0 0 18px 0;">Hi ${escapeHtml(data.seifName)},</p>`,
    `<p style="margin:0 0 18px 0;">This event currently has <strong>no participants</strong>:</p>`,
    renderRule(),
    eventMeta(e),
    renderRule(),
    renderButton(data.eventManageUrl, "Open event dashboard"),
    `<p style="margin:12px 0 0 0;font-size:13px;color:#52525b;">Consider promoting it or reaching out to members to fill the remaining spots.</p>`,
  ].join("");
  return {
    subject: title,
    html: renderEmailLayout({ preheader: title, title, bodyHtml: body }),
  };
}

export { businessDateKey };
