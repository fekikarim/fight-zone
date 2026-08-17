import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { requireUser, getCurrentUserContext } from "@/lib/auth/guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { BookingStatusBadge } from "@/components/booking-status-badge";
import { EmptyState } from "@/components/empty-state";
import {
  getCurrentUserBookings,
  getMemberBookingStats,
  getMemberNotifications,
  getUnreadMessageCount,
} from "@/lib/supabase/queries";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Database } from "@/types/database.types";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Your Fight Zone member dashboard.",
};

const notificationTypeLabel: Record<
  Database["public"]["Enums"]["notification_type"],
  string
> = {
  BOOKING: "Booking",
  SESSION: "Session",
  EVENT: "Event",
  MESSAGE: "Message",
  SYSTEM: "System",
};

export default async function MemberDashboardPage() {
  const user = await requireUser();
  const [stats, recentBookings, notifications, context, unreadMessages] = await Promise.all([
    getMemberBookingStats(),
    getCurrentUserBookings(5),
    getMemberNotifications(4),
    getCurrentUserContext(),
    getUnreadMessageCount(),
  ]);

  const firstName = user.fullName?.split(" ")[0] ?? "Member";

  const statCards = [
    {
      label: "Pending requests",
      value: stats.pending,
      icon: CalendarClock,
      href: "/member/bookings",
    },
    {
      label: "Upcoming sessions",
      value: stats.upcoming,
      icon: CalendarCheck,
      href: "/member/bookings",
    },
    {
      label: "Unread messages",
      value: unreadMessages,
      icon: MessageSquare,
      href: "/member/messages",
    },
  ];

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            Welcome back, {firstName}
          </h1>
          {user.roles.map((role) => (
            <Badge key={role} variant="neutral">
              {role}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted">
          Your training, sessions and bookings at a glance.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group flex flex-col gap-3 rounded-xl border border-ink-border bg-ink-soft/50 p-6 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                <card.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="font-display text-4xl font-bold text-primary">
                {card.value}
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {card.label}
            </p>
          </Link>
        ))}
      </div>

      {!context.memberProfile ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary-soft/40 px-6 py-5">
          <div className="flex flex-col gap-1">
            <p className="font-display text-lg font-semibold uppercase tracking-wide">
              Complete your member profile
            </p>
            <p className="text-sm text-muted">
              Add your training details so the coach can tailor every session to you.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/member/profile">
              Complete profile
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold uppercase tracking-wide">
              Recent bookings
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/member/bookings">
                View all
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>

          {recentBookings.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {recentBookings.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/member/bookings/${booking.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-border bg-ink-soft/60 px-4 py-3.5 transition-colors hover:border-primary/40"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">
                        {booking.sessions?.title ?? "Session"}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDate(booking.scheduled_at, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {booking.sessions ? (
                        <span className="hidden text-sm font-semibold text-primary sm:block">
                          {formatPrice(Number(booking.sessions.price))}
                        </span>
                      ) : null}
                      <BookingStatusBadge status={booking.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" aria-hidden />}
              title="No bookings yet"
              description="Explore the available sessions and request your first booking with Coach Seif."
              actionLabel="Browse sessions"
              actionHref="/member/sessions"
            />
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-display text-xl font-bold uppercase tracking-wide">
              Notifications
            </h2>
          </div>

          {notifications.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className="flex gap-3 rounded-lg border border-ink-border bg-ink-soft/60 px-4 py-3"
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      notification.is_read ? "bg-zinc-600" : "bg-primary"
                    }`}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                      {notificationTypeLabel[notification.type]}
                    </span>
                    <span className="font-medium leading-snug">
                      {notification.title}
                    </span>
                    {notification.content ? (
                      <span className="text-sm leading-relaxed text-muted">
                        {notification.content}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted">
                      {formatDate(notification.created_at, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-5 py-10 text-center text-sm text-muted">
              No notifications yet — booking updates will appear here.
            </p>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-4">
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
        <p className="text-sm text-muted">
          Booking requests are sent to Coach Seif for confirmation before they
          are finalised. You&apos;ll be notified at every step.
        </p>
      </div>
    </Container>
  );
}
