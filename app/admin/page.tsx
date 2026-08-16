import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Bell, CalendarDays, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getBookingManagementStats, getAdminBookings, getCurrentUserNotifications } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { BookingStatsCards } from "@/components/admin/booking-stats-cards";
import { BookingStatusBadge } from "@/components/booking-status-badge";
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

  const [{ count: unreadMessages }, stats, recent, notifications] = await Promise.all([
    supabase
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "UNREAD"),
    getBookingManagementStats(),
    getAdminBookings({ pageSize: 5 }),
    getCurrentUserNotifications(5),
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
          A live view of your bookings and messages. Coaches only ever see the
          bookings assigned to them; admins see everything.
        </p>
      </div>

      <section aria-label="Booking metrics" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
            Booking metrics
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/bookings">
              Manage bookings
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
        <BookingStatsCards stats={stats} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section
          aria-label="Recent bookings"
          className="flex flex-col gap-4 rounded-xl border border-ink-border bg-ink-soft/50 p-5 sm:p-6 xl:col-span-2"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
              <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
              Recent bookings
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/bookings">View all</Link>
            </Button>
          </div>

          {recent.rows.length > 0 ? (
            <ul className="flex flex-col divide-y divide-ink-border">
              {recent.rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/bookings/${row.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-ink-soft/60"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium text-foreground">
                        {row.sessions?.title ?? "Session"}
                      </span>
                      <span className="text-xs text-muted">
                        {row.member_profiles?.profiles?.full_name ?? "Member"} ·{" "}
                        {formatDate(row.scheduled_at, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <BookingStatusBadge status={row.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted">No bookings yet.</p>
          )}
        </section>

        <section
          aria-label="Notifications"
          className="flex flex-col gap-4 rounded-xl border border-ink-border bg-ink-soft/50 p-5 sm:p-6"
        >
          <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
            <Bell className="h-5 w-5 text-primary" aria-hidden />
            Notifications
          </h2>

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
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-border bg-ink-soft/50 p-6">
          <p className="font-display text-4xl font-bold text-primary">{unreadMessages ?? 0}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">
            Unread messages
          </p>
        </div>
      </div>
    </Container>
  );
}
