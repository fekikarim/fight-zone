"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateEvent } from "@/lib/actions/events";
import type { EventActionState } from "@/lib/actions/events";
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
    {
      validate,
      successToast: "Changes saved",
      onSuccess: () => router.push("/admin/events"),
    },
  );
  const saved = state.ok;

  return (
    <form {...formProps} className="space-y-6" aria-busy={isPending}>
      <input type="hidden" name="eventId" value={event.id} />
      <FormAlert tone="error" message={!state.ok ? state.message : undefined} />

      <EventFormFields event={event} errors={fieldErrors} disabled={isPending || saved} />

      <div className="flex flex-col-reverse gap-3 border-t border-ink-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/events")} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={isPending || saved} className="gap-2 sm:min-w-44">
          {isPending || saved ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isPending ? "Saving…" : saved ? "Redirecting…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
