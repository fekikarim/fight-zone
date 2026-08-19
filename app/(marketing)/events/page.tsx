import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { EventCard, type EventItem } from "@/components/marketing/event-card";
import { PageHero } from "@/components/marketing/page-hero";
import { EventFilters } from "@/components/events/event-filters";
import { getPublicEvents } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Events & Calendar",
  description:
    "Sparring nights, training workshops, seminars and competitions at Fight Zone. View upcoming events and mark your calendar.",
};

interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const events = await getPublicEvents({ type: params.type });

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Calendar of combat"
        description="Sparring nights, workshops, seminars and competitions hosted by Fight Zone — open to members and visitors alike."
        image="/components/fit-cartoon-women-training-4096x4096.jpg"
      />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="mb-8">
            <Suspense fallback={null}>
              <EventFilters />
            </Suspense>
          </div>

          {events.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event, i) => (
                <Reveal key={event.id} delay={(i % 3) * 80}>
                  <EventCard event={event as EventItem} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-14 text-center text-muted">
              {params.type
                ? `No upcoming ${params.type.toLowerCase()} events — try a different filter.`
                : "No public events scheduled yet — check back soon."}
            </p>
          )}
        </Container>
      </section>
    </>
  );
}
