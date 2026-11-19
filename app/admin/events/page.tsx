import type { Metadata } from "next";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { PreviewEntryBar } from "@/components/preview/preview-entry-bar";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { getAdminEvents } from "@/lib/supabase/queries";
import { eventTypeLabel, eventDisplayStateLabel, getEventDisplayState, type EventDisplayState } from "@/lib/types/events";
import { cn, requestTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Manage Events",
  description: "Create and manage events at Fight Zone.",
};

const stateVariant: Record<EventDisplayState, "default" | "outline" | "solid" | "neutral"> = {
  draft: "neutral",
  open: "default",
  full: "outline",
  registration_not_open: "neutral",
  registration_closed: "outline",
  in_progress: "solid",
  completed: "neutral",
  cancelled: "outline",
  archived: "neutral",
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
        title="Events"
        description={`${events.length} event${events.length !== 1 ? "s" : ""} · manage events and track registrations.`}
        actions={
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus className="mr-2 h-4 w-4" />
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
              className={cn("inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-xs font-medium",
                show === f.key ? "border-primary bg-primary text-white" : "border-ink-border text-muted hover:text-foreground")}>
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="sm:w-64" role="search">
          <input type="hidden" name="show" value={show} />
          <label htmlFor="event-search" className="sr-only">Search events</label>
          <input id="event-search" name="q" defaultValue={q} placeholder="Search by title…"
            className="h-10 w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 text-base sm:text-sm" />
        </form>
      </div>

      {visible.length > 0 ? (
        <div className="divide-y divide-ink-border rounded-xl border border-ink-border">
          {visible.map((event) => {
            const state = getEventDisplayState(event, now);
            return (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-ink-soft/40 active:bg-ink-soft/60 sm:gap-4"
              >
                <CalendarDays className="hidden h-5 w-5 shrink-0 text-primary sm:block" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted">
                    {eventTypeLabel[event.event_type]} ·{" "}
                    {formatDate(event.start_at, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    <span className="sm:hidden"> · {event.participant_count} taken</span>
                  </p>
                </div>
                <span className="hidden shrink-0 text-xs text-muted sm:inline">
                  {event.max_participants ? `${event.participant_count}/${event.max_participants}` : event.participant_count} places
                </span>
                <Badge variant={stateVariant[state]} className="shrink-0">
                  {eventDisplayStateLabel[state]}
                </Badge>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
          <CalendarDays className="h-10 w-10 text-primary" />
          <p className="text-muted">{show === "upcoming" ? "No upcoming published events. Create one or publish a draft." : "Nothing here."}</p>
          <Button asChild>
            <Link href="/admin/events/new">
              <Plus className="mr-2 h-4 w-4" />
              New event
            </Link>
          </Button>
        </div>
      )}
    </Container>
  );
}
