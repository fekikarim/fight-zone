import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron, unauthorized } from "@/lib/cron";
import { sendDailyCoachReport } from "@/lib/email/jobs";
import { logError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * Scheduler entrypoint for the daily 7:00 AM coach report.
 * Invoked once per day by the Netlify scheduled function (see
 * netlify/functions/daily-report.mjs, schedule = 0 7 * * *).
 *
 * The report is idempotent per business day: its delivery key is the local
 * YYYY-MM-DD date, so the daily-report is sent at most once even if the
 * endpoint is invoked several times.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) return unauthorized();

  const startedAt = Date.now();
  try {
    await sendDailyCoachReport();
    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - startedAt,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    logError("cron/daily-report: sendDailyCoachReport failed", err);
    return NextResponse.json(
      { ok: false, latencyMs: Date.now() - startedAt, ts: new Date().toISOString() },
      { status: 500 },
    );
  }
}
