import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  CalendarCheck,
  ChevronRight,
  MapPin,
  MessageSquare,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { TodayMotivationCard } from "@/components/motivation/today-motivation-card";
import {
  getMemberRegisteredEvents,
  getPublicEvents,
  getPublishedNews,
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "@/lib/supabase/queries";
import { getMyProgress } from "@/lib/members/progress";
import { formatTnd } from "@/lib/types/events";
import { StatusBadge } from "@/components/ui/status-badge";
import Image from "next/image";
import { ProgressRing } from "@/components/dashboard/progress-ring";
import { Rail } from "@/components/dashboard/rail";
import { EventCard } from "@/components/marketing/event-card";
import { NewsCard } from "@/components/marketing/news-card";
import { isRemoteImage, resolveEventImage } from "@/lib/events/images";
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

  const days = next ? Math.max(0, Math.ceil((new Date(next.event.start_at).getTime() - now) / 86_400_000)) : null;
  const countdown = days == null ? null : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  const nextImage = next
    ? resolveEventImage({ image_url: next.event.image_url, event_type: next.event.event_type, is_private_coaching: false })
    : null;
  const ringValue = progress.next ? progress.attended / progress.next.threshold : progress.earned.length ? 1 : 0;

  const quick = [
    { href: "/member/events?tab=discover", icon: CalendarCheck, label: "Find events" },
    { href: "/member/messages", icon: MessageSquare, label: "Coach chat", badge: unreadMessages },
    { href: "/member/achievements", icon: Trophy, label: "Badges", badge: available.length },
    { href: "/member/notifications", icon: Bell, label: "Alerts", badge: unreadNotifications },
  ];

  return (
    <Container className="flex max-w-none flex-col gap-10 px-0 pb-4">
      {/* Hero: who you are, where you stand */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-ink-softer via-ink-soft to-ink p-6 sm:p-9">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-10 h-[130%] w-1/2 -skew-x-12 bg-gradient-to-b from-primary/25 via-primary/5 to-transparent" />
        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 animate-fade-up">
            <p className="type-overline text-[11px] text-muted">
              {formatDate(new Date(now).toISOString(), { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight sm:text-7xl">
              Let&apos;s go,
              <br />
              <span className="text-primary">{firstName}</span>
            </h1>
            <p className="mt-4 max-w-md text-sm text-foreground/75 sm:text-base">
              {progress.next
                ? `${progress.next.threshold - progress.attended} more event${progress.next.threshold - progress.attended === 1 ? "" : "s"} to unlock ${progress.next.name}.`
                : progress.earned.length
                  ? "Every badge on the board is yours. Keep showing up."
                  : next
                    ? "Your first event is booked. Coach Seif records your attendance on the day."
                    : "Book your first event — every one you attend counts toward your badges."}
            </p>
          </div>
          <Link href="/member/achievements" className="group flex items-center gap-5 self-start rounded-3xl transition-transform active:scale-[0.98] sm:self-auto">
            <ProgressRing value={ringValue} label={`${progress.attended} events attended`}>
              <span className="font-display text-5xl font-bold leading-none tabular">{progress.attended}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">attended</span>
            </ProgressRing>
            <span className="flex flex-col gap-1 sm:hidden lg:flex">
              <span className="type-overline text-[10px] text-muted-foreground">Next badge</span>
              <span className="font-display text-xl font-bold uppercase leading-tight">{progress.next?.name ?? (progress.earned.length ? "All earned" : "Coming soon")}</span>
              {progress.next ? <span className="text-xs text-muted tabular">{progress.attended} / {progress.next.threshold}</span> : null}
            </span>
          </Link>
        </div>
      </section>

      {/* Quick actions */}
      <nav aria-label="Quick actions" className="grid grid-cols-4 gap-3 sm:max-w-xl">
        {quick.map(({ href, icon: Icon, label, badge }) => (
          <Link key={href} href={href} className="group flex flex-col items-center gap-2 text-center">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-ink-soft transition-[transform,background-color,border-color] duration-200 group-hover:border-primary/50 group-hover:bg-primary/10 group-active:scale-95 sm:h-[72px] sm:w-[72px]">
              <Icon className="h-6 w-6 text-foreground" aria-hidden />
              {badge ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-ink">
                  {badge}
                </span>
              ) : null}
            </span>
            <span className="text-xs font-semibold text-foreground/85">{label}</span>
          </Link>
        ))}
      </nav>

      {actions.length ? (
        <section aria-labelledby="todo-h" className="flex flex-col gap-2.5">
          <h2 id="todo-h" className="sr-only">Needs your attention</h2>
          {actions.map((e) => (
            <Link
              key={e.registration.id}
              href={`/member/events/${e.event.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-4 transition-colors hover:border-warning/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15">
                <AlertCircle className="h-5 w-5 text-warning" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {e.registration.payment_status === "REJECTED" ? "Proof rejected — upload again" : "Payment due"}
                </span>
                <span className="block truncate text-xs text-foreground/70">{e.event.title} · {formatTnd(e.registration.amount_due_tnd)}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-warning transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </section>
      ) : null}

      {/* Up next */}
      <section aria-labelledby="next-h" className="flex flex-col gap-4">
        <h2 id="next-h" className="font-display text-2xl font-bold uppercase leading-none tracking-tight sm:text-3xl">Up next</h2>
        {next && nextImage ? (
          <Link
            href={`/member/events/${next.event.id}`}
            className="group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[28px] border border-white/[0.08] sm:min-h-[340px]"
          >
            <div className="zoom-img duotone absolute inset-0">
              <Image src={nextImage} alt="" fill sizes="(min-width: 1200px) 1200px, 100vw" unoptimized={isRemoteImage(nextImage)} className="object-cover" />
            </div>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
            {countdown ? (
              <span className="absolute left-5 top-5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white sm:left-7 sm:top-7">
                {countdown}
              </span>
            ) : null}
            <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8">
              <div className="min-w-0">
                <p className="type-overline text-[11px] text-foreground/75">
                  {formatDate(next.event.start_at, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="mt-2 font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">{next.event.title}</p>
                {next.event.location ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground/75"><MapPin className="h-4 w-4" aria-hidden />{next.event.location}</p>
                ) : null}
              </div>
              <span className="flex flex-wrap gap-1.5">
                <StatusBadge kind="registration" status={next.registration.registration_status} />
                {next.registration.payment_status !== "NOT_REQUIRED" ? <StatusBadge kind="payment" status={next.registration.payment_status} /> : null}
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-[28px] border border-dashed border-white/15 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-2xl font-bold uppercase leading-tight">Nothing booked yet</p>
              <p className="mt-1 text-sm text-muted">Pick an event — your place is held the moment you register.</p>
            </div>
            <Button asChild size="lg" className="w-full sm:w-auto"><Link href="/member/events?tab=discover">Find an event</Link></Button>
          </div>
        )}
        {active.length > 1 ? (
          <Link href="/member/events" className="link-draw w-fit text-sm font-semibold text-muted hover:text-foreground">
            All my events ({active.length})
          </Link>
        ) : null}
      </section>

      <TodayMotivationCard />

      {discover.length ? (
        <Rail id="discover-h" title="Open to join" href="/member/events?tab=discover">
          {discover.map((e) => (
            <div key={e.id} className="w-[82%] shrink-0 snap-start sm:w-[340px]">
              <EventCard event={e} href={`/member/events/${e.id}`} />
            </div>
          ))}
        </Rail>
      ) : null}

      {news.length ? (
        <Rail id="news-h" title="From the corner" href="/news">
          {news.map((n) => (
            <div key={n.id} className="w-[82%] shrink-0 snap-start sm:w-[340px]">
              <NewsCard article={n} />
            </div>
          ))}
        </Rail>
      ) : null}
    </Container>
  );
}
