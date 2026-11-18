import { z } from "zod";
import { fromBusinessDateTimeInput } from "@/lib/timezone";

/**
 * Event validation schemas.  Server actions are the only trust boundary.
 * Ownership is always derived from the session.
 */

const UUID = z.string().uuid("Invalid ID.");

export const EVENT_FORMATS = ["INDIVIDUAL", "COLLECTIVE"] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];

export const EVENT_TYPES = ["TRAINING", "WORKSHOP", "COMPETITION", "SEMINAR", "OTHER"] as const;

/** Upper bounds that keep typos (an extra zero) from reaching the database. */
export const EVENT_LIMITS = {
  titleMin: 3,
  titleMax: 200,
  descriptionMax: 5000,
  locationMax: 300,
  maxParticipants: 1000,
  maxPriceTnd: 10000,
} as const;

/**
 * Capacity is mandatory: every event declares a positive whole-number
 * participant limit (individual coaching is coerced to 1 server-side).
 * Empty, non-numeric, fractional, zero and negative inputs are rejected
 * with explicit messages — the DB CHECK (> 0) remains as defense in depth.
 */
const capacityNumber = z
  .number({ error: "Max participants must be a number." })
  .int("Max participants must be a whole number.")
  .positive("Max participants must be at least 1.")
  .max(EVENT_LIMITS.maxParticipants, `Max participants cannot exceed ${EVENT_LIMITS.maxParticipants}.`);

const requiredCapacity = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number({ error: "Max participants is required." }).pipe(capacityNumber),
);

const optionalCapacity = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  capacityNumber.optional(),
);

const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v ?? undefined),
    z.string().max(max, `${label} must be at most ${max} characters.`).optional(),
  );

const priceField = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z
    .number({ error: "Price must be a number." })
    .min(0, "Price cannot be negative.")
    .max(EVENT_LIMITS.maxPriceTnd, `Price cannot exceed ${EVENT_LIMITS.maxPriceTnd} TND.`)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Price can have at most 2 decimals.")
    .nullable(),
);

const imageUrlField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || null : v ?? null),
  z
    .string()
    .max(500, "Image URL is too long.")
    .refine((u) => /^https:\/\//i.test(u), "Image must be uploaded again.")
    .nullable(),
);

/**
 * datetime-local inputs carry Fight Zone wall-clock time (Africa/Tunis);
 * convert to a UTC ISO instant so the server's own timezone never matters.
 */
const dateTimeField = (requiredMessage: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? fromBusinessDateTimeInput(v) ?? "invalid" : undefined),
    z.string({ error: requiredMessage }).refine((v) => v !== "invalid", "Please enter a valid date and time."),
  );

const titleField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z
    .string({ error: "Title is required." })
    .min(1, "Title is required.")
    .min(EVENT_LIMITS.titleMin, `Title must be at least ${EVENT_LIMITS.titleMin} characters.`)
    .max(EVENT_LIMITS.titleMax, `Title must be at most ${EVENT_LIMITS.titleMax} characters.`),
);

// ── Event CRUD ──────────────────────────────────────────────

export const createEventSchema = z
  .object({
    title: titleField,
    description: optionalText(EVENT_LIMITS.descriptionMax, "Description"),
    event_type: z.enum(EVENT_TYPES, { error: "Please choose an event type." }),
    event_format: z.enum(EVENT_FORMATS).default("COLLECTIVE"),
    start_at: dateTimeField("Start date and time are required."),
    end_at: dateTimeField("End date is invalid.").optional(),
    location: optionalText(EVENT_LIMITS.locationMax, "Location"),
    is_public: z.boolean().default(false),
    max_participants: requiredCapacity,
    is_free: z.boolean().default(true),
    price_tnd: priceField.optional(),
    image_url: imageUrlField.optional(),
  })
  .superRefine((data, ctx) => {
    // Small grace window so "now" (and slow form fills) are still accepted.
    if (new Date(data.start_at).getTime() < Date.now() - 5 * 60 * 1000) {
      ctx.addIssue({ code: "custom", message: "Start time must be in the future.", path: ["start_at"] });
    }
    if (data.end_at && new Date(data.end_at).getTime() <= new Date(data.start_at).getTime()) {
      ctx.addIssue({ code: "custom", message: "End time must be after the start time.", path: ["end_at"] });
    }
    if (data.is_free && data.price_tnd != null) {
      ctx.addIssue({ code: "custom", message: "Free events cannot have a price.", path: ["price_tnd"] });
    }
    if (!data.is_free && (data.price_tnd == null || data.price_tnd <= 0)) {
      ctx.addIssue({ code: "custom", message: "Enter a price above 0 TND for a paid event.", path: ["price_tnd"] });
    }
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;

/** Reads the create-event FormData into the schema's input shape (shared by client + server). */
export function readCreateEventForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return {
    title: get("title") ?? "",
    description: get("description"),
    event_type: get("event_type"),
    event_format: get("event_format") || undefined,
    start_at: get("start_at"),
    end_at: get("end_at") || undefined,
    location: get("location"),
    is_public: get("is_public") === "true",
    max_participants: get("max_participants"),
    is_free: get("is_free") !== "false",
    price_tnd: get("is_free") === "false" ? get("price_tnd") : undefined,
    image_url: get("image_url"),
  };
}

export const updateEventSchema = z
  .object({
    eventId: UUID,
    title: titleField.optional(),
    description: optionalText(EVENT_LIMITS.descriptionMax, "Description"),
    event_type: z.enum(EVENT_TYPES).optional(),
    event_format: z.enum(EVENT_FORMATS).optional(),
    start_at: dateTimeField("Start date and time are required.").optional(),
    end_at: dateTimeField("End date is invalid.").optional(),
    location: optionalText(EVENT_LIMITS.locationMax, "Location"),
    is_public: z.boolean().optional(),
    // Partial updates: omitted or blank keeps the current value (which is
    // always set — capacity can no longer be cleared back to unlimited).
    max_participants: optionalCapacity,
    is_free: z.boolean().optional(),
    price_tnd: priceField.optional(),
    image_url: imageUrlField.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.end_at && data.start_at && new Date(data.end_at).getTime() <= new Date(data.start_at).getTime()) {
      ctx.addIssue({ code: "custom", message: "End time must be after the start time.", path: ["end_at"] });
    }
    if (data.is_free === true && data.price_tnd != null) {
      ctx.addIssue({ code: "custom", message: "Free events cannot have a price.", path: ["price_tnd"] });
    }
    if (data.is_free === false && (data.price_tnd == null || data.price_tnd <= 0)) {
      ctx.addIssue({ code: "custom", message: "Enter a price above 0 TND for a paid event.", path: ["price_tnd"] });
    }
  });

/** Reads the edit-event FormData (blank optional fields mean "clear" for text, "keep" otherwise). */
export function readUpdateEventForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const isFree = get("is_free") !== undefined ? get("is_free") !== "false" : undefined;
  return {
    eventId: get("eventId"),
    title: get("title"),
    description: get("description"),
    event_type: get("event_type") || undefined,
    event_format: get("event_format") || undefined,
    start_at: get("start_at") || undefined,
    end_at: get("end_at") || undefined,
    location: get("location"),
    is_public: get("is_public") !== undefined ? get("is_public") === "true" : undefined,
    max_participants: get("max_participants") || undefined,
    is_free: isFree,
    price_tnd: isFree === false ? get("price_tnd") : isFree === true ? undefined : get("price_tnd"),
    image_url: get("image_url"),
  };
}

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ── Registration ─────────────────────────────────────────────

export const registerForEventSchema = z.object({
  eventId: UUID,
});

export const cancelEventRegistrationSchema = z.object({
  eventId: UUID,
});

export const updateParticipantStatusSchema = z.object({
  participantId: UUID,
  status: z.enum(["JOINED", "ATTENDED", "NO_SHOW", "CANCELLED"]),
});

/** Staff confirms local payment / attendance on a participant. */
export const updateParticipantPaymentSchema = z.object({
  participantId: UUID,
  payment_status: z.enum(["UNPAID", "PAID", "NOT_REQUIRED"]),
  attended: z.boolean(),
});

export const deleteEventSchema = z.object({
  eventId: UUID,
});

// ── Filters ──────────────────────────────────────────────────

export const eventFilterSchema = z.object({
  type: z.enum(EVENT_TYPES).optional(),
  cursor: z.string().min(1).optional(),
});

export type EventFilterInput = z.infer<typeof eventFilterSchema>;

export const participantFilterSchema = z.object({
  status: z.enum(["JOINED", "INTERESTED", "CANCELLED", "ATTENDED", "NO_SHOW"]).optional(),
  cursor: z.string().min(1).optional(),
});
