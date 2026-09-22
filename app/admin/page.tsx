import type { Metadata } from "next";
import Link from "next/link";
import { Bell, MessageSquare } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getCurrentUserNotifications, getUnreadMessageCount, getUnreadNotificationCount } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin",
  description: "Fight Zone admin dashboard.",
};

export default async function AdminPage() {
  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();

  const [{ count: unreadMessages }, unreadChat, notifications, unreadNotifications] =
    await Promise.all([
      supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "UNREAD"),
      getUnreadMessageCount(),
      getCurrentUserNotifications(5),
      getUnreadNotificationCount(),
    ]);

  return (
    <Container className="flex max-w-none flex-col gap-10 px-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            Admin overview
          </h1>
          {user.roles.map((role) => (
            <Badge key={role} variant="neutral">
              {role}
            </Badge>
          ))}
        </div>
        <p className="max-w-2xl text-sm text-muted">
          A live view of your chat, notifications and membership activity.
        </p>
      </div>

      <section
        aria-label="Notifications"
        className="flex flex-col gap-4 rounded-xl border border-ink-border bg-ink-soft/50 p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
            <Bell className="h-5 w-5 text-primary" aria-hidden />
            Notifications
          </h2>
          {notifications.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/notifications">View all</Link>
            </Button>
          ) : null}
        </div>

        {notifications.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {notifications.map((notification) => (
              <li key={notification.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {notification.title}
                  </span>
                  {!notification.is_read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                  )}
                </div>
                {notification.content ? (
                  <p className="line-clamp-2 text-xs text-muted">{notification.content}</p>
                ) : null}
                <time className="text-xs text-muted/70">
                  {formatDate(notification.created_at, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-muted">You are all caught up.</p>
        )}
      </section>

      <div className="grid gap-6 sm:grid-cols-3">
        <Link
          href="/admin/messages"
          className="rounded-xl border border-ink-border bg-ink-soft/50 p-6 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Unread chat
            </span>
          </div>
          <p className="mt-2 font-display text-4xl font-bold text-primary">{unreadChat ?? 0}</p>
        </Link>
        <Link
          href="/admin/notifications"
          className="rounded-xl border border-ink-border bg-ink-soft/50 p-6 transition-colors hover:border-primary/40"
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              Unread notifications
            </span>
          </div>
          <p className="mt-2 font-display text-4xl font-bold text-primary">{unreadNotifications}</p>
        </Link>
        <div className="rounded-xl border border-ink-border bg-ink-soft/50 p-6">
          <p className="font-display text-4xl font-bold text-primary">{unreadMessages ?? 0}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">
            Unread contact messages
          </p>
        </div>
      </div>
    </Container>
  );
}
