// Netlify Scheduled Function — every 15 minutes it triggers the server-side
// event reminder + empty-event scan. All business logic and the Supabase
// client live in the Next.js app (app/api/cron/reminders); this function is
// only a thin, authenticated trigger.
import { schedule } from "@netlify/functions";

export const handler = schedule("*/15 * * * *", async () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "missing CRON config" }),
    };
  }

  const res = await fetch(`${siteUrl}/api/cron/reminders`, {
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
