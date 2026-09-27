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
import { getSiteUrl } from "@/lib/supabase/config";
import { siteConfig } from "@/lib/site";

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
  const body = [    `<p style="margin:0 0 18px 0;">Hi ${escapeHtml(data.seifName)},</p>`,
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
    text: [
      `Hi ${data.seifName},`,
      ``,
      `Your event "${e.title}" is starting in 30 minutes.`,
      `Participants: ${e.participantCount}`,
      ``,
      `Open event dashboard: ${data.manageUrl}`,
      ``,
      `— Fight Zone`,
    ].join("\n"),
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
    text: [
      `Hi ${data.memberName},`,
      ``,
      `Just a reminder that you are booked for "${e.title}". We can't wait to see you there.`,
      `Date: ${formatBusinessDate(e.startAt)}`,
      `Time: ${formatEventWindow(e.startAt, e.endAt)}`,
      ...(e.location ? [`Location: ${e.location}`] : []),
      ``,
      `View event: ${data.eventUrl}`,
      `Need to cancel? Review your bookings on Fight Zone.`,
      ``,
      `— Fight Zone`,
    ].join("\n"),
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
    text: [
      `Hi ${data.seifName},`,
      ``,
      hasEvents
        ? `Here is your schedule for today (${formatBusinessDate(data.dateKey)}):`
        : `You have no events scheduled for today (${formatBusinessDate(data.dateKey)}).`,
      ...data.events.map(
        (e) =>
          `• ${e.title} — ${formatEventWindow(e.startAt, e.endAt)} — ${
            e.maxParticipants == null
              ? "Unlimited"
              : `${e.participantCount}/${e.maxParticipants}`
          }${e.location ? ` — ${e.location}` : ""}`,
      ),
      ``,
      `Open today's schedule: ${data.reportUrl}`,
      ``,
      `— Fight Zone`,
    ].join("\n"),
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
    text: [
      `Hi ${data.seifName},`,
      ``,
      `${data.memberName}${data.memberEmail ? ` (${data.memberEmail})` : ""} cancelled their participation in "${e.title}".`,
      `Remaining participants: ${e.participantCount}`,
      ``,
      `Open event dashboard: ${data.eventManageUrl}`,
      ``,
      `— Fight Zone`,
    ].join("\n"),
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
    text: [
      `Hi ${data.seifName},`,
      ``,
      `This event currently has no participants: "${e.title}".`,
      `Date: ${formatBusinessDate(e.startAt)}`,
      `Time: ${formatEventWindow(e.startAt, e.endAt)}`,
      ``,
      `Open event dashboard: ${data.eventManageUrl}`,
      `Consider promoting it or reaching out to members to fill the remaining spots.`,
      ``,
      `— Fight Zone`,
    ].join("\n"),
  };
}

export { businessDateKey };

// ---------------------------------------------------------------------------
// Legacy transactional builders (welcome, password reset, contact).
// Pure like the V3 builders above; the Resend senders in resend.ts only
// transmit. All user input is escaped at render time.
// ---------------------------------------------------------------------------

export interface WelcomeEmailData {
  name: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData): EmailPayload {
  const siteUrl = getSiteUrl();
  const dashboardUrl = `${siteUrl}/member`;
  const title = "Welcome to Fight Zone";
  const body = [
    `<p style="margin:0 0 18px 0;">Hi ${escapeHtml(data.name)},</p>`,
    `<p style="margin:0 0 18px 0;">Welcome to the Fight Zone community! We&apos;re excited to have you start your training journey with us.</p>`,
    `<p style="margin:0 0 8px 0;">Your account has been successfully created. You can now:</p>`,
    `<ul style="margin:0 0 18px 0;padding-left:20px;">`,
    `<li>Book training sessions</li>`,
    `<li>Register for events</li>`,
    `<li>Track your progress</li>`,
    `<li>Connect with our coaching team</li>`,
    `</ul>`,
    renderButton(dashboardUrl, "Open your dashboard"),
    `<p style="margin:0;font-size:13px;color:#52525b;">If you have any questions, feel free to reach out to our team.</p>`,
  ].join("");
  return {
    subject: "Welcome to Fight Zone!",
    html: renderEmailLayout({
      preheader: "Your account is ready — train, fight, win.",
      title,
      bodyHtml: body,
    }),
    text: [
      `Hi ${data.name},`,
      ``,
      `Welcome to the Fight Zone community! We're excited to have you start your training journey with us.`,
      ``,
      `Your account has been successfully created. You can now:`,
      `- Book training sessions`,
      `- Register for events`,
      `- Track your progress`,
      `- Connect with our coaching team`,
      ``,
      `Open your dashboard: ${dashboardUrl}`,
      ``,
      `If you have any questions, feel free to reach out to our team.`,
      ``,
      `${siteConfig.tagline} — The Fight Zone Team`,
    ].join("\n"),
  };
}

export interface PasswordResetEmailData {
  resetLink: string;
}

export function buildPasswordResetEmail(data: PasswordResetEmailData): EmailPayload {
  const title = "Reset Your Password";
  const body = [
    `<p style="margin:0 0 18px 0;">We received a request to reset your password for your Fight Zone account.</p>`,
    renderButton(data.resetLink, "Reset Password"),
    `<p style="margin:0 0 12px 0;font-size:13px;color:#52525b;">This link will expire in 1 hour for security purposes.</p>`,
    `<p style="margin:0;font-size:13px;color:#52525b;">If you didn&apos;t request this password reset, you can safely ignore this email.</p>`,
  ].join("");
  return {
    subject: "Reset Your Password - Fight Zone",
    html: renderEmailLayout({
      preheader: "Reset your Fight Zone password.",
      title,
      bodyHtml: body,
    }),
    text: [
      `We received a request to reset your password for your Fight Zone account.`,
      ``,
      `Reset your password here: ${data.resetLink}`,
      ``,
      `This link will expire in 1 hour for security purposes.`,
      `If you didn't request this password reset, you can safely ignore this email.`,
      ``,
      `${siteConfig.tagline} — The Fight Zone Team`,
    ].join("\n"),
  };
}

export interface ContactNotificationData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export function buildContactNotificationEmail(data: ContactNotificationData): EmailPayload {
  const title = "New Contact Form Submission";
  const body = [
    `<p style="margin:0 0 18px 0;">You have received a new message through the Fight Zone contact form.</p>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;border-radius:8px;margin:0 0 18px 0;">`,
    `<tr><td style="padding:16px 18px;">`,
    renderMeta("Name", data.name),
    renderMeta("Email", data.email),
    renderMeta("Subject", data.subject),
    `</td></tr>`,
    `</table>`,
    `<p style="margin:0 0 8px 0;font-weight:bold;">Message</p>`,
    `<div style="background-color:#f4f4f5;border-radius:8px;padding:14px 18px;">${escapeMultiLine(data.message)}</div>`,
    renderRule(),
    `<p style="margin:0;font-size:13px;color:#52525b;">Please respond to this inquiry at your earliest convenience.</p>`,
  ].join("");
  return {
    subject: `New Contact Form Submission: ${data.subject}`,
    html: renderEmailLayout({
      preheader: `New message from ${data.name}: ${data.subject}`,
      title,
      bodyHtml: body,
    }),
    text: [
      `You have received a new message through the Fight Zone contact form.`,
      ``,
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Subject: ${data.subject}`,
      ``,
      `Message:`,
      data.message,
    ].join("\n"),
  };
}

export interface BookingConfirmationData {
  name: string;
  sessionTitle: string;
  scheduledAt: string;
}

export function buildBookingConfirmationEmail(data: BookingConfirmationData): EmailPayload {
  const title = "Booking Confirmed";
  const when = new Date(data.scheduledAt).toLocaleString();
  const body = [
    `<p style="margin:0 0 18px 0;">Hi ${escapeHtml(data.name)},</p>`,
    `<p style="margin:0 0 18px 0;">Your booking has been confirmed! Here are the details:</p>`,
    renderMeta("Session", data.sessionTitle),
    renderMeta("Date & Time", when),
    renderRule(),
    `<p style="margin:0;font-size:13px;color:#52525b;">Please arrive 10 minutes early for your session. If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>`,
  ].join("");
  return {
    subject: "Booking Confirmed - Fight Zone",
    html: renderEmailLayout({
      preheader: `Your booking is confirmed: ${data.sessionTitle}.`,
      title,
      bodyHtml: body,
    }),
    text: [
      `Hi ${data.name},`,
      ``,
      `Your booking has been confirmed! Here are the details:`,
      `Session: ${data.sessionTitle}`,
      `Date & Time: ${when}`,
      ``,
      `Please arrive 10 minutes early for your session. If you need to cancel or reschedule, please contact us at least 24 hours in advance.`,
      ``,
      `${siteConfig.tagline} — The Fight Zone Team`,
    ].join("\n"),
  };
}

export interface GenericNotificationData {
  subject: string;
  content: string;
}

export function buildGenericNotificationEmail(data: GenericNotificationData): EmailPayload {
  const body = [
    `<div>${escapeMultiLine(data.content)}</div>`,
    renderRule(),
    `<p style="margin:0;font-size:13px;color:#52525b;">${escapeHtml(siteConfig.tagline)} — The Fight Zone Team</p>`,
  ].join("");
  return {
    subject: data.subject,
    html: renderEmailLayout({
      preheader: data.subject,
      title: data.subject,
      bodyHtml: body,
    }),
    text: [`${data.subject}`, ``, data.content, ``, `${siteConfig.tagline} — The Fight Zone Team`].join(
      "\n",
    ),
  };
}
