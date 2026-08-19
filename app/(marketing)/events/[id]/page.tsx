import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/marketing/page-hero";
import { EventDetailDisplay } from "@/components/events/event-detail";
import { getPublicEventById } from "@/lib/supabase/queries";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getPublicEventById(id);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.description?.slice(0, 160) ?? `Event at Fight Zone — ${event.title}`,
  };
}

export default async function PublicEventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getPublicEventById(id);
  if (!event) notFound();

  return (
    <>
      <PageHero
        eyebrow="Event"
        title={event.title}
        description={event.description?.slice(0, 120) ?? ""}
        image="/components/fit-cartoon-women-training-4096x4096.jpg"
      />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            <EventDetailDisplay
              event={event}
              showParticipants={false}
            />
            <p className="mt-8 text-sm text-muted">
              Interested in this event?{" "}
              <a href="/auth/login" className="text-primary hover:underline">
                Log in
              </a>{" "}
              to register.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
