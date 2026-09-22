import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { EventCard, type EventItem } from "@/components/marketing/event-card";
import { getMemberRegisteredEvents } from "@/lib/supabase/queries";
import { participationStatusLabel, eventPaymentStatusLabel } from "@/lib/types/events";

export const metadata: Metadata = {
  title: "My Events",
  description: "Events you are registered for at Fight Zone.",
};

export default async function MemberEventsPage() {
  const registrations = await getMemberRegisteredEvents();

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          My events
        </h1>
        <p className="text-sm text-muted">
          Events you are registered for at Fight Zone. Private coaching events and
          local fees are handled on site.
        </p>
      </div>

      {registrations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {registrations.map((r) => {
            const event = r.events as EventItem & {
              is_public: boolean;
              max_participants: number | null;
              is_free: boolean;
            };
            const isPrivateCoaching = !event.is_public && event.max_participants === 1;
            const paymentStatus = event.is_free ? "NOT_REQUIRED" : "UNPAID";
            return (
              <div key={r.event_id} className="flex flex-col gap-2">
                <Link href={`/member/events/${r.event_id}`} className="block">
                  <EventCard event={event} />
                </Link>
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <Badge variant="outline">
                    {participationStatusLabel[r.status] ?? r.status}
                  </Badge>
                  {isPrivateCoaching ? (
                    <Badge variant="default">Private coaching</Badge>
                  ) : null}
                  <Badge variant="neutral">
                    {eventPaymentStatusLabel[paymentStatus] ?? paymentStatus}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
          <CalendarPlus className="h-10 w-10 text-primary" />
          <p className="text-muted">You have not registered for any events yet.</p>
          <Link href="/events" className="text-sm text-primary hover:underline">
            Browse upcoming events
          </Link>
        </div>
      )}
    </Container>
  );
}
