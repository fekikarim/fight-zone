"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, MessageSquare, Bell, CalendarCheck, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { markNotificationRead } from "@/lib/actions/notifications";
import { getResourceHref, getResourceLabel } from "@/lib/types/notifications";
import type { NotificationRow } from "@/lib/types/notifications";

const TYPE_ICONS = {
  BOOKING: CalendarClock,
  SESSION: CalendarCheck,
  EVENT: CalendarClock,
  MESSAGE: MessageSquare,
  SYSTEM: Bell,
} as const;

const TYPE_UNREAD_ACCENT: Record<string, string> = {
  BOOKING: "border-l-blue-500",
  SESSION: "border-l-emerald-500",
  EVENT: "border-l-purple-500",
  MESSAGE: "border-l-amber-500",
  SYSTEM: "border-l-zinc-400",
};

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso, { month: "short", day: "numeric" });
}

interface NotificationItemProps {
  notification: NotificationRow;
  role: "member" | "staff";
}

export function NotificationItem({ notification, role }: NotificationItemProps) {
  const router = useRouter();
  const [optimisticRead, setOptimisticRead] = useState(notification.is_read);
  const [pending, startTransition] = useTransition();

  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const href = getResourceHref(role, notification.resource_type, notification.resource_id);
  const actionLabel = getResourceLabel(notification.resource_type);
  const isUnread = !optimisticRead;

  function markRead({ refresh }: { refresh: boolean }) {
    if (optimisticRead) return;
    setOptimisticRead(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("notificationId", notification.id);
        const res = await markNotificationRead({ ok: false }, fd);
        if (!res.ok) throw new Error(res.message);
        // Updates the unread badges (sidebar, tab chip, header).
        if (refresh) router.refresh();
      } catch {
        setOptimisticRead(false);
        toast.error("Could not mark this notification as read.");
      }
    });
  }

  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          isUnread ? "bg-primary-soft text-primary" : "bg-ink-soft text-muted",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={cn("text-sm leading-snug", isUnread ? "font-semibold text-foreground" : "text-foreground/80")}>
            {notification.title}
          </p>
          <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>
        {notification.content ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{notification.content}</p>
        ) : null}
        {href ? (
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
            {actionLabel}
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        ) : null}
      </div>

      {isUnread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
    </>
  );

  const cardClass = cn(
    "group relative flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
    isUnread
      ? `border-ink-border border-l-[3px] bg-primary-soft/20 ${TYPE_UNREAD_ACCENT[notification.type] ?? "border-l-zinc-400"}`
      : "border-ink-border/60 bg-transparent",
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={() => markRead({ refresh: false })}
        className={cn(cardClass, "hover:border-primary/40 hover:bg-ink-soft/50 active:bg-ink-soft/70")}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={cardClass}>
      {body}
      {isUnread ? (
        <button
          type="button"
          onClick={() => markRead({ refresh: true })}
          disabled={pending}
          className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={`Mark "${notification.title}" as read`}
          title="Mark as read"
        />
      ) : null}
    </div>
  );
}
