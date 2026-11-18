"use client";

import { useState, useSyncExternalStore } from "react";
import { FieldError, fieldA11y, fieldClass, type FieldErrors } from "@/components/ui/form-feedback";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { EVENT_LIMITS } from "@/lib/validations/events";
import { toBusinessDateTimeInput } from "@/lib/timezone";
import type { EventDetail, EventType } from "@/lib/types/events";

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "TRAINING", label: "Training" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "COMPETITION", label: "Competition" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "OTHER", label: "Other" },
];

const labelClass = "text-sm font-medium text-foreground";
const hintClass = "text-xs text-muted";

function Required() {
  return (
    <span className="text-primary" aria-hidden>
      {" "}*
    </span>
  );
}

/**
 * Current Tunis wall-clock time as a datetime-local `min` value — client
 * only (server snapshot is undefined) so it never causes a hydration mismatch.
 */
let cachedNow: string | undefined;
const noopSubscribe = () => () => {};
function useNowInput(enabled: boolean): string | undefined {
  return useSyncExternalStore(
    noopSubscribe,
    () => (enabled ? (cachedNow ??= toBusinessDateTimeInput(new Date())) : undefined),
    () => undefined,
  );
}

interface EventFormFieldsProps {
  /** Existing event (edit) — omitted for create. */
  event?: EventDetail;
  errors: FieldErrors;
  disabled?: boolean;
}

/**
 * The full event field set shared by the create and edit forms: guidance
 * placeholders, hints, inline errors and the format/visibility/pricing rules.
 * Fields stay uncontrolled (values survive failed submissions); only the
 * toggles that change the layout are React state.
 */
export function EventFormFields({ event, errors, disabled }: EventFormFieldsProps) {
  const [format, setFormat] = useState<"COLLECTIVE" | "INDIVIDUAL">(
    event?.event_format === "INDIVIDUAL" ? "INDIVIDUAL" : "COLLECTIVE",
  );
  const [visibility, setVisibility] = useState<"public" | "private">(
    event ? (event.is_public ? "public" : "private") : "public",
  );
  const [isFree, setIsFree] = useState(event?.is_free ?? true);
  const [startValue, setStartValue] = useState(event ? toBusinessDateTimeInput(event.start_at) : "");
  const [titleLength, setTitleLength] = useState(event?.title.length ?? 0);
  const minStart = useNowInput(!event);

  const individual = format === "INDIVIDUAL";

  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-80">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="title" className={labelClass}>
            Title
            <Required />
          </label>
          <span className="text-[11px] tabular-nums text-muted">
            {titleLength}/{EVENT_LIMITS.titleMax}
          </span>
        </div>
        <input
          id="title"
          name="title"
          required
          minLength={EVENT_LIMITS.titleMin}
          maxLength={EVENT_LIMITS.titleMax}
          defaultValue={event?.title}
          onChange={(e) => setTitleLength(e.target.value.length)}
          autoComplete="off"
          className={fieldClass(Boolean(errors.title))}
          placeholder="e.g. Saturday Open Sparring Night"
          {...fieldA11y("title", errors.title)}
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={EVENT_LIMITS.descriptionMax}
          defaultValue={event?.description ?? ""}
          className={fieldClass(Boolean(errors.description), "min-h-28 resize-y")}
          placeholder="What will members do, who is it for, and what should they bring? (e.g. gloves, water, mouthguard)"
          {...fieldA11y("description", errors.description)}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="event_type" className={labelClass}>
            Type
            <Required />
          </label>
          <select
            id="event_type"
            name="event_type"
            required
            defaultValue={event?.event_type ?? "TRAINING"}
            className={fieldClass(Boolean(errors.event_type))}
            {...fieldA11y("event_type", errors.event_type)}
          >
            {EVENT_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <FieldError id="event_type-error" message={errors.event_type} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="location" className={labelClass}>
            Location
          </label>
          <input
            id="location"
            name="location"
            maxLength={EVENT_LIMITS.locationMax}
            defaultValue={event?.location ?? ""}
            autoComplete="off"
            className={fieldClass(Boolean(errors.location))}
            placeholder="e.g. Fight Zone main ring, Tunis"
            {...fieldA11y("location", errors.location)}
          />
          <FieldError id="location-error" message={errors.location} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="start_at" className={labelClass}>
            Start
            <Required />
          </label>
          <input
            id="start_at"
            name="start_at"
            type="datetime-local"
            required
            min={minStart}
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            className={fieldClass(Boolean(errors.start_at), "min-h-11")}
            {...fieldA11y("start_at", errors.start_at)}
          />
          <FieldError id="start_at-error" message={errors.start_at} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="end_at" className={labelClass}>
            End
          </label>
          <input
            id="end_at"
            name="end_at"
            type="datetime-local"
            min={startValue || minStart}
            defaultValue={event?.end_at ? toBusinessDateTimeInput(event.end_at) : ""}
            className={fieldClass(Boolean(errors.end_at), "min-h-11")}
            {...fieldA11y("end_at", errors.end_at)}
          />
          {errors.end_at ? (
            <FieldError id="end_at-error" message={errors.end_at} />
          ) : (
            <p className={hintClass}>Optional — must be after the start.</p>
          )}
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted">All times are Tunisia time (Africa/Tunis).</p>

      <div className="space-y-5 rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-5">
        <div className="space-y-2">
          <span className={labelClass}>Format</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: "COLLECTIVE", label: "Collective event", hint: "Group session, open to many members" },
                { value: "INDIVIDUAL", label: "Individual coaching", hint: "1-on-1, always private" },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="radio"
                  name="event_format"
                  value={option.value}
                  checked={format === option.value}
                  onChange={() => setFormat(option.value)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span className={labelClass}>Visibility</span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
              <label className="flex min-h-11 items-center gap-2 text-sm aria-disabled:opacity-50" aria-disabled={individual}>
                <input
                  type="radio"
                  name="is_public"
                  value="true"
                  checked={!individual && visibility === "public"}
                  disabled={individual}
                  onChange={() => setVisibility("public")}
                  className="h-4 w-4 accent-primary"
                />
                Public
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="is_public"
                  value="false"
                  checked={individual || visibility === "private"}
                  onChange={() => setVisibility("private")}
                  className="h-4 w-4 accent-primary"
                />
                Private
              </label>
            </div>
            <p className={hintClass}>
              {individual
                ? "Individual coaching is always private."
                : visibility === "public"
                  ? "Listed on the public events page."
                  : "Hidden from the public page (draft)."}
            </p>
          </div>

          <div className="space-y-1.5">
            {individual ? (
              <>
                <input type="hidden" name="max_participants" value="1" />
                <label htmlFor="max_participants_fixed" className={labelClass}>
                  Max participants
                </label>
                <input
                  id="max_participants_fixed"
                  value={1}
                  disabled
                  readOnly
                  className={fieldClass(false, "cursor-not-allowed opacity-60")}
                />
                <p className={hintClass}>Individual coaching is capped at 1 participant.</p>
              </>
            ) : (
              <>
                <label htmlFor="max_participants" className={labelClass}>
                  Max participants
                  <Required />
                </label>
                <input
                  id="max_participants"
                  name="max_participants"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={EVENT_LIMITS.maxParticipants}
                  step={1}
                  required
                  defaultValue={event?.max_participants ?? ""}
                  className={fieldClass(Boolean(errors.max_participants))}
                  placeholder="e.g. 20"
                  {...fieldA11y("max_participants", errors.max_participants)}
                />
                {errors.max_participants ? (
                  <FieldError id="max_participants-error" message={errors.max_participants} />
                ) : (
                  <p className={hintClass}>
                    {event
                      ? `Currently ${event.participant_count} registered — cannot go below that.`
                      : "Registration closes automatically once full."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-5">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="h-5 w-5 rounded border-ink-border accent-primary"
          />
          Free event
        </label>
        <input type="hidden" name="is_free" value={isFree ? "true" : "false"} />
        {!isFree ? (
          <div className="space-y-1.5">
            <label htmlFor="price_tnd" className={labelClass}>
              Price (TND)
              <Required />
            </label>
            <input
              id="price_tnd"
              name="price_tnd"
              type="number"
              inputMode="decimal"
              min={0.01}
              max={EVENT_LIMITS.maxPriceTnd}
              step={0.01}
              required
              defaultValue={event?.price_tnd ?? ""}
              className={fieldClass(Boolean(errors.price_tnd))}
              placeholder="e.g. 25.00"
              {...fieldA11y("price_tnd", errors.price_tnd)}
            />
            {errors.price_tnd ? (
              <FieldError id="price_tnd-error" message={errors.price_tnd} />
            ) : (
              <p className={hintClass}>Paid in cash with the coach before the event starts. No online payments.</p>
            )}
          </div>
        ) : (
          <p className={hintClass}>Attendees will not be charged — payment is marked &quot;Free&quot; for participants.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <ImageUploadField name="image_url" kind="events" label="Event image" defaultValue={event?.image_url} />
        <FieldError id="image_url-error" message={errors.image_url} />
      </div>
    </fieldset>
  );
}

/** Client-side pre-check shared by create/edit (the server re-validates). */
export function imageStillUploading(formData: FormData): boolean {
  return formData.get("image_url__uploading") === "1";
}
