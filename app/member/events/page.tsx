import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EventCard, type EventItem } from "@/components/marketing/event-card";
import { getMemberRegisteredEvents } from "@/lib/supabase/queries";

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
          Events you are registered for at Fight Zone.
        </p>
      </div>

      {registrations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {registrations.map((r) => (
            <Link key={r.event_id} href={`/member/events/${r.event_id}`} className="block">
              <EventCard event={r.events as EventItem} />
            </Link>
          ))}
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
