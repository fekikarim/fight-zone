import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { sendPushForNotification } from "@/lib/push/send";

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

function secretOk(received: string | null): boolean {
  const expected = process.env.PUSH_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called by the database (pg_net) for each new notification. */
export async function POST(request: Request) {
  if (!secretOk(request.headers.get("x-push-secret"))) {
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
  const result = await sendPushForNotification({
    ...n,
    content: n.content ?? null,
    resource_type: n.resource_type ?? null,
    resource_id: n.resource_id ?? null,
  });
  return NextResponse.json(result);
}
