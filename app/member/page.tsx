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
import { formatTnd, priceLabel } from "@/lib/types/events";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/empty-state";
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

  const tiles = [
    { href: "/member/messages", icon: MessageSquare, label: "Messages", meta: unreadMessages ? `${unreadMessages} unread` : "Talk to Coach Seif", hot: unreadMessages > 0 },
    { href: "/member/notifications", icon: Bell, label: "Notifications", meta: unreadNotifications ? `${unreadNotifications} new` : "All caught up", hot: unreadNotifications > 0 },
    { href: "/member/events?tab=discover", icon: CalendarCheck, label: "Find an event", meta: discover.length ? `${discover.length} open to join` : "See the calendar", hot: false },
    { href: "/member/achievements", icon: Trophy, label: "Achievements", meta: `${progress.earned.length} badge${progress.earned.length === 1 ? "" : "s"} earned`, hot: available.length > 0 },
  ];

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0 pb-12">
      {/* Personal hero */}
      <section className="relative overflow-hidden rounded-lg border border-ink-border bg-ink-soft">
        <div className="pointer-events-none absolute -right-16 top-0 h-full w-2/5 -skew-x-12 bg-primary/[0.08]" aria-hidden />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="type-overline flex items-center gap-2.5 text-muted">
              <span className="slant-bar h-1 w-4" aria-hidden />
              Member area
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
              {progress.attended
                ? progress.next
                  ? `${progress.next.threshold - progress.attended} more event${progress.next.threshold - progress.attended === 1 ? "" : "s"} to unlock ${progress.next.name}.`
                  : "Every badge on the board is yours. Keep showing up."
                : next
                  ? `Your first event is ${formatDate(next.event.start_at, { weekday: "long", month: "long", day: "numeric" })}. Coach Seif records your attendance on the day.`
                  : "Your first event is waiting — register and Coach Seif will record your attendance."}
            </p>
          </div>
          <div className="flex items-end gap-4 lg:border-l lg:border-ink-border lg:pl-8">
            <p className="font-display text-7xl font-bold leading-[0.8] tabular">{progress.attended}</p>
            <p className="type-overline pb-1 text-[10px] text-muted">
              Event{progress.attended === 1 ? "" : "s"}
              <br />attended
            </p>
          </div>
        </div>
      </section>

      {actions.length ? (
        <section aria-labelledby="todo-h" className="flex flex-col gap-2">
          <h2 id="todo-h" className="type-overline text-[11px] text-warning">Needs your attention</h2>
          {actions.map((e) => (
            <Link
              key={e.registration.id}
              href={`/member/events/${e.event.id}`}
              className="group flex items-center gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3.5 transition-colors hover:border-warning/60"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
              <span className="min-w-0 flex-1 text-sm">
                {e.registration.payment_status === "REJECTED" ? "Payment proof rejected — " : "Payment due — "}
                <strong className="font-semibold">{e.event.title}</strong>
                <span className="text-muted"> · {formatTnd(e.registration.amount_due_tnd)}</span>
              </span>
              <span className="hidden text-xs font-semibold text-warning sm:inline">
                {e.registration.payment_status === "REJECTED" ? "Upload again" : "Pay now"}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Next event ticket */}
        <section aria-labelledby="next-h" className="flex flex-col overflow-hidden rounded-lg border border-ink-border bg-ink-soft">
          <h2 id="next-h" className="type-overline flex items-center gap-2 border-b border-ink-border px-5 py-3.5 text-[11px] text-muted">
            <CalendarCheck className="h-4 w-4 text-primary" aria-hidden /> Your next event
          </h2>
          {next ? (
            <Link href={`/member/events/${next.event.id}`} className="group flex flex-1 items-stretch transition-colors hover:bg-white/[0.02]">
              <span className="flex w-24 shrink-0 flex-col items-center justify-center border-r border-ink-border sm:w-28">
                <span className="type-overline text-[10px] text-primary">{formatDate(next.event.start_at, { month: "short" })}</span>
                <span className="font-display text-5xl font-bold leading-none">{formatDate(next.event.start_at, { day: "numeric" })}</span>
                <span className="mt-1 text-xs text-muted">{formatDate(next.event.start_at, { weekday: "short" })}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-2 p-5">
                <span className="font-display text-2xl font-bold uppercase leading-tight transition-colors group-hover:text-primary sm:text-3xl">
                  {next.event.title}
                </span>
                <span className="text-sm text-muted">
                  {formatDate(next.event.start_at, { hour: "numeric", minute: "2-digit" })}
                  {next.event.location ? (
                    <span className="inline-flex items-center gap-1"> · <MapPin className="h-3.5 w-3.5" aria-hidden />{next.event.location}</span>
                  ) : null}
                </span>
                <span className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  <StatusBadge kind="registration" status={next.registration.registration_status} />
                  {next.registration.payment_status !== "NOT_REQUIRED" ? (
                    <StatusBadge kind="payment" status={next.registration.payment_status} />
                  ) : null}
                </span>
              </span>
            </Link>
          ) : (
            <EmptyState
              variant="inline"
              icon={<CalendarCheck />}
              title="No upcoming registration"
              description="Pick an event from the calendar — your place is held as soon as you register."
            />
          )}
          <div className="flex flex-wrap gap-2 border-t border-ink-border px-5 py-4">
            <Button asChild size="sm"><Link href="/member/events?tab=discover">Find an event</Link></Button>
            {active.length > 1 ? <Button asChild size="sm" variant="secondary"><Link href="/member/events">All my events ({active.length})</Link></Button> : null}
          </div>
        </section>

        {/* Progress */}
        <section aria-labelledby="prog-h" className="flex flex-col gap-5 rounded-lg border border-ink-border bg-ink-soft p-5 sm:p-6">
          <h2 id="prog-h" className="type-overline flex items-center gap-2 text-[11px] text-muted">
            <Trophy className="h-4 w-4 text-primary" aria-hidden /> Progress
          </h2>
          {progress.next ? (
            <div className="flex items-center gap-4">
              <BadgeMedal icon={progress.next.icon} accent={progress.next.accent} earned={false} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">Next badge · <span className="font-semibold">{progress.next.name}</span></p>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-softer" role="progressbar" aria-valuemin={0}
                  aria-valuemax={progress.next.threshold} aria-valuenow={progress.attended} aria-label={`Progress to ${progress.next.name}`}>
                  <div className="h-full origin-left -skew-x-12 bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted tabular">{progress.attended} / {progress.next.threshold} events attended</p>
              </div>
            </div>
          ) : progress.earned.length ? (
            <p className="text-sm text-muted">You&apos;ve earned every badge available. Respect.</p>
          ) : (
            <p className="text-sm text-muted">Badges are earned from the events Coach Seif records you at.</p>
          )}
          {progress.earned.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Earned badges">
              {progress.earned.slice(-6).map((b) => (
                <li key={b.id} title={b.name}><BadgeMedal icon={b.icon} accent={b.accent} size="sm" /></li>
              ))}
            </ul>
          ) : null}
          {available.length ? (
            <p className="flex items-center gap-2 rounded-md border border-info/30 bg-info-soft px-3 py-2 text-sm text-info">
              <Gift className="h-4 w-4" aria-hidden />{available.length} reward{available.length === 1 ? "" : "s"} available
            </p>
          ) : null}
          <Link href="/member/achievements" className="group mt-auto inline-flex items-center gap-1.5 text-sm font-semibold">
            <span className="link-draw">See all badges</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </section>
      </div>

      {/* Shortcuts with live counts */}
      <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ href, icon: Icon, label, meta, hot }) => (
          <Link key={href} href={href} className="group lift flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-soft p-4 sm:p-5">
            <span className="flex items-center justify-between">
              <Icon className={hot ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted"} aria-hidden />
              {hot ? <span className="h-2 w-2 rounded-full bg-primary" aria-hidden /> : null}
            </span>
            <span>
              <span className="block font-display text-lg font-semibold uppercase leading-tight">{label}</span>
              <span className={hot ? "text-xs font-medium text-foreground/80" : "text-xs text-muted"}>{meta}</span>
            </span>
          </Link>
        ))}
      </nav>

      <TodayMotivationCard />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="disc-h" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="disc-h" className="type-overline text-[11px] text-muted">Open to join</h2>
            <Link href="/member/events?tab=discover" className="link-draw text-xs font-semibold">All events</Link>
          </div>
          {discover.length ? (
            <ul className="divide-y divide-ink-border overflow-hidden rounded-lg border border-ink-border bg-ink-soft">
              {discover.map((e) => (
                <li key={e.id}>
                  <Link href={`/member/events/${e.id}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.03]">
                    <span className="w-11 shrink-0 text-center">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{formatDate(e.start_at, { month: "short" })}</span>
                      <span className="block font-display text-2xl font-bold leading-none">{formatDate(e.start_at, { day: "numeric" })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{e.title}</span>
                      <span className="text-xs text-muted">{formatDate(e.start_at, { weekday: "short", hour: "numeric", minute: "2-digit" })} · {priceLabel(e)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{e.spots_left === 0 ? "Full" : e.spots_left != null ? `${e.spots_left} left` : ""}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CalendarCheck />} title="Nothing else open" description="You're registered for everything on the calendar right now." />
          )}
        </section>
        <section aria-labelledby="news-h" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="news-h" className="type-overline text-[11px] text-muted">Latest news</h2>
            <Link href="/news" className="link-draw text-xs font-semibold">All news</Link>
          </div>
          {news.length ? (
            <ul className="divide-y divide-ink-border overflow-hidden rounded-lg border border-ink-border bg-ink-soft">
              {news.map((n) => (
                <li key={n.id}>
                  <Link href={`/news/${n.slug}`} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]">
                    <Newspaper className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{n.title}</span>
                    {n.published_at ? <span className="shrink-0 text-xs text-muted">{formatDate(n.published_at, { month: "short", day: "numeric" })}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Newspaper />} title="No news yet" description="Announcements from Coach Seif will appear here." />
          )}
        </section>
      </div>
    </Container>
  );
}
