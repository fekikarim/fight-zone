"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateEvent, deleteEvent } from "@/lib/actions/events";
import type { EventActionState } from "@/lib/actions/events";
import type { EventDetail, EventType } from "@/lib/types/events";

const EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: "TRAINING", label: "Training" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "COMPETITION", label: "Competition" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "OTHER", label: "Other" },
];

const inputClass = "w-full rounded-lg border border-ink-border bg-ink-soft/40 px-3 py-2 text-sm";
const labelClass = "text-sm font-medium";

function toDatetimeLocal(value: string): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventEditForm({ event }: { event: EventDetail }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: EventActionState, formData: FormData) => {
      const result = await updateEvent(_prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    { ok: false } as EventActionState,
  );

  const [format, setFormat] = useState<"standard" | "private">(
    event.is_private_coaching ? "private" : "standard",
  );
  const [visibility, setVisibility] = useState<"public" | "private">(
    event.is_public ? "public" : "private",
  );
  const [isFree, setIsFree] = useState(event.is_free);

  const privateCoaching = format === "private";
  const paid = !isFree;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="eventId" value={event.id} />

      {state.message && !state.ok ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}
      {state.message && state.ok ? (
        <div className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary">
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
          defaultValue={event.title}
          className={inputClass}
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
          defaultValue={event.description ?? ""}
          className={inputClass}
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
            defaultValue={event.event_type}
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
            defaultValue={event.location ?? ""}
            className={inputClass}
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
            defaultValue={toDatetimeLocal(event.start_at)}
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
            defaultValue={event.end_at ? toDatetimeLocal(event.end_at) : ""}
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
                name="format"
                value="standard"
                checked={!privateCoaching}
                onChange={() => setFormat("standard")}
                className="accent-primary"
              />
              Standard event
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="format"
                value="private"
                checked={privateCoaching}
                onChange={() => setFormat("private")}
                className="accent-primary"
              />
              Private coaching (1-on-1)
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
                  Max participants
                </label>
                <input
                  id="max_participants"
                  name="max_participants"
                  type="number"
                  min={1}
                  defaultValue={event.max_participants ?? ""}
                  className={inputClass}
                  placeholder="Leave empty for unlimited"
                />
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
                defaultValue={event.price_tnd ?? ""}
                className={inputClass}
              />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted">
            Attendees will not be charged — payment is marked &quot;Free&quot; for participants.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="image_url" className={labelClass}>
          Image URL
        </label>
        <input
          id="image_url"
          name="image_url"
          defaultValue={event.image_url ?? ""}
          className={inputClass}
          placeholder="https://… (optional — a default image will be used)"
        />
      </div>

      <Button type="submit" disabled={isPending} className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: EventActionState, formData: FormData) => {
      const result = await deleteEvent(_prev, formData);
      if (result.ok) router.push("/admin/events");
      return result;
    },
    { ok: false } as EventActionState,
  );

  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!window.confirm("Delete this event? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="eventId" value={eventId} />
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          className="border-destructive/40 text-destructive hover:border-destructive hover:text-destructive"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          {isPending ? "Deleting…" : "Delete event"}
        </Button>
      </form>
      {state.message && !state.ok ? (
        <p className="text-xs text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}