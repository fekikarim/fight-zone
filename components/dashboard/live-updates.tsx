"use client";

import { useEffect, useId, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getResourceHref, type NotificationRow } from "@/lib/types/notifications";

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
      timer.current = window.setTimeout(() => router.refresh(), 500);
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
            if (!onThread && !memberThread) {
              const href = getResourceHref(role, n.resource_type, n.resource_id);
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
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) window.clearTimeout(timer.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, role, id, router]);

  return null;
}
