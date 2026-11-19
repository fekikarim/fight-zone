import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
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
        title="Calendar of combat"
        description="Sparring nights, workshops, seminars and competitions hosted by Fight Zone — open to members and visitors alike."
        image="/components/fit-cartoon-women-training-4096x4096.jpg"
      />
      <PreviewModeBanner />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="mb-8">
            <EventFilters values={values} categories={categories} />
          </div>

          {events.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event, i) => (
                <Reveal key={event.id} delay={(i % 3) * 80}>
                  <EventCard event={event} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-14 text-center text-muted">
              {filtered
                ? "No events match these filters — try another search."
                : values.when === "past" ? "No past events yet." : "No public events scheduled yet — check back soon."}
            </p>
          )}
        </Container>
      </section>
    </>
  );
}
