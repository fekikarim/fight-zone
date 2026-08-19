import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { EventDetailDisplay } from "@/components/events/event-detail";
import { EventRegisterButton } from "@/components/events/event-register-button";
import { getPublicEventById, getMemberEventRegistration } from "@/lib/supabase/queries";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getPublicEventById(id);
  if (!event) return { title: "Event not found" };
  return { title: event.title };
}

export default async function MemberEventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getPublicEventById(id);
  if (!event) notFound();

  const registration = await getMemberEventRegistration(id);
  const isRegistered = registration !== null;
  const isFull =
    event.max_participants != null &&
    event.participant_count >= event.max_participants;
  const isPast = new Date(event.end_at ?? event.start_at) < new Date();

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <EventDetailDisplay
        event={event}
        action={
          <EventRegisterButton
            eventId={id}
            isRegistered={isRegistered}
            isFull={isFull}
            isPast={isPast}
          />
        }
      />
    </Container>
  );
}
