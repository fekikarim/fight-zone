import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventDetailDisplay } from "@/components/events/event-detail";
import { MemberRegistrationPanel } from "@/components/events/member-registration-panel";
import { EventParticipantsRealtime } from "@/components/events/event-participants-realtime";
import { requireUser } from "@/lib/auth/guards";
import { getMemberEventViewById, getMemberEventRegistration } from "@/lib/supabase/queries";
import { getPaymentSettings } from "@/lib/settings/queries";
import { requestTime } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getMemberEventViewById(id);
  return { title: event ? event.title : "Event not found" };
}

export default async function MemberEventDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const event = await getMemberEventViewById(id);
  if (!event) notFound();

  const [registration, paymentSettings] = await Promise.all([getMemberEventRegistration(id), getPaymentSettings()]);

  return (
    <Container className="flex max-w-none flex-col gap-6 px-0">
      <PageHeader eyebrow="Event" title={event.title} back={{ href: "/member/events", label: "Back to events" }} />
      <EventDetailDisplay
        event={event}
        showTitle={false}
        action={
          <MemberRegistrationPanel
            event={event}
            registration={registration}
            userId={user.id}
            bankInstructions={paymentSettings.bank_instructions}
            inPersonInstructions={paymentSettings.in_person_instructions}
            now={requestTime()}
          />
        }
      />
      <EventParticipantsRealtime eventId={id} />
    </Container>
  );
}
