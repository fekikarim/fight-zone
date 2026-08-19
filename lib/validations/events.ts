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
  })
  .refine((data) => {
    if (data.end_at && data.start_at) {
      return new Date(data.end_at).getTime() > new Date(data.start_at).getTime();
    }
    return true;
  }, { message: "End date must be after start date.", path: ["end_at"] });

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
  })
  .refine((data) => {
    if (data.end_at && data.start_at) {
      return new Date(data.end_at).getTime() > new Date(data.start_at).getTime();
    }
    return true;
  }, { message: "End date must be after start date.", path: ["end_at"] });

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
