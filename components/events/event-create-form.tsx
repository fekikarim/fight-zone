"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createEvent } from "@/lib/actions/events";
import type { EventActionState } from "@/lib/actions/events";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import type { EventType } from "@/lib/types/events";

const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: "TRAINING", label: "Training" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "COMPETITION", label: "Competition" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "OTHER", label: "Other" },
];

const inputClass = "w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm";
const labelClass = "text-sm font-medium";

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

  const [format, setFormat] = useState<"COLLECTIVE" | "INDIVIDUAL">("COLLECTIVE");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [isFree, setIsFree] = useState(true);

  const privateCoaching = format === "INDIVIDUAL";
  const paid = !isFree;

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="title" className={labelClass}>
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          name="title"
          required
          className={inputClass}
          placeholder="e.g. Open Sparring Night"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className={inputClass}
          placeholder="Optional description for the event"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="event_type" className={labelClass}>
            Type <span className="text-destructive">*</span>
          </label>
          <select
            id="event_type"
            name="event_type"
            required
            className={inputClass}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="location" className={labelClass}>
            Location
          </label>
          <input
            id="location"
            name="location"
            className={inputClass}
            placeholder="e.g. Main dojo"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="start_at" className={labelClass}>
            Start <span className="text-destructive">*</span>
          </label>
          <input
            id="start_at"
            name="start_at"
            type="datetime-local"
            required
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="end_at" className={labelClass}>
            End
          </label>
          <input
            id="end_at"
            name="end_at"
            type="datetime-local"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-ink-border bg-ink-soft/40 p-4">
        <div className="space-y-1.5">
          <span className={labelClass}>Format</span>
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="event_format"
                value="COLLECTIVE"
                checked={!privateCoaching}
                onChange={() => setFormat("COLLECTIVE")}
                className="accent-primary"
              />
              Collective event
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="event_format"
                value="INDIVIDUAL"
                checked={privateCoaching}
                onChange={() => setFormat("INDIVIDUAL")}
                className="accent-primary"
              />
              Individual coaching (1-on-1)
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className={labelClass}>Visibility</span>
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="is_public"
                  value="true"
                  checked={!privateCoaching && visibility === "public"}
                  disabled={privateCoaching}
                  onChange={() => setVisibility("public")}
                  className="accent-primary"
                />
                Public
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="is_public"
                  value="false"
                  checked={privateCoaching || visibility === "private"}
                  onChange={() => setVisibility("private")}
                  className="accent-primary"
                />
                Private
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            {privateCoaching ? (
              <>
                <input type="hidden" name="max_participants" value="1" />
                <label htmlFor="max_participants" className={labelClass}>
                  Max participants
                </label>
                <input
                  id="max_participants"
                  value={1}
                  disabled
                  readOnly
                  className={`${inputClass} cursor-not-allowed opacity-60`}
                />
                <p className="text-xs text-muted">
                  Private coaching is capped at 1 participant.
                </p>
              </>
            ) : (
              <>
                <label htmlFor="max_participants" className={labelClass}>
                  Max participants <span className="text-destructive">*</span>
                </label>
                <input
                  id="max_participants"
                  name="max_participants"
                  type="number"
                  min={1}
                  step={1}
                  required
                  className={inputClass}
                  placeholder="e.g. 20"
                />
                <p className="text-xs text-muted">
                  Required — registration closes automatically once full.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-ink-border bg-ink-soft/40 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="h-4 w-4 rounded border-ink-border"
          />
          Free event
        </label>
        {paid ? (
          <>
            <input type="hidden" name="is_free" value="false" />
            <div className="space-y-1.5">
              <label htmlFor="price_tnd" className={labelClass}>
                Price (TND) <span className="text-destructive">*</span>
              </label>
              <input
                id="price_tnd"
                name="price_tnd"
                type="number"
                min={0}
                step={0.01}
                required
                className={inputClass}
                placeholder="e.g. 25.00"
              />
              <p className="text-xs text-muted">
                Paid in cash with the coach before the event starts. No online payments.
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted">
            Attendees will not be charged — payment is marked &quot;Free&quot; for participants.
          </p>
        )}
      </div>

      <ImageUploadField name="image_url" kind="events" label="Event image" />

      <Button type="submit" disabled={isPending} className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}