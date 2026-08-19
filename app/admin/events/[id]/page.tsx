import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { EventDetailDisplay } from "@/components/events/event-detail";
import { ParticipantList } from "@/components/events/event-participant-list";
import { getStaffEventById, getEventParticipants } from "@/lib/supabase/queries";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getStaffEventById(id);
  if (!event) return { title: "Event not found" };
  return { title: event.title };
}

export default async function AdminEventDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const event = await getStaffEventById(id);
  if (!event) notFound();

  const { items: participants, nextCursor } = await getEventParticipants(id, sp.cursor);

  return (
    <Container className="flex max-w-none flex-col gap-10 px-0">
      <EventDetailDisplay
        event={event}
        showParticipants={true}
      />

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold uppercase tracking-tight">
          Participants ({event.participant_count})
        </h2>
        <ParticipantList participants={participants} />
        {nextCursor ? (
          <p className="mt-3 text-center text-xs text-muted">
            <a
              href={`?cursor=${encodeURIComponent(nextCursor)}`}
              className="text-primary hover:underline"
            >
              Load more
            </a>
          </p>
        ) : null}
      </section>
    </Container>
  );
}
