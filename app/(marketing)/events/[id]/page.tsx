import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/marketing/page-hero";
import { EventDetailDisplay } from "@/components/events/event-detail";
import { getPublicEventById } from "@/lib/supabase/queries";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

/** Postgres rejects non-UUID ids with 22P02; treat malformed ids as missing. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Event not found" };
  const event = await getPublicEventById(id);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.description?.slice(0, 160) ?? `Event at Fight Zone — ${event.title}`,
  };
}

export default async function PublicEventDetailPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
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
              <Link href="/sign-in" className="text-primary underline hover:text-primary-hover">
                Log in
              </Link>{" "}
              to register.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
