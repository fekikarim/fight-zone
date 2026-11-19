import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventDetailDisplay } from "@/components/events/event-detail";
import { EventEditForm } from "@/components/events/event-edit-form";
import { RegistrationsManager } from "@/components/events/registrations-manager";
import { EventLifecycleControls, EventInvitationsPanel } from "@/components/events/event-admin-controls";
import { EventParticipantsRealtime } from "@/components/events/event-participants-realtime";
import { getStaffEventById, getEventParticipants, getEventInvitations } from "@/lib/supabase/queries";
import { getMembers } from "@/lib/members/queries";
import { eventStatusLabel } from "@/lib/types/events";
import { requireRole } from "@/lib/auth/guards";
import { requestTime } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getStaffEventById(id);
  return { title: event ? event.title : "Event not found" };
}

export default async function AdminEventDetailPage({ params }: Props) {
  await requireRole(["ADMIN", "COACH"]);
  const { id } = await params;
  const event = await getStaffEventById(id);
  if (!event) notFound();

  const [participants, invitations, members] = await Promise.all([
    getEventParticipants(id),
    event.is_private ? getEventInvitations(id) : Promise.resolve([]),
    event.is_private ? getMembers({ limit: 200 }) : Promise.resolve({ items: [], total: 0 }),
  ]);
  const started = new Date(event.start_at).getTime() <= requestTime() + 60 * 60 * 1000;
  const pendingReview = participants.filter((p) => p.registration_status === "PENDING").length;
  const proofs = participants.filter((p) => p.open_submission_id).length;
  const paidCount = participants.filter((p) => p.payment_status === "PAID").length;
  const attended = participants.filter((p) => p.attendance_status === "ATTENDED").length;

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <PageHeader
        title={eventStatusLabel[event.status]}
        description="Manage this event's details, registrations, payments and attendance."
        back={{ href: "/admin/events", label: "Back to events" }}
        actions={<EventLifecycleControls eventId={event.id} status={event.status} seatsTaken={event.participant_count} />}
      />
      <EventParticipantsRealtime eventId={id} />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Places taken", value: event.max_participants ? `${event.participant_count}/${event.max_participants}` : String(event.participant_count) },
          { label: "To review", value: String(pendingReview + proofs) },
          { label: "Paid", value: event.is_free ? "Free" : String(paidCount) },
          { label: "Attended", value: String(attended) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-ink-border bg-ink-soft/40 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-muted">{s.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <EventDetailDisplay event={event} showParticipants />

      <section className="space-y-4" aria-labelledby="reg-title">
        <h2 id="reg-title" className="font-display text-xl font-semibold uppercase tracking-tight">
          Registrations
        </h2>
        <RegistrationsManager participants={participants} eventStarted={started} eventId={event.id} />
      </section>

      {event.is_private ? (
        <section className="space-y-4" aria-labelledby="inv-title">
          <h2 id="inv-title" className="font-display text-xl font-semibold uppercase tracking-tight">Invitations</h2>
          <EventInvitationsPanel eventId={event.id} invited={invitations} members={members.items} />
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby="edit-title">
        <h2 id="edit-title" className="font-display text-xl font-semibold uppercase tracking-tight">Edit details</h2>
        <div className="rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-6">
          <EventEditForm event={event} />
        </div>
      </section>
    </Container>
  );
}
