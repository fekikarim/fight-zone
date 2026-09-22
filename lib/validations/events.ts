import { z } from "zod";

/**
 * Event validation schemas.  Server actions are the only trust boundary.
 * Ownership is always derived from the session.
 */

const UUID = z.string().uuid("Invalid ID.");

// ── Event CRUD ──────────────────────────────────────────────

export const createEventSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required.")
      .max(200, "Title must be at most 200 characters."),
    description: z.string().max(5000).optional(),
    event_type: z.enum(["TRAINING", "WORKSHOP", "COMPETITION", "SEMINAR", "OTHER"]),
    start_at: z.string().min(1, "Start date is required."),
    end_at: z.string().optional(),
    location: z.string().max(300).optional(),
    is_public: z.boolean().default(false),
    max_participants: z
      .preprocess((v) => (v === "" || v === null ? null : Number(v)), z.number().int().positive().nullable())
      .optional(),
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
    start_at: z.string().optional(),
    end_at: z.string().optional(),
    location: z.string().max(300).optional(),
    is_public: z.boolean().optional(),
    max_participants: z
      .preprocess((v) => (v === "" || v === null ? null : Number(v)), z.number().int().positive().nullable())
      .optional(),
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
  status: z.enum(["ATTENDED", "NO_SHOW", "CANCELLED"]),
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
