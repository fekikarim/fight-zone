// Netlify Scheduled Function — once per day at 07:00 it triggers the daily
// coach schedule report. All business logic lives in the Next.js app
// (app/api/cron/daily-report).
import { schedule } from "@netlify/functions";

export const handler = schedule("0 7 * * *", async () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "missing CRON config" }),
    };
  }

  const res = await fetch(`${siteUrl}/api/cron/daily-report`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
  });

  return {
    statusCode: res.status,
    body: await res.text(),
  };
});

export { config } from "@netlify/functions";
