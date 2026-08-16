"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
import { cancelBooking, type MemberActionState } from "@/lib/actions/member";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface CancelBookingButtonProps {
  bookingId: string;
  /** Pre-computed server-side: cancellable only when PENDING/CONFIRMED + future. */
  cancellable: boolean;
}

export function CancelBookingButton({
  bookingId,
  cancellable,
}: CancelBookingButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, isPending] = useActionState(cancelBooking, {
    ok: false,
  } satisfies MemberActionState);

  if (!cancellable) return null;

  return (
    <div className="flex flex-col gap-3">
      {state.message ? (
        <p
          role="alert"
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            state.ok
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-primary/30 bg-primary-soft text-primary"
          }`}
        >
          {state.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{state.message}</span>
        </p>
      ) : null}

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <form action={formAction} className="contents">
            <input type="hidden" name="bookingId" value={bookingId} />
            <Button
              type="submit"
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Spinner size="sm" />
                  Cancelling…
                </>
              ) : (
                "Yes, cancel booking"
              )}
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            Keep booking
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="border-primary/50 text-primary hover:bg-primary/10"
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Cancel booking
        </Button>
      )}
    </div>
  );
}
