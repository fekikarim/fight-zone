import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { CalendarX } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState } from "@/components/empty-state";
import { EventCard } from "@/components/marketing/event-card";
import { PageHero } from "@/components/marketing/page-hero";
import { EventFilters } from "@/components/events/event-filters";
import { PreviewModeBanner } from "@/components/preview/preview-mode-banner";
import { getPublicEventCategories, getPublicEvents } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Events & Calendar",
  description:
    "Sparring nights, training workshops, seminars and competitions at Fight Zone. View upcoming events and mark your calendar.",
};

interface Props {
  searchParams: Promise<{ type?: string; category?: string; q?: string; when?: string; open?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const str = (v?: string) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined);
  const values = {
    type: ["TRAINING", "WORKSHOP", "COMPETITION", "SEMINAR", "OTHER"].includes(params.type ?? "") ? params.type : undefined,
    category: str(params.category),
    q: str(params.q),
    when: params.when === "past" ? ("past" as const) : ("upcoming" as const),
    open: params.open === "1",
  };
  const [events, categories] = await Promise.all([
    getPublicEvents({ type: values.type, category: values.category, q: values.q, when: values.when, availability: values.open ? "open" : undefined }),
    getPublicEventCategories(),
  ]);
  const filtered = Boolean(values.type || values.category || values.q || values.open);

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Training, sparring & competitions"
        description="Every Fight Zone event in one calendar. Register in a few clicks — your place is held as soon as you do."
      />
      <PreviewModeBanner />

      <section className="py-12 lg:py-16">
        <Container>
          <EventFilters values={values} categories={categories} />

          <p className="mt-6 text-sm text-muted" aria-live="polite">
            {events.length} {values.when === "past" ? "past" : "upcoming"} {events.length === 1 ? "event" : "events"}
            {filtered ? " match your filters" : ""}
          </p>

          {events.length > 0 ? (
            <Reveal variant="stagger" className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {events.map((event, i) => (
                <EventCard key={event.id} event={event} priority={i < 3} />
              ))}
            </Reveal>
          ) : (
            <EmptyState
              className="mt-6"
              icon={<CalendarX />}
              title={filtered ? "No events match" : values.when === "past" ? "No past events yet" : "No events scheduled yet"}
              description={
                filtered
                  ? "Try another type, clear the search or include full events."
                  : values.when === "past"
                    ? "Events appear here once they have taken place."
                    : "New dates are published here first. Members get a notification the moment one opens."
              }
              actionLabel={filtered ? "Clear filters" : values.when === "past" ? "See upcoming events" : "Create an account"}
              actionHref={filtered ? (values.when === "past" ? "/events?when=past" : "/events") : values.when === "past" ? "/events" : "/sign-up"}
            />
          )}
        </Container>
      </section>
    </>
  );
}
