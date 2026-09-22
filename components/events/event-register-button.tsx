"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Loader2,
  UserPlus,
  UserMinus,
  CheckCircle2,
  XCircle,
  Info,
  CalendarCheck,
} from "lucide-react";
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
      <div className="flex flex-col items-center gap-2">
        <Button disabled variant="outline" size="lg">
          Event has ended
        </Button>
        <p className="text-sm text-muted">Registration for this event is closed.</p>
      </div>
    );
  }

  if (isRegistered) {
    return <RegisteredControl eventId={eventId} />;
  }

  if (isFull) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Button disabled variant="outline" size="lg" className="gap-2">
          <XCircle className="h-4 w-4" />
          Fully booked
        </Button>
        <p className="max-w-sm text-center text-sm text-muted">
          This event just filled up — the last spot was taken moments ago.
          Check out our other upcoming events and keep training!
        </p>
      </div>
    );
  }

  return <RegisterControl eventId={eventId} />;
}

function RegisterControl({ eventId }: { eventId: string }) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: EventActionState, formData: FormData) => {
      const next = await registerForEvent(prev, formData);
      if (next.ok && next.code === "ok") setShowSuccess(true);
      return next;
    },
    INITIAL,
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <form action={formAction} className="inline-flex">
        <input type="hidden" name="eventId" value={eventId} />
        <Button type="submit" size="lg" disabled={isPending} className="gap-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {isPending ? "Checking your spot…" : "Register for event"}
        </Button>
      </form>

      {showSuccess ? (
        <SuccessDialog onClose={() => setShowSuccess(false)} />
      ) : null}

      {/* Outcome messages driven by the machine-readable result code. */}
      <div aria-live="polite" className="flex flex-col items-center gap-1">
        {state.code === "full" && (
          <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
            <XCircle className="h-4 w-4" />
            {state.message}
          </p>
        )}
        {state.code === "already" && (
          <p className="flex items-center gap-1.5 text-sm text-muted" role="status">
            <Info className="h-4 w-4" />
            {state.message}
          </p>
        )}
        {(state.code === "closed" ||
          state.code === "not_available" ||
          state.code === "error") && (
          <p className="text-sm text-muted" role="alert">
            {state.message}
          </p>
        )}
      </div>
    </div>
  );
}

function RegisteredControl({ eventId }: { eventId: string }) {
  const [state, formAction, isPending] = useActionState(cancelEventRegistration, INITIAL);
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-primary-soft px-4 py-2 text-sm font-medium text-primary">
        <CalendarCheck className="h-4 w-4" />
        You&apos;re registered
      </div>

      {!confirming ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setConfirming(true)}
          className="gap-2"
        >
          <UserMinus className="h-4 w-4" />
          Cancel registration
        </Button>
      ) : (
        <div
          className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-ink-border bg-ink-soft/40 p-4"
          role="alertdialog"
          aria-label="Confirm cancellation"
          aria-modal="true"
        >
          <p className="text-sm text-muted">
            Are you sure? Your spot will be released to other members.
          </p>
          <form action={formAction} className="inline-flex">
            <input type="hidden" name="eventId" value={eventId} />
            <Button
              ref={confirmRef}
              type="submit"
              variant="outline"
              size="sm"
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserMinus className="h-3.5 w-3.5" />
              )}
              Yes, cancel
            </Button>
          </form>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Keep my spot
          </Button>
        </div>
      )}

      {state.code === "error" && (
        <p className="text-sm text-destructive" role="alert" aria-live="polite">
          {state.message}
        </p>
      )}
    </div>
  );
}

function SuccessDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Registration confirmed"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-ink-border bg-background p-7 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold uppercase tracking-tight">
          You&apos;re in!
        </h2>
        <p className="mt-2 text-sm text-muted">Your spot is confirmed.</p>
        <p className="mt-1 text-xs text-muted">Find it anytime under your schedule.</p>
        <Button ref={closeRef} onClick={onClose} className="mt-6 w-full">
          Done
        </Button>
      </div>
    </div>
  );
}
