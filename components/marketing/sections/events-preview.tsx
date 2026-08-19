import Link from "next/link";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard, type EventItem } from "@/components/marketing/event-card";
import { getPublicEvents, resolveOrFallback } from "@/lib/supabase/queries";

export async function EventsPreview() {
  const events = await resolveOrFallback(() => getPublicEvents({ limit: 3 }), []);

  return (
    <section className="py-20 lg:py-28">
      <Container>
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <SectionHeading
              eyebrow="Events"
              title="Upcoming at the gym"
              description="Sparring nights, workshops and competitions — mark your calendar."
            />
          </Reveal>
          <Reveal delay={100}>
            <Button variant="outline" asChild>
              <Link href="/events">
                All events
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>

        {events.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, i) => (
              <Reveal key={event.id} delay={i * 80}>
                <EventCard event={event as EventItem} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
            <CalendarPlus className="h-10 w-10 text-primary" />
            <p className="text-muted">No public events scheduled yet — check back soon.</p>
          </div>
        )}
      </Container>
    </section>
  );
}

export function EventsPreviewSkeleton() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <div className="mb-12">
          <div className="h-12 w-2/3 skeleton rounded" />
          <div className="mt-3 h-4 w-1/2 skeleton rounded" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-ink-border p-5">
              <Skeleton className="h-6 w-24" />
              <div className="mt-4 h-6 w-3/4" />
              <div className="mt-3 h-4 w-full" />
              <div className="mt-3 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
