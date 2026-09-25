import { z } from "zod";

/**
 * Event validation schemas.  Server actions are the only trust boundary.
 * Ownership is always derived from the session.
 */

const UUID = z.string().uuid("Invalid ID.");

export const EVENT_FORMATS = ["INDIVIDUAL", "COLLECTIVE"] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];

/**
 * Capacity is mandatory: every event declares a positive whole-number
 * participant limit (individual coaching is coerced to 1 server-side).
 * Empty, non-numeric, fractional, zero and negative inputs are rejected
 * with explicit messages — the DB CHECK (> 0) remains as defense in depth.
 */
const requiredCapacity = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z
    .number({ error: "Max participants is required." })
    .int("Max participants must be a whole number.")
    .positive("Max participants must be at least 1."),
);

const optionalCapacity = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z
    .number({ error: "Max participants must be a number." })
    .int("Max participants must be a whole number.")
    .positive("Max participants must be at least 1.")
    .optional(),
);

// ── Event CRUD ──────────────────────────────────────────────

export const createEventSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required.")
      .max(200, "Title must be at most 200 characters."),
    description: z.string().max(5000).optional(),
    event_type: z.enum(["TRAINING", "WORKSHOP", "COMPETITION", "SEMINAR", "OTHER"]),
    event_format: z.enum(EVENT_FORMATS).default("COLLECTIVE"),
    start_at: z.string().min(1, "Start date is required."),
    end_at: z.string().optional(),
    location: z.string().max(300).optional(),
    is_public: z.boolean().default(false),
    max_participants: requiredCapacity,
    is_free: z.boolean().default(true),
    price_tnd: z
      .preprocess((v) => (v === "" || v === null ? null : Number(v)), z.number().min(0).nullable())
      .optional(),
    image_url: z.string().max(500).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.end_at && data.start_at && new Date(data.end_at).getTime() <= new Date(data.start_at).getTime()) {
      ctx.addIssue({ code: "custom", message: "End date must be after start date.", path: ["end_at"] });
    }
    if (data.is_free && data.price_tnd != null) {
      ctx.addIssue({ code: "custom", message: "Free events cannot have a price.", path: ["price_tnd"] });
    }
    if (!data.is_free && (data.price_tnd == null || data.price_tnd < 0)) {
      ctx.addIssue({ code: "custom", message: "Paid events require a price.", path: ["price_tnd"] });
    }
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z
  .object({
    eventId: UUID,
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    event_type: z.enum(["TRAINING", "WORKSHOP", "COMPETITION", "SEMINAR", "OTHER"]).optional(),
    event_format: z.enum(EVENT_FORMATS).optional(),
    start_at: z.string().optional(),
    end_at: z.string().optional(),
    location: z.string().max(300).optional(),
    is_public: z.boolean().optional(),
    // Partial updates: omitted or blank keeps the current value (which is
    // always set — capacity can no longer be cleared back to unlimited).
    max_participants: optionalCapacity,
    is_free: z.boolean().optional(),
    price_tnd: z
      .preprocess((v) => (v === "" || v === null ? null : Number(v)), z.number().min(0).nullable())
      .optional(),
    image_url: z.string().max(500).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.end_at && data.start_at && new Date(data.end_at).getTime() <= new Date(data.start_at).getTime()) {
      ctx.addIssue({ code: "custom", message: "End date must be after start date.", path: ["end_at"] });
    }
    if (data.is_free === true && data.price_tnd != null) {
      ctx.addIssue({ code: "custom", message: "Free events cannot have a price.", path: ["price_tnd"] });
    }
    if (data.is_free === false && (data.price_tnd == null || data.price_tnd < 0)) {
      ctx.addIssue({ code: "custom", message: "Paid events require a price.", path: ["price_tnd"] });
    }
  });

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
  type: z.enum(["TRAINING", "WORKSHOP", "COMPETITION", "SEMINAR", "OTHER"]).optional(),
  cursor: z.string().min(1).optional(),
});

export type EventFilterInput = z.infer<typeof eventFilterSchema>;

export const participantFilterSchema = z.object({
  status: z.enum(["JOINED", "INTERESTED", "CANCELLED", "ATTENDED", "NO_SHOW"]).optional(),
  cursor: z.string().min(1).optional(),
});
