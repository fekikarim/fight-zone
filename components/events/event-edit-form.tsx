"use client";

import { useRef, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateEvent, deleteEvent } from "@/lib/actions/events";
import type { EventActionState } from "@/lib/actions/events";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormAlert, useActionForm } from "@/components/ui/form-feedback";
import { EventFormFields, imageStillUploading } from "@/components/events/event-form-fields";
import { readUpdateEventForm, updateEventSchema } from "@/lib/validations/events";
import { issuesToFieldErrors } from "@/lib/validations/form-errors";
import type { EventDetail } from "@/lib/types/events";

function validate(formData: FormData) {
  if (imageStillUploading(formData)) {
    return { image_url: "Please wait for the image to finish uploading." };
  }
  const parsed = updateEventSchema.safeParse(readUpdateEventForm(formData));
  return parsed.success ? null : issuesToFieldErrors(parsed.error.issues);
}

export function EventEditForm({ event }: { event: EventDetail }) {
  const router = useRouter();
  const { state, isPending, fieldErrors, formProps } = useActionForm<EventActionState>(
    updateEvent,
    { ok: false },
    { validate, onSuccess: () => router.refresh() },
  );

  return (
    <form {...formProps} className="space-y-6" aria-busy={isPending}>
      <input type="hidden" name="eventId" value={event.id} />
      <FormAlert tone="error" message={!state.ok ? state.message : undefined} />
      <FormAlert tone="success" message={state.ok ? state.message : undefined} />

      <EventFormFields event={event} errors={fieldErrors} disabled={isPending} />

      <div className="flex justify-end border-t border-ink-border pt-5">
        <Button type="submit" size="lg" disabled={isPending} className="w-full gap-2 sm:w-auto sm:min-w-44">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (_prev: EventActionState, formData: FormData) => {
      const result = await deleteEvent(_prev, formData);
      if (result.ok) {
        setConfirmOpen(false);
        router.push("/admin/events");
      }
      return result;
    },
    { ok: false } as EventActionState,
  );

  return (
    <div className="space-y-2">
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="eventId" value={eventId} />
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => setConfirmOpen(true)}
          className="gap-2 border-destructive/40 text-destructive hover:border-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Delete event
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          title="Delete this event?"
          description="The event and all its registrations will be permanently removed. This cannot be undone."
          confirmLabel="Delete event"
          pending={isPending}
          onClose={() => {
            if (!isPending) setConfirmOpen(false);
          }}
          onConfirm={() => formRef.current?.requestSubmit()}
        />
      </form>
      {state.message && !state.ok ? (
        <p className="text-xs text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}