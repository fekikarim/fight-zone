"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/guards";
import { sendPushForNotification, type PushResult } from "@/lib/push/send";
import { logError } from "@/lib/errors";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(10).max(300),
  auth: z.string().min(5).max(100),
  userAgent: z.string().max(300).optional(),
});

export async function savePushSubscription(input: z.infer<typeof subscriptionSchema>): Promise<{ ok: boolean; message?: string }> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid subscription." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "You need to sign in." };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      user_agent: parsed.data.userAgent ?? null,
    },
    { onConflict: "endpoint" },
  );
  return error ? { ok: false, message: "Could not save this device." } : { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || typeof endpoint !== "string") return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return { ok: !error };
}

/**
 * "Send me a test": waits a few seconds (so you can close the app or switch
 * away first), then pushes a real notification to every device you enabled.
 */
export async function sendTestPush(): Promise<{ ok: boolean; message?: string; result?: PushResult }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "You need to sign in." };
  await new Promise((r) => setTimeout(r, 6500));
  const result = await sendPushForNotification({
    id: randomUUID(),
    user_id: user.id,
    type: "SYSTEM",
    title: "Fight Zone test",
    content: "It works — you'll get alerts like this, even when the app is closed.",
    resource_type: null,
    resource_id: null,
  });
  return { ok: true, result };
}

/** Client-side registration failures, so they show up in the server logs. */
export async function reportPushClientError(info: { step: string; name?: string; message?: string; standalone?: boolean; permission?: string; hasKey?: boolean; ua?: string }) {
  const user = await getCurrentUser();
  logError("Push registration failed on a device", new Error(`${info.step}: ${info.name ?? ""} ${info.message ?? ""}`.slice(0, 300)), {
    domain: "push", op: "client-register", userId: user?.id,
    standalone: info.standalone, permission: info.permission, hasKey: info.hasKey, ua: (info.ua ?? "").slice(0, 160),
  });
}
