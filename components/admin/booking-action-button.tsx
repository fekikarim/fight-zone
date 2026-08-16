"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { updateBookingStatus, type AdminBookingActionState } from "@/lib/actions/admin-bookings";
import type { BookingAction } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const actionMeta: Record<
  BookingAction,
  { label: string; confirmLabel: string; variant: "primary" | "secondary" | "outline"; className: string }
> = {
  confirm: {
    label: "Confirm",
    confirmLabel: "Confirm this booking?",
    variant: "primary",
    className: "",
  },
  cancel: {
    label: "Cancel booking",
    confirmLabel: "Cancel this booking?",
    variant: "outline",
    className: "border-primary/50 text-primary hover:bg-primary/10",
  },
  complete: {
    label: "Mark completed",
    confirmLabel: "Mark this session as completed?",
    variant: "secondary",
    className: "",
  },
  no_show: {
    label: "Mark no-show",
    confirmLabel: "Mark this booking as NO_SHOW?",
    variant: "outline",
    className: "border-red-400/40 text-red-300 hover:bg-red-400/10",
  },
};

const icons: Record<BookingAction, typeof CheckCircle2> = {
  confirm: CheckCircle2,
  cancel: Trash2,
  complete: CheckCircle2,
  no_show: XCircle,
};

interface BookingActionButtonProps {
  bookingId: string;
  action: BookingAction;
  disabled?: boolean;
}

/**
 * A single lifecycle action for a booking. Cancel and no-show are destructive
 * and require an explicit confirmation step; every action disables while
 * pending and reports success/failure via the action state. The server action
 * (and the DB trigger) remain the authoritative guards.
 */
export function BookingActionButton({
  bookingId,
  action,
  disabled,
}: BookingActionButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, isPending] = useActionState(updateBookingStatus, {
    ok: false,
  } satisfies AdminBookingActionState);

  const meta = actionMeta[action];
  const requiresConfirm = action === "cancel" || action === "no_show";
  const Icon = icons[action];
  const pendingLabel = action === "confirm" ? "Confirming…" : "Working…";

  const submitForm = (
    <form action={formAction} className="contents">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="action" value={action} />
      <Button
        type="submit"
        size="sm"
        variant={meta.variant}
        className={meta.className}
        disabled={disabled || isPending}
      >
        {isPending ? <Spinner size="sm" /> : <Icon className="h-4 w-4" aria-hidden />}
        {isPending ? pendingLabel : meta.label}
      </Button>
    </form>
  );

  return (
    <div className="flex flex-col gap-2">
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
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{state.message}</span>
        </p>
      ) : null}

      {requiresConfirm && confirming ? (
        <div className="flex flex-wrap items-center gap-3" role="group" aria-label={meta.confirmLabel}>
          {submitForm}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            Keep booking
          </Button>
        </div>
      ) : requiresConfirm ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={meta.className}
          onClick={() => setConfirming(true)}
          disabled={disabled || isPending}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {meta.label}
        </Button>
      ) : (
        submitForm
      )}
    </div>
  );
}
