import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron, unauthorized } from "@/lib/cron";
import { sendEventReminders, sendEmptyEventAlerts } from "@/lib/email/jobs";
import { logError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * Scheduler entrypoint for event reminders + empty-event scanning.
 * Invoked by the Netlify scheduled function every 15 minutes (see
 * netlify/functions/email-reminders.mjs).
 *
 * Idempotent: every email is claimed against the delivery log, so frequent
 * runs and retries never duplicate messages.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) return unauthorized();

  const startedAt = Date.now();
  const summary = { remindersSent: 0, emptyAlerts: 0, failed: false };

  try {
    await sendEventReminders();
  } catch (err) {
    summary.failed = true;
    logError("cron/reminders: sendEventReminders failed", err);
  }

  try {
    await sendEmptyEventAlerts();
  } catch (err) {
    summary.failed = true;
    logError("cron/reminders: sendEmptyEventAlerts failed", err);
  }

  return NextResponse.json({
    ok: !summary.failed,
    ...summary,
    latencyMs: Date.now() - startedAt,
    ts: new Date().toISOString(),
  });
}
