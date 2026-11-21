import type { Metadata } from "next";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { PreviewEntryBar } from "@/components/preview/preview-entry-bar";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FIELD_BASE } from "@/components/ui/field-styles";
import { formatDate } from "@/lib/utils";
import { getAdminEvents } from "@/lib/supabase/queries";
import { eventTypeLabel, getEventDisplayState } from "@/lib/types/events";
import { cn, requestTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Manage Events",
  description: "Create and manage events at Fight Zone.",
};

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "drafts", label: "Drafts" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
  { key: "archived", label: "Archived" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

interface Props {
  searchParams: Promise<{ show?: string; q?: string }>;
}

export default async function AdminEventsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const show: FilterKey = FILTERS.some((f) => f.key === sp.show) ? (sp.show as FilterKey) : "upcoming";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined;
  const events = await getAdminEvents({
    q,
    ...(show === "upcoming" ? { when: "upcoming" as const } : {}),
    ...(show === "past" ? { when: "past" as const, status: "PUBLISHED" as const } : {}),
    ...(show === "drafts" ? { status: "DRAFT" as const } : {}),
    ...(show === "cancelled" ? { status: "CANCELLED" as const } : {}),
    ...(show === "archived" ? { status: "ARCHIVED" as const } : {}),
  });
  const visible = show === "upcoming" ? events.filter((e) => e.status === "PUBLISHED") : events;
  const now = requestTime();

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <PreviewEntryBar returnTo="/events" subject="events" />
      <PageHeader
        eyebrow="Operate"
        title="Events"
        description={`${events.length} event${events.length !== 1 ? "s" : ""} · manage events and track registrations.`}
        actions={
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus className="h-4 w-4" aria-hidden />
              New event
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter events" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/admin/events?show=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={show === f.key ? "page" : undefined}
              className={cn("inline-flex h-9 shrink-0 items-center rounded-md border px-3.5 text-[13px] font-semibold transition-colors",
                show === f.key ? "border-foreground bg-foreground text-ink" : "border-ink-border text-muted hover:text-foreground")}>
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="sm:w-64" role="search">
          <input type="hidden" name="show" value={show} />
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <input id="event-search" name="q" type="search" defaultValue={q} placeholder="Search by title"
            className={cn(FIELD_BASE, "h-10 border-ink-border")} />
        </form>
      </div>

      {visible.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-ink-border bg-ink-soft">
          <div
            role="row"
            className="hidden grid-cols-[4.5rem_minmax(0,1fr)_8rem_9rem_9rem] gap-4 border-b border-ink-border bg-ink-softer px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:grid"
          >
            <span>Date</span>
            <span>Event</span>
            <span>Type</span>
            <span>Places</span>
            <span>Status</span>
          </div>
          <ul className="divide-y divide-ink-border">
            {visible.map((event) => {
              const state = getEventDisplayState(event, now);
              const pct = event.max_participants
                ? Math.min(100, Math.round((event.participant_count / event.max_participants) * 100))
                : null;
              return (
                <li key={event.id}>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="group grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-white/[0.03] md:grid-cols-[4.5rem_minmax(0,1fr)_8rem_9rem_9rem]"
                  >
                    <span className="text-center md:text-left">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                        {formatDate(event.start_at, { month: "short" })}
                      </span>
                      <span className="block font-display text-2xl font-bold leading-none">{formatDate(event.start_at, { day: "numeric" })}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold transition-colors group-hover:text-foreground">{event.title}</span>
                      <span className="block text-xs text-muted">
                        {formatDate(event.start_at, { weekday: "short", hour: "numeric", minute: "2-digit" })}
                        <span className="md:hidden"> · {eventTypeLabel[event.event_type]}</span>
                      </span>
                    </span>
                    <span className="hidden text-sm text-muted md:block">{eventTypeLabel[event.event_type]}</span>
                    <span className="col-start-2 flex items-center gap-3 md:col-start-auto md:block">
                      <span className="block text-xs text-muted tabular">
                        {event.max_participants ? `${event.participant_count} / ${event.max_participants}` : `${event.participant_count} · no limit`}
                      </span>
                      {pct != null ? (
                        <span className="block h-1 w-20 overflow-hidden rounded-full bg-ink-softer md:mt-1.5 md:w-28" aria-hidden>
                          <span className={cn("block h-full", pct >= 100 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
                        </span>
                      ) : null}
                      <span className="md:hidden"><StatusBadge kind="display" status={state} /></span>
                    </span>
                    <span className="hidden md:block"><StatusBadge kind="display" status={state} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays />}
          title={q ? "No events match" : show === "upcoming" ? "No upcoming published events" : `No ${show} events`}
          description={q ? "Try another title." : show === "upcoming" ? "Create an event or publish one of your drafts." : "Events will appear here when they move to this state."}
          actionLabel={show === "upcoming" ? "Create an event" : undefined}
          actionHref={show === "upcoming" ? "/admin/events/new" : undefined}
        />
      )}
    </Container>
  );
}
