import Link from "next/link";
import { ArrowRight, CalendarX } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState } from "@/components/empty-state";
import { EventCard, EventCardSkeleton } from "@/components/marketing/event-card";
import { getPublicEvents, resolveOrFallback } from "@/lib/supabase/queries";

export async function EventsPreview() {
  const events = await resolveOrFallback(() => getPublicEvents({ limit: 3 }), []);

  return (
    <section aria-labelledby="events-h" className="border-t border-ink-border py-20 lg:py-28">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <SectionHeading
              id="events-h"
              index="02"
              eyebrow="Upcoming"
              title="On the calendar"
              description="Places are limited and held as soon as you register."
            />
          </Reveal>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/events">
              All events
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="mt-12">
          {events.length > 0 ? (
            <Reveal variant="stagger" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {events.length < 3 ? (
                <div className="flex flex-col justify-between gap-6 rounded-lg border border-dashed border-ink-strong p-6 md:col-span-1 lg:col-span-1">
                  <div>
                    <p className="type-overline text-[11px] text-muted">More dates soon</p>
                    <p className="mt-3 font-display text-2xl font-semibold uppercase leading-tight">
                      Be first to hear about the next event
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      Members get a notification the moment a new date is published.
                    </p>
                  </div>
                  <Button asChild variant="secondary" className="w-full sm:w-fit">
                    <Link href="/sign-up">
                      Create an account
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </Reveal>
          ) : (
            <EmptyState
              icon={<CalendarX />}
              title="No events scheduled yet"
              description="New dates are announced here first. Create an account and you'll be notified when the next one opens."
              actionLabel="Create an account"
              actionHref="/sign-up"
            />
          )}
        </div>
      </Container>
    </section>
  );
}

export function EventsPreviewSkeleton() {
  return (
    <section className="border-t border-ink-border py-20 lg:py-28">
      <Container>
        <div className="skeleton h-14 w-2/3 rounded-sm" />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {[1, 2, 3].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
