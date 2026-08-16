"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarClock } from "lucide-react";
import {
  bookingSchema,
  type BookingFormValues,
} from "@/lib/validations/member";
import { createBooking, type MemberActionState } from "@/lib/actions/member";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { formatPrice } from "@/lib/utils";

const initialState: MemberActionState = { ok: false };

interface BookingRequestFormProps {
  sessionId: string;
  sessionTitle: string;
  price: number;
  durationMin: number;
}

export function BookingRequestForm({
  sessionId,
  sessionTitle,
  price,
  durationMin,
}: BookingRequestFormProps) {
  const [state, formAction, isPending] = useActionState(createBooking, initialState);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { sessionId, scheduledAt: "", notes: "" },
  });

  // datetime-local inputs need local-time values; floor to the current minute.
  const minDatetime = new Date().toISOString().slice(0, 16);

  const onSubmit = (values: BookingFormValues) => {
    const formData = new FormData();
    formData.set("sessionId", String(values.sessionId));
    formData.set("scheduledAt", String(values.scheduledAt));
    formData.set("notes", String(values.notes ?? ""));
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink-border bg-ink-soft/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm font-medium">{sessionTitle}</span>
        </div>
        <span className="text-sm text-muted">
          {durationMin} min · {formatPrice(price)}
        </span>
      </div>

      <input type="hidden" {...register("sessionId")} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="scheduledAt">Preferred date &amp; time</Label>
        <Input
          id="scheduledAt"
          type="datetime-local"
          min={minDatetime}
          aria-invalid={errors.scheduledAt ? true : undefined}
          aria-describedby={errors.scheduledAt ? "scheduledAt-error" : undefined}
          {...register("scheduledAt")}
        />
        {errors.scheduledAt ? (
          <p id="scheduledAt-error" className="text-xs font-medium text-primary">
            {errors.scheduledAt.message}
          </p>
        ) : (
          <p className="text-xs text-muted">
            Pick a time that works for you — the coach will confirm your request.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Goals, experience level, injuries, anything the coach should know…"
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={errors.notes ? "notes-error" : undefined}
          {...register("notes")}
        />
        {errors.notes ? (
          <p id="notes-error" className="text-xs font-medium text-primary">
            {errors.notes.message}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-sm text-primary"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{state.message}</span>
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? (
          <>
            <Spinner size="sm" />
            Requesting booking…
          </>
        ) : (
          "Request this booking"
        )}
      </Button>
      <p className="text-xs text-muted">
        Your request is sent to the coach as <span className="font-medium">pending</span>{" "}
        and will show up in your bookings.
      </p>
    </form>
  );
}
