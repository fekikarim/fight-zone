"use client";

import { useEffect, useId, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getResourceHref, type NotificationRow } from "@/lib/types/notifications";
import { localPushOff, showLocalNotification } from "@/lib/push/client";

/**
 * Platform-wide live layer (mounted once in the dashboard shell).
 * - notifications INSERT for this user (RLS + filter) → toast with a deep
 *   link, then a debounced server refresh so every badge/count updates;
 * - messages INSERT in the user's conversations (RLS) → refresh inbox and
 *   unread badges, plus a toast when the thread isn't open.
 * Realtime events are only hints: data shown always comes from the server.
 */
export function LiveUpdates({ userId, role }: { userId: string; role: "member" | "staff" }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const timer = useRef<number | null>(null);
  const id = useId();

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) window.clearTimeout(timer.current);
      // Background tabs get their timers throttled — refresh at once there.
      if (document.visibilityState === "hidden") router.refresh();
      else timer.current = window.setTimeout(() => router.refresh(), 400);
    };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`live-${userId}-${id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const n = payload.new as NotificationRow;
            const onThread = n.type === "MESSAGE" && n.resource_id && pathRef.current.includes(n.resource_id);
            const memberThread = n.type === "MESSAGE" && role === "member" && pathRef.current.startsWith("/member/messages");
            const href = getResourceHref(role, n.resource_type, n.resource_id);
            // Tab in the background: raise a real device notification instead.
            if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted" && !localPushOff()) {
              void showLocalNotification(n.title, n.content, href ?? (role === "staff" ? "/admin/notifications" : "/member/notifications"), n.id);
            }
            if (!onThread && !memberThread) {
              toast(n.title, {
                description: n.content ?? undefined,
                action: href ? { label: "Open", onClick: () => router.push(href) } : undefined,
              });
            }
            refresh();
          })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
        .subscribe();
    } catch {
      channel = null;
    }
    // Missed events (sleep, network drop): refresh counts when the tab returns.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    // Wake-ups: network back, window focused, page restored from the back/forward cache.
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    // The service worker tells open tabs when a push arrived (they may have been asleep).
    const onWorker = (e: MessageEvent) => { if (e.data?.type === "fz-push") refresh(); };
    navigator.serviceWorker?.addEventListener("message", onWorker);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      navigator.serviceWorker?.removeEventListener("message", onWorker);
      if (timer.current) window.clearTimeout(timer.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, role, id, router]);

  return null;
}
