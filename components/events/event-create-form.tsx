"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert, useActionForm } from "@/components/ui/form-feedback";
import { EventFormFields, imageStillUploading } from "@/components/events/event-form-fields";
import { createEvent, type EventActionState } from "@/lib/actions/events";
import { createEventSchema, readCreateEventForm } from "@/lib/validations/events";
import { issuesToFieldErrors } from "@/lib/validations/form-errors";

function validate(formData: FormData) {
  if (imageStillUploading(formData)) {
    return { image_url: "Please wait for the image to finish uploading." };
  }
  const parsed = createEventSchema.safeParse(readCreateEventForm(formData));
  return parsed.success ? null : issuesToFieldErrors(parsed.error.issues);
}

export function EventCreateForm() {
  const router = useRouter();
  const { state, isPending, fieldErrors, formProps } = useActionForm<EventActionState>(
    createEvent,
    { ok: false },
    {
      validate,
      successToast: "Event created",
      onSuccess: () => router.push("/admin/events"),
    },
  );
  const created = state.ok;

  return (
    <form {...formProps} className="space-y-6" aria-busy={isPending}>
      <FormAlert tone="error" message={!state.ok ? state.message : undefined} />

      <EventFormFields errors={fieldErrors} disabled={isPending || created} />

      <div className="flex flex-col-reverse gap-3 border-t border-ink-border pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={isPending || created} className="gap-2 sm:min-w-44">
          {isPending || created ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isPending ? "Creating event…" : created ? "Redirecting…" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
