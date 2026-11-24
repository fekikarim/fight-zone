import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { sendPushForNotification, isPushConfigured } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Postgres uuids (zod's .uuid() rejects some valid non-RFC ids).
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const bodySchema = z.object({
  id: uuid,
  user_id: uuid,
  type: z.string().max(40),
  title: z.string().max(300),
  content: z.string().max(2000).nullable().optional(),
  resource_type: z.string().max(40).nullable().optional(),
  resource_id: z.string().max(80).nullable().optional(),
});

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * The shared secret lives in the database (public.push_config) so there is
 * nothing to copy into Netlify; PUSH_WEBHOOK_SECRET is still accepted too.
 */
async function secretOk(received: string | null): Promise<boolean> {
  if (!received) return false;
  const env = process.env.PUSH_WEBHOOK_SECRET;
  if (env && same(received, env)) return true;
  const { data } = await createAdminClient().from("push_config").select("value").eq("key", "push_webhook_secret").maybeSingle();
  return Boolean(data?.value && same(received, data.value));
}

/** Health check (booleans only): is this deployment able to send push? */
export async function GET() {
  return NextResponse.json({
    vapidPublicKey: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    vapidPrivateKey: Boolean(process.env.VAPID_PRIVATE_KEY),
    canSend: isPushConfigured(),
  });
}

/** Called by the database (pg_net) for each new notification. */
export async function POST(request: Request) {
  if (!(await secretOk(request.headers.get("x-push-secret")))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad request", ...(process.env.NODE_ENV !== "production" ? { issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) } : {}) },
      { status: 400 },
    );
  }
  const n = parsed.data;
  if (!isPushConfigured()) return NextResponse.json({ error: "vapid keys missing on this deployment" }, { status: 503 });
  const result = await sendPushForNotification({
    ...n,
    content: n.content ?? null,
    resource_type: n.resource_type ?? null,
    resource_id: n.resource_id ?? null,
  });
  return NextResponse.json(result);
}
