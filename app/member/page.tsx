import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bell,
  ChevronRight,
  MessageSquare,
  Newspaper,
  MapPin,
  Trophy
} from "lucide-react";
import { requireUser, getCurrentUserContext } from "@/lib/auth/guards";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  getUnreadMessageCount,
  getUnreadNotificationCount,
  getPublishedNews,
  getPublicEvents,
} from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";
import { TodayMotivationCard } from "@/components/motivation/today-motivation-card";

export const metadata: Metadata = {
  title: "My Dashboard | Fight Zone",
  description: "Your Fight Zone member dashboard. Train. Fight. Win.",
};

export default async function MemberDashboardPage() {
  const user = await requireUser();
  const [
    context,
    unreadMessages,
    unreadNotifications,
    news,
    events,
  ] = await Promise.all([
    getCurrentUserContext(),
    getUnreadMessageCount(),
    getUnreadNotificationCount(),
    getPublishedNews(2),
    getPublicEvents({ limit: 2 }),
  ]);

  const firstName = user.fullName?.split(" ")[0] ?? "Athlete";

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

      {/* Today's Motivation (server-rendered; hidden until today's quote exists) */}
      <TodayMotivationCard />

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
    </Container>
  );
}
