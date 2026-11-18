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
import { eventTypeLabel, getEventLifecycleStatus } from "@/lib/types/events";

export const metadata: Metadata = {
  title: "Manage Events",
  description: "Create and manage events at Fight Zone.",
};

const lifecycleVariant: Record<string, "default" | "outline" | "solid" | "neutral"> = {
  draft: "neutral",
  upcoming: "default",
  ongoing: "solid",
  past: "outline",
};

export default async function AdminEventsPage() {
  const events = await getAdminEvents();

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

      {events.length > 0 ? (
        <div className="divide-y divide-ink-border rounded-xl border border-ink-border">
          {events.map((event) => {
            const lifecycle = getEventLifecycleStatus(
              event.is_public,
              event.start_at,
              event.end_at,
            );
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
                    <span className="sm:hidden"> · {event.participant_count} registered</span>
                  </p>
                </div>
                <span className="hidden shrink-0 text-xs text-muted sm:inline">
                  {event.participant_count} registered
                </span>
                <Badge variant={lifecycleVariant[lifecycle]} className="shrink-0">
                  {lifecycle}
                </Badge>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
          <CalendarDays className="h-10 w-10 text-primary" />
          <p className="text-muted">No events yet — create your first event to get started.</p>
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
