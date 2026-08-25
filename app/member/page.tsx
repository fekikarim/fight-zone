import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Crown,
  MessageSquare,
  ShieldCheck,
  Activity,
  Newspaper,
  Dumbbell,
  MapPin,
  Clock,
  Trophy
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
  getUnreadNotificationCount,
  getCurrentMemberSubscription,
  getPublishedNews,
  getPublicEvents,
  getActiveSessions,
} from "@/lib/supabase/queries";
import { formatDate, formatPrice } from "@/lib/utils";
import { subscriptionStatusLabel, daysUntilExpiry } from "@/lib/types/memberships";
import type { Database } from "@/types/database.types";

export const metadata: Metadata = {
  title: "My Dashboard | Fight Zone",
  description: "Your Fight Zone member dashboard. Train. Fight. Win.",
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
  const [
    stats,
    recentBookings,
    notifications,
    context,
    unreadMessages,
    unreadNotifications,
    subscription,
    news,
    events,
    activeSessions,
  ] = await Promise.all([
    getMemberBookingStats(),
    getCurrentUserBookings(3),
    getMemberNotifications(3),
    getCurrentUserContext(),
    getUnreadMessageCount(),
    getUnreadNotificationCount(),
    getCurrentMemberSubscription(),
    getPublishedNews(2),
    getPublicEvents({ limit: 2 }),
    getActiveSessions(),
  ]);

  const firstName = user.fullName?.split(" ")[0] ?? "Athlete";

  // Filter out past bookings if needed, but recentBookings usually includes upcoming
  const upcomingBooking = recentBookings.find(b => b.status === "CONFIRMED" || b.status === "PENDING");
  const otherBookings = recentBookings.filter(b => b.id !== upcomingBooking?.id);

  return (
    <Container className="flex max-w-none flex-col gap-10 px-0 pb-12">
      {/* 1. Personal Welcome / Athlete Context */}
      <section className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-soft/40">
        <div className="absolute inset-0 z-0">
          <Image
            src="/components/coach-seif-dridi-illustration-at-the-gym-1024x1037.jpeg"
            alt="Fight Zone Gym"
            fill
            className="object-cover opacity-15 grayscale mix-blend-overlay"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-base via-ink-base/80 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex max-w-2xl flex-col gap-4">
            <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">
              Welcome back, {firstName}.
            </h1>
            <p className="font-display text-xl font-bold uppercase tracking-wide text-primary">
              Ready for your next round?
            </p>
            <p className="text-base text-zinc-300">
              Train with discipline. Build confidence. Every session brings you closer to your next level. This is your personal Fight Zone.
            </p>
          </div>
          
          {!context.memberProfile ? (
            <div className="flex max-w-xl flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/40 bg-primary/10 px-5 py-4 backdrop-blur-sm">
              <div className="flex flex-col gap-1">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
                  Complete your athlete profile
                </p>
                <p className="text-xs text-zinc-300">
                  Add your training details so Coach Seif can tailor your sessions.
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
        </div>
      </section>

      {/* Quick Stats & Membership */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/member/messages" className="group flex items-center justify-between rounded-xl border border-ink-border bg-ink-soft/30 px-5 py-4 transition-colors hover:border-primary/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold uppercase tracking-wide text-white">Messages</span>
              <span className="text-xs text-muted">{unreadMessages > 0 ? `${unreadMessages} unread` : "Up to date"}</span>
            </div>
          </div>
          {unreadMessages > 0 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-ink-base">{unreadMessages}</span>}
        </Link>
        <Link href="/member/notifications" className="group flex items-center justify-between rounded-xl border border-ink-border bg-ink-soft/30 px-5 py-4 transition-colors hover:border-primary/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold uppercase tracking-wide text-white">Alerts</span>
              <span className="text-xs text-muted">{unreadNotifications > 0 ? `${unreadNotifications} unread` : "Up to date"}</span>
            </div>
          </div>
          {unreadNotifications > 0 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-ink-base">{unreadNotifications}</span>}
        </Link>
        
        <div className="sm:col-span-2">
          {subscription && subscription.status === "ACTIVE" ? (
            <Link href="/member/subscription" className="group flex h-full flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-ink-soft/30 px-5 py-4 transition-colors hover:border-primary/50">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
                    {subscription.membership_plans?.name ?? "Membership"}
                  </p>
                  <p className="text-xs text-muted">
                    {daysUntilExpiry(subscription.ends_at)} days left
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="solid">{subscriptionStatusLabel[subscription.status]}</Badge>
                <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
              </div>
            </Link>
          ) : !subscription ? (
            <Link href="/pricing" className="group flex h-full flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-border border-dashed bg-ink-soft/30 px-5 py-4 transition-colors hover:border-primary/40">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-muted" aria-hidden />
                <div>
                  <p className="font-display text-sm font-bold uppercase tracking-wide text-white">Join Fight Zone</p>
                  <p className="text-xs text-muted">Choose a plan to start training.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="group-hover:border-primary group-hover:text-primary">View plans</Button>
            </Link>
          ) : null}
        </div>
      </section>

      {/* 2. My Fight Zone Today (Actionable Dashboard) */}
      <section className="grid gap-6 lg:grid-cols-3">
        
        {/* Next Session & Bookings (Col 1 & 2) */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
              My Fight Zone Today
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/member/bookings">
                All bookings <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>

          {upcomingBooking ? (
            <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-ink-soft/60">
              <div className="absolute right-0 top-0 h-full w-1/3 opacity-20">
                <Image src="/components/young-man-exercising-fitness-gym-room-with-sport-equipment-workouts-guy-training-lifting-dumbbell-sitting-bench-2000x1667.png" alt="Training" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink-soft/60 to-transparent" />
              </div>
              <div className="relative z-10 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <Badge variant="solid" className="bg-primary/20 text-primary hover:bg-primary/30">Next Up</Badge>
                  <BookingStatusBadge status={upcomingBooking.status} />
                </div>
                <h3 className="font-display text-2xl font-bold uppercase text-white">{upcomingBooking.sessions?.title ?? "Session"}</h3>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-300">
                  <div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-primary" /> {formatDate(upcomingBooking.scheduled_at, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                  <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> {formatDate(upcomingBooking.scheduled_at, { hour: 'numeric', minute: '2-digit' })}</div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button asChild size="sm">
                    <Link href={`/member/bookings/${upcomingBooking.id}`}>View details</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-ink-border bg-ink-soft/30 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div className="flex max-w-md flex-col gap-2">
                <h3 className="font-display text-xl font-bold uppercase text-white">Your next round starts here.</h3>
                <p className="text-sm text-muted">You haven't booked an upcoming session yet. Explore Fight Zone training and find the session that fits your goals.</p>
              </div>
              <Button asChild className="mt-2">
                <Link href="/member/sessions">Explore Training</Link>
              </Button>
            </div>
          )}

          {otherBookings.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted">Other recent bookings</h3>
              {otherBookings.map((booking) => (
                <Link key={booking.id} href={`/member/bookings/${booking.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-border bg-ink-soft/40 px-4 py-3 transition-colors hover:border-primary/40">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{booking.sessions?.title ?? "Session"}</span>
                    <span className="text-xs text-muted">{formatDate(booking.scheduled_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications (Col 3) */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">Alerts & Updates</h2>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/member/notifications">All <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            )}
          </div>
          {notifications.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {notifications.map((notification) => (
                <li key={notification.id} className="group relative flex gap-3 rounded-lg border border-ink-border bg-ink-soft/40 px-4 py-3.5 transition-colors hover:border-primary/30">
                  <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? "bg-zinc-700" : "bg-primary"}`} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium leading-snug text-white">{notification.title}</span>
                    <span className="text-xs text-muted">{formatDate(notification.created_at, { month: "short", day: "numeric" })}</span>
                  </div>
                  {/* Invisible link overlay if there's a resource to navigate to. For now just list them. */}
                </li>
              ))}
            </ul>
          ) : (
             <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-ink-border bg-ink-soft/30 p-6 text-center">
               <Bell className="h-8 w-8 text-muted/50" />
               <p className="text-sm text-muted">You're all caught up. No new alerts right now.</p>
             </div>
          )}
        </div>
      </section>

      {/* 3. Discover What's Happening at Fight Zone */}
      <section className="flex flex-col gap-6 pt-6">
        <div className="flex items-center justify-between border-b border-ink-border pb-4">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
            Discover Fight Zone
          </h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Latest News */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">Latest News</h3>
              </div>
              <Button variant="ghost" size="sm" asChild><Link href="/news">Read all</Link></Button>
            </div>
            {news.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {news.map((item) => (
                  <Link key={item.id} href={`/news/${item.slug}`} className="group relative flex h-48 flex-col justify-end overflow-hidden rounded-xl border border-ink-border bg-ink-soft transition-all hover:border-primary/50">
                    {item.cover_image_url ? (
                      <Image src={item.cover_image_url} alt={item.title} fill className="object-cover opacity-50 transition-opacity group-hover:opacity-60" />
                    ) : (
                      <div className="absolute inset-0 bg-ink-soft" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-base via-ink-base/80 to-transparent" />
                    <div className="relative z-10 p-4">
                      <p className="line-clamp-2 font-display text-lg font-bold uppercase leading-tight text-white">{item.title}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary">{formatDate(item.published_at ?? new Date().toISOString(), { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-xl border border-ink-border border-dashed bg-ink-soft/20"><p className="text-sm text-muted">More news coming soon.</p></div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">Upcoming Events</h3>
              </div>
              <Button variant="ghost" size="sm" asChild><Link href="/events">View all</Link></Button>
            </div>
            {events.length > 0 ? (
              <div className="flex flex-col gap-3">
                {events.map((event) => (
                  <Link key={event.id} href={`/member/events/${event.id}`} className="group flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-border bg-ink-soft/40 p-4 transition-colors hover:border-primary/40">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center rounded-lg bg-ink-base px-3 py-2 text-center border border-ink-border group-hover:border-primary/30">
                        <span className="text-xs font-bold uppercase text-primary">{formatDate(event.start_at, { month: "short" })}</span>
                        <span className="font-display text-xl font-bold text-white">{formatDate(event.start_at, { day: "numeric" })}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-display text-lg font-bold uppercase text-white">{event.title}</span>
                        <span className="flex items-center gap-1 text-sm text-muted"><MapPin className="h-3 w-3" /> {event.location}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            ) : (
               <div className="flex h-32 items-center justify-center rounded-xl border border-ink-border border-dashed bg-ink-soft/20"><p className="text-sm text-muted">No upcoming events scheduled.</p></div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Continue Training / Explore Services */}
      <section className="relative overflow-hidden rounded-2xl border border-ink-border bg-ink-soft/60 p-8 sm:p-12 mt-4">
        <div className="absolute right-0 top-0 h-full w-full opacity-10 sm:w-1/2">
          <Image src="/components/bodybuilding-three-man-workouting-gym-flat-3556x2000.jpg" alt="Training" fill className="object-cover object-right" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-soft via-ink-soft/90 to-transparent sm:hidden" />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-ink-soft/60 via-ink-soft/20 to-transparent sm:block" />
        </div>
        <div className="relative z-10 flex max-w-xl flex-col gap-4">
          <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
            Level up your training
          </h2>
          <p className="text-base text-zinc-300">
            Explore the full range of professional boxing, kickboxing, and fitness services offered at Fight Zone. Book a session with Coach Seif and push your limits.
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/member/sessions">Explore Training</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/services">View All Services</Link>
            </Button>
          </div>
        </div>
      </section>
    </Container>
  );
}
