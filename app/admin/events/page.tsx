import type { Metadata } from "next";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { PreviewEntryBar } from "@/components/preview/preview-entry-bar";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppTabs } from "@/components/ui/app-tabs";
import { EventTile } from "@/components/events/event-tile";
import { EmptyState } from "@/components/empty-state";
import { FIELD_BASE } from "@/components/ui/field-styles";
import { getAdminEvents } from "@/lib/supabase/queries";
import { getEventDisplayState } from "@/lib/types/events";
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
        <AppTabs
          label="Filter events"
          tabs={FILTERS.map((f) => ({ href: `/admin/events?show=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`, label: f.label, active: show === f.key }))}
        />
        <form className="sm:w-64" role="search">
          <input type="hidden" name="show" value={show} />
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <input id="event-search" name="q" type="search" defaultValue={q} placeholder="Search by title"
            className={cn(FIELD_BASE, "h-12 rounded-full border-white/[0.08] px-5")} />
        </form>
      </div>

      {visible.length > 0 ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((event) => {
            const state = getEventDisplayState(event, now);
            const pct = event.max_participants
              ? Math.min(100, Math.round((event.participant_count / event.max_participants) * 100))
              : null;
            return (
              <li key={event.id}>
                <EventTile
                  event={event}
                  href={`/admin/events/${event.id}`}
                  badges={<StatusBadge kind="display" status={state} />}
                  footer={
                    pct != null ? (
                      <span className="mt-1 flex items-center gap-3">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
                          <span className={cn("block h-full rounded-full", pct >= 100 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
                        </span>
                        <span className="shrink-0 text-xs text-muted tabular">{event.participant_count}/{event.max_participants} places</span>
                      </span>
                    ) : (
                      <span className="mt-1 text-xs text-muted">{event.participant_count} registered · no limit</span>
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
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
