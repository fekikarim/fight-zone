import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  endpoint: z.string().url().max(1000),
  tag: z.string().max(80).optional(),
  shown: z.boolean(),
  error: z.string().max(240).optional(),
  focused: z.boolean().optional(),
});

/**
 * The service worker reports what happened after a push reached the device
 * (shown / failed to show). Only known device endpoints are accepted. This
 * separates "the push service delivered it" from "the device displayed it"
 * in the server logs.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { endpoint, ...info } = parsed.data;
  const { data } = await createAdminClient().from("push_subscriptions").select("id").eq("endpoint", endpoint).maybeSingle();
  if (!data) return NextResponse.json({ ok: false }, { status: 404 });
  let host = "push-service";
  try { host = new URL(endpoint).host; } catch { /* keep default */ }
  console.info(`[fight-zone] ${JSON.stringify({ ts: new Date().toISOString(), level: info.shown ? "info" : "error", domain: "push", op: "device-received", msg: info.shown ? "Push shown on device" : "Push NOT shown on device", host, ...info })}`);
  return NextResponse.json({ ok: true });
}
