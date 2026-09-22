import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { EventDetailDisplay } from "@/components/events/event-detail";
import { EventRegisterButton } from "@/components/events/event-register-button";
import {
  getMemberEventViewById,
  getMemberEventRegistration,
} from "@/lib/supabase/queries";
import { participationStatusLabel } from "@/lib/types/events";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getMemberEventViewById(id);
  if (!event) return { title: "Event not found" };
  return { title: event.title };
}

export default async function MemberEventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getMemberEventViewById(id);
  if (!event) notFound();

  const registration = await getMemberEventRegistration(id);
  const isRegistered = registration !== null;
  const isFull = event.spots_left !== null && event.spots_left === 0;
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
      {!event.is_free ? (
        <div className="flex flex-col gap-1 rounded-xl border border-ink-border bg-ink-soft/40 px-5 py-4">
          <p className="text-sm text-muted">
            Fee paid locally — staff track payment on site.
          </p>
          {registration ? (
            <p className="text-xs text-muted">
              Status: {participationStatusLabel[registration.status] ?? registration.status}
            </p>
          ) : null}
        </div>
      ) : null}
    </Container>
  );
}
