"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createEvent } from "@/lib/actions/events";
import type { EventActionState } from "@/lib/actions/events";

const EVENT_TYPES = [
  { value: "TRAINING", label: "Training" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "COMPETITION", label: "Competition" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "OTHER", label: "Other" },
] as const;

export function EventCreateForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: EventActionState, formData: FormData) => {
      const result = await createEvent(_prev, formData);
      if (result.ok && result.eventId) router.push(`/admin/events/${result.eventId}`);
      return result;
    },
    { ok: false } as EventActionState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          placeholder="e.g. Open Sparring Night"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          placeholder="Optional description for the event"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="event_type" className="text-sm font-medium">
            Type <span className="text-destructive">*</span>
          </label>
          <select
            id="event_type"
            name="event_type"
            required
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="location" className="text-sm font-medium">
            Location
          </label>
          <input
            id="location"
            name="location"
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
            placeholder="e.g. Main dojo"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="start_at" className="text-sm font-medium">
            Start <span className="text-destructive">*</span>
          </label>
          <input
            id="start_at"
            name="start_at"
            type="datetime-local"
            required
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="end_at" className="text-sm font-medium">
            End
          </label>
          <input
            id="end_at"
            name="end_at"
            type="datetime-local"
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="max_participants" className="text-sm font-medium">
            Max participants
          </label>
          <input
            id="max_participants"
            name="max_participants"
            type="number"
            min={1}
            className="w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm"
            placeholder="Leave empty for unlimited"
          />
        </div>

        <div className="flex items-end gap-6 pb-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="is_public" value="true" defaultChecked className="accent-primary" />
            Public
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="is_public" value="false" className="accent-primary" />
            Private
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}
