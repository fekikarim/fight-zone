"use client";

import { useActionState } from "react";
import { Loader2, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registerForEvent, cancelEventRegistration } from "@/lib/actions/events";
import type { EventActionState } from "@/lib/actions/events";

const INITIAL: EventActionState = { ok: false };

interface EventRegisterButtonProps {
  eventId: string;
  isRegistered: boolean;
  isFull: boolean;
  isPast: boolean;
}

export function EventRegisterButton({
  eventId,
  isRegistered,
  isFull,
  isPast,
}: EventRegisterButtonProps) {
  if (isPast) {
    return (
      <Button disabled variant="outline" size="lg">
        Event has ended
      </Button>
    );
  }

  if (isRegistered) {
    return <CancelForm eventId={eventId} />;
  }

  if (isFull) {
    return (
      <Button disabled variant="outline" size="lg">
        Fully booked
      </Button>
    );
  }

  return <RegisterForm eventId={eventId} />;
}

function RegisterForm({ eventId }: { eventId: string }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: EventActionState, formData: FormData) => registerForEvent(_prev, formData),
    INITIAL,
  );

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="eventId" value={eventId} />
      <Button type="submit" size="lg" disabled={isPending} className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {isPending ? "Registering…" : "Register for event"}
      </Button>
      {state.message ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function CancelForm({ eventId }: { eventId: string }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: EventActionState, formData: FormData) => cancelEventRegistration(_prev, formData),
    INITIAL,
  );

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="eventId" value={eventId} />
      <Button type="submit" variant="outline" size="lg" disabled={isPending} className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
        {isPending ? "Cancelling…" : "Cancel registration"}
      </Button>
      {state.message ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
