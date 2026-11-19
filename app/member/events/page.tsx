import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarPlus, ChevronRight, Lock, MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { getMemberRegisteredEvents, getPublicEvents } from "@/lib/supabase/queries";
import {
  eventPaymentStatusLabel,
  priceLabel,
  registrationStatusLabel,
  attendanceStatusLabel,
  type EventDetail,
  type MemberRegistration,
} from "@/lib/types/events";
import { formatDate, cn, requestTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Events",
  description: "Your registrations, payments and upcoming Fight Zone events.",
};

const TABS = [
  { key: "upcoming", label: "My upcoming" },
  { key: "discover", label: "Discover" },
  { key: "waitlist", label: "Waitlist" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MemberEventsPage({ searchParams }: Props) {
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "upcoming";
  const [entries, publicEvents] = await Promise.all([getMemberRegisteredEvents(), getPublicEvents({ limit: 60 })]);

  const now = requestTime();
  const isPast = (e: EventDetail) => new Date(e.end_at ?? e.start_at).getTime() < now;
  const groups: Record<Exclude<TabKey, "discover">, typeof entries> = {
    upcoming: entries.filter(
      (x) => ["PENDING", "CONFIRMED"].includes(x.registration.registration_status) && !isPast(x.event) && x.event.status === "PUBLISHED",
    ),
    waitlist: entries.filter((x) => x.registration.registration_status === "WAITLISTED" && !isPast(x.event)),
    past: entries.filter((x) => x.registration.registration_status === "CONFIRMED" && isPast(x.event)),
    cancelled: entries.filter(
      (x) => ["CANCELLED", "REJECTED"].includes(x.registration.registration_status) || x.event.status === "CANCELLED",
    ),
  };
  groups.upcoming.sort((a, b) => a.event.start_at.localeCompare(b.event.start_at));
  const registeredIds = new Set(
    entries.filter((x) => ["PENDING", "CONFIRMED", "WAITLISTED"].includes(x.registration.registration_status)).map((x) => x.event.id),
  );
  const discover = publicEvents.filter((e) => !registeredIds.has(e.id));
  const counts: Record<TabKey, number> = {
    upcoming: groups.upcoming.length,
    discover: discover.length,
    waitlist: groups.waitlist.length,
    past: groups.past.length,
    cancelled: groups.cancelled.length,
  };

  return (
    <Container className="flex max-w-none flex-col gap-6 px-0">
      <PageHeader title="Events" description="Your registrations, payments and what's coming up." />

      <nav aria-label="Event lists" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/member/events?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors",
              tab === t.key ? "border-primary bg-primary text-white" : "border-ink-border text-muted hover:text-foreground",
            )}
          >
            {t.label}
            {counts[t.key] > 0 ? <span className="rounded-full bg-white/15 px-1.5 text-[10px]">{counts[t.key]}</span> : null}
          </Link>
        ))}
      </nav>

      {tab === "discover" ? (
        discover.length ? (
          <ul className="space-y-2">
            {discover.map((e) => (
              <li key={e.id}>
                <EventRow event={e} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No other upcoming events right now — check back soon." />
        )
      ) : groups[tab].length ? (
        <ul className="space-y-2">
          {groups[tab].map((x) => (
            <li key={x.registration.id}>
              <EventRow event={x.event} registration={x.registration} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          text={
            tab === "upcoming"
              ? "You have no upcoming events."
              : tab === "waitlist"
                ? "You're not on any waitlist."
                : tab === "past"
                  ? "Events you attend will appear here."
                  : "No cancelled registrations."
          }
          cta={tab === "upcoming"}
        />
      )}
    </Container>
  );
}

function EventRow({ event, registration }: { event: EventDetail; registration?: MemberRegistration }) {
  const needsPayment = registration && ["UNPAID", "REJECTED"].includes(registration.payment_status) &&
    ["PENDING", "CONFIRMED"].includes(registration.registration_status);
  return (
    <Link
      href={`/member/events/${event.id}`}
      className="group flex items-center gap-3 rounded-xl border border-ink-border bg-ink-soft/30 p-4 transition-colors hover:border-primary/40 active:bg-ink-soft/60"
    >
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-ink-soft py-1.5 text-center">
        <span className="text-[10px] uppercase text-muted">{formatDate(event.start_at, { month: "short" })}</span>
        <span className="font-display text-lg font-bold leading-none">{formatDate(event.start_at, { day: "numeric" })}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
          {event.is_private ? <Lock className="h-3.5 w-3.5 shrink-0 text-muted" aria-label="Private" /> : null}
          <span className="truncate">{event.title}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" aria-hidden />
            {formatDate(event.start_at, { weekday: "short", hour: "numeric", minute: "2-digit" })}
          </span>
          {event.location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
          <span>{priceLabel(event)}</span>
        </p>
        {registration ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Badge variant={registration.registration_status === "CONFIRMED" ? "default" : "outline"}>
              {registrationStatusLabel[registration.registration_status]}
            </Badge>
            {registration.payment_status !== "NOT_REQUIRED" ? (
              <Badge variant={needsPayment ? "solid" : "neutral"}>{eventPaymentStatusLabel[registration.payment_status]}</Badge>
            ) : null}
            {registration.attendance_status !== "UNMARKED" ? (
              <Badge variant="neutral">{attendanceStatusLabel[registration.attendance_status]}</Badge>
            ) : null}
            {event.status === "CANCELLED" ? <Badge variant="outline">Event cancelled</Badge> : null}
          </div>
        ) : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function Empty({ text, cta = false }: { text: string; cta?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
      <CalendarPlus className="h-10 w-10 text-primary" aria-hidden />
      <p className="text-muted">{text}</p>
      {cta ? (
        <Link href="/member/events?tab=discover" className="text-sm font-medium text-primary hover:underline">
          Discover upcoming events
        </Link>
      ) : null}
    </div>
  );
}
