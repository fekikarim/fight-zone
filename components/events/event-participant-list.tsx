"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { updateParticipantPayment, updateParticipantStatus } from "@/lib/actions/events";
import { eventPaymentStatusLabel, participationStatusLabel } from "@/lib/types/events";
import type { EventParticipant, EventPaymentStatus, ParticipationStatus } from "@/lib/types/events";
import type { EventActionState } from "@/lib/actions/events";
import { EventParticipantsRealtime } from "@/components/events/event-participants-realtime";

const statusVariant: Record<string, "default" | "outline" | "neutral" | "solid"> = {
  JOINED: "default",
  INTERESTED: "neutral",
  CANCELLED: "outline",
  ATTENDED: "solid",
  NO_SHOW: "outline",
};

const paymentVariant: Record<EventPaymentStatus, "default" | "outline" | "neutral" | "solid"> = {
  UNPAID: "outline",
  PAID: "solid",
  NOT_REQUIRED: "neutral",
};

interface ParticipantListProps {
  participants: EventParticipant[];
  /** Restricts payment options: free events expose NOT_REQUIRED only. */
  isFreeEvent?: boolean;
  /** Event id for live sync of this list. */
  eventId?: string;
}

export function ParticipantList({ participants, isFreeEvent = false, eventId }: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-5 py-10 text-center text-sm text-muted">
        No participants registered yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-ink-border rounded-xl border border-ink-border">
      {eventId ? <EventParticipantsRealtime eventId={eventId} /> : null}
      {participants.map((p) => (
        <ParticipantRow key={p.id} participant={p} isFreeEvent={isFreeEvent} />
      ))}
    </div>
  );
}

/** Valid next statuses for staff, mirroring the DB transition trigger. */
const NEXT_STATUSES: Record<ParticipationStatus, ParticipationStatus[]> = {
  INTERESTED: ["JOINED", "CANCELLED"],
  JOINED: ["ATTENDED", "NO_SHOW", "CANCELLED"],
  CANCELLED: ["JOINED"],
  ATTENDED: [],
  NO_SHOW: [],
};

function ParticipantRow({
  participant,
  isFreeEvent,
}: {
  participant: EventParticipant;
  isFreeEvent: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: EventActionState, formData: FormData) => {
      const result = await updateParticipantPayment(_prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    { ok: false } as EventActionState,
  );

  const paymentOptions: EventPaymentStatus[] = isFreeEvent ? ["NOT_REQUIRED"] : ["UNPAID", "PAID"];
  const nextStatuses = NEXT_STATUSES[participant.status] ?? [];

  const [statusState, statusAction, isStatusPending] = useActionState(
    async (_prev: EventActionState, formData: FormData) => {
      const result = await updateParticipantStatus(_prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    { ok: false } as EventActionState,
  );

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {participant.member_name ?? "Member"}
        </p>
        <p className="text-xs text-muted">
          Registered {formatDate(participant.joined_at, { month: "short", day: "numeric" })}
        </p>
      </div>

      <Badge variant={statusVariant[participant.status] ?? "neutral"}>
        {participationStatusLabel[participant.status] ?? participant.status}
      </Badge>

      <Badge variant={paymentVariant[participant.payment_status] ?? "neutral"}>
        {eventPaymentStatusLabel[participant.payment_status] ?? participant.payment_status}
      </Badge>

      <Badge variant={participant.attended ? "solid" : "outline"}>
        {participant.attended ? "Attended" : "Not attended"}
      </Badge>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="participantId" value={participant.id} />
        <select
          name="payment_status"
          defaultValue={participant.payment_status}
          disabled={isPending || isFreeEvent}
          className="rounded-lg border border-ink-border bg-ink-soft/40 px-2 py-1.5 text-xs"
          aria-label="Payment status"
        >
          {paymentOptions.map((s) => (
            <option key={s} value={s}>
              {eventPaymentStatusLabel[s]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            name="attended"
            value="true"
            defaultChecked={participant.attended}
            disabled={isPending}
            className="h-4 w-4 rounded border-ink-border"
          />
          Attended
        </label>
        <Button type="submit" variant="secondary" size="sm" disabled={isPending} className="gap-1">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>
      </form>

      {nextStatuses.length > 0 ? (
        <form action={statusAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="participantId" value={participant.id} />
          <select
            name="status"
            defaultValue=""
            required
            disabled={isStatusPending}
            className="rounded-lg border border-ink-border bg-ink-soft/40 px-2 py-1.5 text-xs"
            aria-label="Change status"
          >
            <option value="" disabled>
              Set status…
            </option>
            {nextStatuses.map((s) => (
              <option key={s} value={s}>
                {participationStatusLabel[s] ?? s}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm" disabled={isStatusPending} className="gap-1">
            {isStatusPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Apply
          </Button>
        </form>
      ) : null}

      {statusState.message && !statusState.ok ? (
        <p className="w-full text-xs text-destructive" role="alert">
          {statusState.message}
        </p>
      ) : null}

      {state.message && !state.ok ? (
        <p className="w-full text-xs text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}