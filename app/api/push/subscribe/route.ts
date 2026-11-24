import { NextResponse } from "next/server";
import { z } from "zod";
import { savePushSubscription, removePushSubscription } from "@/lib/actions/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(10).max(300),
  auth: z.string().min(5).max(100),
  oldEndpoint: z.string().url().max(1000).optional(),
});

/** Used by the service worker when the browser rotates a device's subscription. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { oldEndpoint, ...sub } = parsed.data;
  const res = await savePushSubscription(sub);
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: 401 });
  if (oldEndpoint && oldEndpoint !== sub.endpoint) await removePushSubscription(oldEndpoint);
  return NextResponse.json({ ok: true });
}
