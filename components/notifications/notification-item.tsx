"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  CalendarClock,
  MessageSquare,
  Bell,
  CalendarCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

interface NotificationItemProps {
  notification: NotificationRow;
  role: "member" | "staff";
}

export function NotificationItem({ notification, role }: NotificationItemProps) {
  const [optimisticRead, setOptimisticRead] = useState(notification.is_read);
  const [pending, startTransition] = useTransition();

  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const href = getResourceHref(role, notification.resource_type, notification.resource_id);
  const actionLabel = getResourceLabel(notification.resource_type);

  function handleMarkRead() {
    if (optimisticRead || pending) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("notificationId", notification.id);
      const res = await markNotificationRead({ ok: false }, fd);
      if (res.ok) setOptimisticRead(true);
    });
  }

  const isUnread = !optimisticRead;

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border border-transparent px-4 py-3 transition-colors",
        isUnread
          ? `border-l-[3px] bg-primary-soft/30 ${TYPE_UNREAD_ACCENT[notification.type] ?? "border-l-zinc-400"}`
          : "bg-transparent hover:bg-ink-soft/50",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs",
          isUnread ? "bg-primary-soft text-primary" : "bg-ink-soft text-muted",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              isUnread ? "font-semibold text-foreground" : "text-foreground/80",
            )}
          >
            {notification.title}
          </p>
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>
        {notification.content ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
            {notification.content}
          </p>
        ) : null}
        {href ? (
          <Link
            href={href}
            onClick={handleMarkRead}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {actionLabel}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : null}
        {isUnread && !href ? (
          <button
            type="button"
            onClick={handleMarkRead}
            disabled={pending}
            className="mt-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            {pending ? "Marking…" : "Mark as read"}
          </button>
        ) : null}
      </div>

      {isUnread ? (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      ) : null}
    </div>
  );
}
