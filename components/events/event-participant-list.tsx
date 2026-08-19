"use client";

import { useActionState } from "react";
import { Check, X, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { updateParticipantStatus } from "@/lib/actions/events";
import { participationStatusLabel } from "@/lib/types/events";
import type { EventParticipant } from "@/lib/types/events";
import type { EventActionState } from "@/lib/actions/events";

const statusVariant: Record<string, "default" | "outline" | "neutral" | "solid"> = {
  JOINED: "default",
  INTERESTED: "neutral",
  CANCELLED: "outline",
  ATTENDED: "solid",
  NO_SHOW: "outline",
};

interface ParticipantListProps {
  participants: EventParticipant[];
}

export function ParticipantList({ participants }: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-5 py-10 text-center text-sm text-muted">
        No participants registered yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-ink-border rounded-xl border border-ink-border">
      {participants.map((p) => (
        <ParticipantRow key={p.id} participant={p} />
      ))}
    </div>
  );
}

function ParticipantRow({ participant }: { participant: EventParticipant }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: EventActionState, formData: FormData) => updateParticipantStatus(_prev, formData),
    { ok: false } as EventActionState,
  );

  const isTerminal = ["CANCELLED", "ATTENDED", "NO_SHOW"].includes(participant.status);

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

      {!isTerminal ? (
        <div className="flex gap-1">
          <form action={formAction}>
            <input type="hidden" name="participantId" value={participant.id} />
            <input type="hidden" name="status" value="ATTENDED" />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={isPending}
              title="Mark attended"
              className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
            >
              <Check className="h-4 w-4" />
            </Button>
          </form>
          <form action={formAction}>
            <input type="hidden" name="participantId" value={participant.id} />
            <input type="hidden" name="status" value="NO_SHOW" />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={isPending}
              title="Mark no-show"
              className="h-8 w-8 text-amber-600 hover:text-amber-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
          <form action={formAction}>
            <input type="hidden" name="participantId" value={participant.id} />
            <input type="hidden" name="status" value="CANCELLED" />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={isPending}
              title="Cancel registration"
              className="h-8 w-8 text-destructive hover:text-destructive/80"
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : null}

      {state.message && !state.ok ? (
        <p className="w-full text-xs text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
