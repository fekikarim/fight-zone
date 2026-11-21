import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppTabs } from "@/components/ui/app-tabs";
import { EventTile } from "@/components/events/event-tile";
import { PageHeader } from "@/components/dashboard/page-header";
import { getMemberRegisteredEvents, getPublicEvents } from "@/lib/supabase/queries";
import {
  type EventDetail,
  type MemberRegistration,
} from "@/lib/types/events";
import { requestTime } from "@/lib/utils";

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
      <PageHeader eyebrow="Member area" title="Events" description="Your registrations, payments and what's coming up." />

      <AppTabs
        label="Event lists"
        tabs={TABS.map((t) => ({ href: `/member/events?tab=${t.key}`, label: t.label, active: tab === t.key, count: counts[t.key] }))}
      />

      {tab === "discover" ? (
        discover.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
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
        <ul className="grid gap-3 lg:grid-cols-2">
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
  return (
    <EventTile
      event={event}
      href={`/member/events/${event.id}`}
      badges={
        registration ? (
          <>
            <StatusBadge kind="registration" status={registration.registration_status} />
            {registration.payment_status !== "NOT_REQUIRED" ? <StatusBadge kind="payment" status={registration.payment_status} /> : null}
            {registration.attendance_status !== "UNMARKED" ? <StatusBadge kind="attendance" status={registration.attendance_status} /> : null}
            {event.status === "CANCELLED" ? <Badge variant="danger" dot>Event cancelled</Badge> : null}
          </>
        ) : event.spots_left === 0 ? (
          <Badge variant="warning" dot>{event.waitlist_enabled ? "Full · waitlist" : "Full"}</Badge>
        ) : event.spots_left != null ? (
          <Badge variant="success" dot>{event.spots_left} left</Badge>
        ) : null
      }
    />
  );
}

function Empty({ text, cta = false }: { text: string; cta?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/15 px-6 py-14 text-center">
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
