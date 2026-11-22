"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";

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
