import "server-only";

import * as webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResourceHref } from "@/lib/types/notifications";
import { logError } from "@/lib/errors";

export interface PushNotificationInput {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  resource_type: string | null;
  resource_id: string | null;
}

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@fightzone.tn", pub, priv);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Deliver one in-app notification to every device the user enabled. */
export async function sendPushForNotification(n: PushNotificationInput): Promise<{ sent: number; removed: number }> {
  if (!configure()) return { sent: 0, removed: 0 };
  const admin = createAdminClient();

  const [{ data: subs }, { data: roleRows }] = await Promise.all([
    admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", n.user_id),
    admin.from("user_role_assignments").select("roles(name)").eq("user_id", n.user_id),
  ]);
  if (!subs?.length) return { sent: 0, removed: 0 };

  const names = (roleRows ?? []).flatMap((r) => {
    const role = r.roles as { name: string } | { name: string }[] | null;
    return Array.isArray(role) ? role.map((x) => x.name) : role ? [role.name] : [];
  });
  const staff = names.some((r) => r === "ADMIN" || r === "COACH");
  const role = staff ? "staff" : "member";
  const url = getResourceHref(role, n.resource_type, n.resource_id) ?? (staff ? "/admin/notifications" : "/member/notifications");

  const payload = JSON.stringify({
    title: n.title,
    body: n.content ?? "",
    url,
    tag: n.id,
    type: n.type,
  });

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 6, urgency: n.type === "MESSAGE" ? "high" : "normal" },
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410 = gone; 401/403 = made with another VAPID key (client re-subscribes on next load).
        if (status === 404 || status === 410 || status === 401 || status === 403) dead.push(s.id);
        else logError("Web push delivery failed", error, { domain: "push", op: "send", userId: n.user_id });
      }
    }),
  );
  if (dead.length) await admin.from("push_subscriptions").delete().in("id", dead);
  if (sent) await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("user_id", n.user_id);
  return { sent, removed: dead.length };
}
