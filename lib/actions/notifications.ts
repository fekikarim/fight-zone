"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { markNotificationReadSchema } from "@/lib/validations/notifications";
import { logError } from "@/lib/errors";

export interface NotificationActionState {
  ok: boolean;
  message?: string;
  affected?: number;
}

const NOTIFY_PATHS = ["/member", "/admin"] as const;

function revalidateNotifications() {
  for (const path of NOTIFY_PATHS) revalidatePath(path, "layout");
  revalidatePath("/member/notifications");
  revalidatePath("/admin/notifications");
}

/**
 * Marks a single notification as read.  Atomic: the UPDATE only touches rows
 * where `user_id = auth.uid() AND is_read = false`.  Idempotent — calling it
 * on an already-read notification returns `{ ok: true, affected: 0 }`.
 *
 * Authorization is enforced by:
 *   1. Server action derives user from session.
 *   2. RLS WHERE `user_id = auth.uid()`.
 *   3. Narrow UPDATE policy requires `is_read = true` after the write.
 */
export async function markNotificationRead(
  _prev: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const parsed = markNotificationReadSchema.safeParse({
    notificationId: formData.get("notificationId"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Invalid notification." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "You need to sign in." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("notifications")
    .update({ is_read: true }, { count: "exact" })
    .eq("id", parsed.data.notificationId)
    .eq("is_read", false);

  if (error) {
    logError("Failed to mark notification read", error, {
      notificationId: parsed.data.notificationId,
    });
    return { ok: false, message: "We could not update this notification." };
  }

  revalidateNotifications();
  return { ok: true, affected: count ?? 0 };
}

/**
 * Marks all of the user's unread notifications as read in a single atomic
 * UPDATE.  Idempotent — if there are no unread notifications, the affected
 * count is 0 and no error is raised.
 */
export async function markAllNotificationsRead(): Promise<NotificationActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "You need to sign in." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("notifications")
    .update({ is_read: true }, { count: "exact" })
    .eq("is_read", false);

  if (error) {
    logError("Failed to mark all notifications read", error);
    return {
      ok: false,
      message: "We could not update your notifications. Please try again.",
    };
  }

  revalidateNotifications();
  return { ok: true, affected: count ?? 0 };
}
