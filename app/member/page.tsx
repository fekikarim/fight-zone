import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarCheck,
  ChevronRight,
  Gift,
  MapPin,
  MessageSquare,
  Newspaper,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { BadgeMedal } from "@/components/badges/badge-medal";
import { TodayMotivationCard } from "@/components/motivation/today-motivation-card";
import {
  getMemberRegisteredEvents,
  getPublicEvents,
  getPublishedNews,
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "@/lib/supabase/queries";
import { getMyProgress } from "@/lib/members/progress";
import { formatTnd, priceLabel, registrationStatusLabel } from "@/lib/types/events";
import { formatDate, requestTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Your Fight Zone member dashboard.",
};

export default async function MemberDashboardPage() {
  const user = await requireUser();
  const [entries, unreadMessages, unreadNotifications, news, publicEvents, progress] = await Promise.all([
    getMemberRegisteredEvents(),
    getUnreadMessageCount(),
    getUnreadNotificationCount(),
    getPublishedNews(3),
    getPublicEvents({ limit: 6 }),
    getMyProgress(),
  ]);

  const now = requestTime();
  const firstName = user.fullName?.split(" ")[0] ?? "Athlete";
  const active = entries.filter(
    (e) => ["PENDING", "CONFIRMED", "WAITLISTED"].includes(e.registration.registration_status) &&
      e.event.status === "PUBLISHED" && new Date(e.event.end_at ?? e.event.start_at).getTime() >= now,
  ).sort((a, b) => a.event.start_at.localeCompare(b.event.start_at));
  const next = active.find((e) => e.registration.registration_status === "CONFIRMED") ?? active[0] ?? null;
  const actions = active.filter((e) => ["UNPAID", "REJECTED"].includes(e.registration.payment_status) && e.registration.registration_status !== "WAITLISTED");
  const mine = new Set(active.map((e) => e.event.id));
  const discover = publicEvents.filter((e) => !mine.has(e.id)).slice(0, 3);
  const available = progress.rewards.filter((r) => r.status === "AVAILABLE");
  const pct = progress.next ? Math.min(100, Math.round((progress.attended / progress.next.threshold) * 100)) : 100;

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0 pb-12">
      <section className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted">
          {progress.attended
            ? `${progress.attended} event${progress.attended === 1 ? "" : "s"} attended so far.`
            : "Your first event is waiting — browse what's coming up below."}
        </p>
      </section>

      {actions.length ? (
        <section aria-labelledby="todo-h" className="space-y-2">
          <h2 id="todo-h" className="sr-only">To do</h2>
          {actions.map((e) => (
            <Link key={e.registration.id} href={`/member/events/${e.event.id}`}
              className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary-soft/30 px-4 py-3 hover:border-primary">
              <AlertCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 text-sm">
                {e.registration.payment_status === "REJECTED" ? "Your payment proof was rejected for " : "Payment due for "}
                <strong>{e.event.title}</strong> — {formatTnd(e.registration.amount_due_tnd)}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          ))}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="next-h" className="flex flex-col gap-3 rounded-2xl border border-ink-border bg-ink-soft/40 p-5 sm:p-6">
          <h2 id="next-h" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
            <CalendarCheck className="h-4 w-4 text-primary" aria-hidden /> Your next event
          </h2>
          {next ? (
            <Link href={`/member/events/${next.event.id}`} className="group flex flex-col gap-1">
              <p className="font-display text-2xl font-bold uppercase tracking-tight group-hover:text-primary">{next.event.title}</p>
              <p className="text-sm text-muted">{formatDate(next.event.start_at, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              {next.event.location ? <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="h-3.5 w-3.5" aria-hidden />{next.event.location}</p> : null}
              <p className="mt-1 text-xs font-medium text-primary">{registrationStatusLabel[next.registration.registration_status]}</p>
            </Link>
          ) : (
            <p className="text-sm text-muted">No upcoming registration.</p>
          )}
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Button asChild size="sm"><Link href="/member/events?tab=discover">Find an event</Link></Button>
            {active.length > 1 ? <Button asChild size="sm" variant="outline"><Link href="/member/events">All my events ({active.length})</Link></Button> : null}
          </div>
        </section>

        <section aria-labelledby="prog-h" className="flex flex-col gap-4 rounded-2xl border border-ink-border bg-ink-soft/40 p-5 sm:p-6">
          <h2 id="prog-h" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
            <Trophy className="h-4 w-4 text-primary" aria-hidden /> Progress
          </h2>
          {progress.next ? (
            <div className="flex items-center gap-4">
              <BadgeMedal icon={progress.next.icon} accent={progress.next.accent} earned={false} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Next: {progress.next.name}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-soft" role="progressbar" aria-valuemin={0}
                  aria-valuemax={progress.next.threshold} aria-valuenow={progress.attended} aria-label={`Progress to ${progress.next.name}`}>
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">{progress.attended} / {progress.next.threshold} events attended</p>
              </div>
            </div>
          ) : progress.earned.length ? (
            <p className="text-sm text-muted">You&apos;ve earned every badge available. Respect.</p>
          ) : (
            <p className="text-sm text-muted">Badges are earned from events you attend.</p>
          )}
          {progress.earned.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Earned badges">
              {progress.earned.slice(-6).map((b) => (
                <li key={b.id} title={b.name}><BadgeMedal icon={b.icon} accent={b.accent} size="sm" /></li>
              ))}
            </ul>
          ) : null}
          {available.length ? (
            <p className="flex items-center gap-2 rounded-lg bg-primary-soft/40 px-3 py-2 text-sm">
              <Gift className="h-4 w-4 text-primary" aria-hidden />{available.length} reward{available.length === 1 ? "" : "s"} available
            </p>
          ) : null}
          <Link href="/member/achievements" className="mt-auto text-sm text-primary hover:underline">See all badges →</Link>
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/member/messages" className="flex items-center gap-3 rounded-xl border border-ink-border bg-ink-soft/40 p-4 hover:border-primary/40">
          <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
          <span className="flex-1 text-sm">{unreadMessages ? <><strong>{unreadMessages}</strong> unread message{unreadMessages === 1 ? "" : "s"}</> : "Message Coach Seif"}</span>
          <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
        </Link>
        <Link href="/member/notifications" className="flex items-center gap-3 rounded-xl border border-ink-border bg-ink-soft/40 p-4 hover:border-primary/40">
          <Bell className="h-5 w-5 text-primary" aria-hidden />
          <span className="flex-1 text-sm">{unreadNotifications ? <><strong>{unreadNotifications}</strong> new notification{unreadNotifications === 1 ? "" : "s"}</> : "No new notifications"}</span>
          <ChevronRight className="h-4 w-4 text-muted" aria-hidden />
        </Link>
      </div>

      <TodayMotivationCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="disc-h" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="disc-h" className="text-xs font-semibold uppercase tracking-widest text-muted">Upcoming events</h2>
            <Link href="/member/events?tab=discover" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">All <ArrowRight className="h-3 w-3" aria-hidden /></Link>
          </div>
          {discover.length ? (
            <ul className="divide-y divide-ink-border rounded-xl border border-ink-border">
              {discover.map((e) => (
                <li key={e.id}>
                  <Link href={`/member/events/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink-soft/40">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{e.title}</span>
                      <span className="text-xs text-muted">{formatDate(e.start_at, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {priceLabel(e)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{e.spots_left === 0 ? "Full" : e.spots_left != null ? `${e.spots_left} left` : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-xl border border-dashed border-ink-border px-4 py-6 text-center text-sm text-muted">No other upcoming events right now.</p>}
        </section>
        <section aria-labelledby="news-h" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="news-h" className="text-xs font-semibold uppercase tracking-widest text-muted">Latest news</h2>
            <Link href="/news" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">All <ArrowRight className="h-3 w-3" aria-hidden /></Link>
          </div>
          {news.length ? (
            <ul className="divide-y divide-ink-border rounded-xl border border-ink-border">
              {news.map((n) => (
                <li key={n.id}>
                  <Link href={`/news/${n.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-soft/40">
                    <Newspaper className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">{n.title}</span>
                    {n.published_at ? <span className="shrink-0 text-xs text-muted">{formatDate(n.published_at, { month: "short", day: "numeric" })}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-xl border border-dashed border-ink-border px-4 py-6 text-center text-sm text-muted">No news yet.</p>}
        </section>
      </div>
    </Container>
  );
}
