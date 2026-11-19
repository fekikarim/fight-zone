import { z } from "zod";
import { fromBusinessDateTimeInput } from "@/lib/timezone";

/**
 * Event validation schemas.  Server actions are the only trust boundary.
 * Ownership is always derived from the session.
 */

const UUID = z.guid("Invalid ID.");

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
    .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6, "Price can have at most 3 decimals (millimes).")
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

const optionalDateTime = z.preprocess(
  (v) => (typeof v === "string" && v.trim() ? fromBusinessDateTimeInput(v) ?? "invalid" : undefined),
  z.string().refine((v) => v !== "invalid", "Please enter a valid date and time.").optional(),
);

const categoryField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : undefined),
  z.string().min(2, "Category must be at least 2 characters.").max(40, "Category must be at most 40 characters.").optional(),
);

/** "boxing, beginners" → ["boxing","beginners"] (lower-case, deduped, max 10). */
const tagsField = z.preprocess(
  (v) =>
    typeof v === "string"
      ? [...new Set(v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))]
      : Array.isArray(v) ? v : [],
  z.array(z.string().max(30, "Each tag must be at most 30 characters.")).max(10, "Use at most 10 tags."),
);

const deadlineHoursField = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
  z.number({ error: "Enter a number of hours." }).int("Use whole hours.").min(0, "Cannot be negative.").max(720, "At most 720 hours (30 days)."),
);

/** V1 registration rules shared by create + edit. */
const v1RuleFields = {
  category: categoryField,
  tags: tagsField.optional(),
  requirements: optionalText(2000, "Requirements"),
  registration_opens_at: optionalDateTime,
  registration_closes_at: optionalDateTime,
  requires_approval: z.boolean().optional(),
  waitlist_enabled: z.boolean().optional(),
  cancellation_deadline_hours: deadlineHoursField.optional(),
};

function checkWindow(
  data: { registration_opens_at?: string; registration_closes_at?: string; start_at?: string },
  ctx: z.RefinementCtx,
) {
  const opens = data.registration_opens_at ? new Date(data.registration_opens_at).getTime() : null;
  const closes = data.registration_closes_at ? new Date(data.registration_closes_at).getTime() : null;
  const start = data.start_at ? new Date(data.start_at).getTime() : null;
  if (opens != null && closes != null && closes <= opens) {
    ctx.addIssue({ code: "custom", message: "Registration must close after it opens.", path: ["registration_closes_at"] });
  }
  if (closes != null && start != null && closes > start) {
    ctx.addIssue({ code: "custom", message: "Registration must close before the event starts.", path: ["registration_closes_at"] });
  }
  if (opens != null && start != null && opens >= start) {
    ctx.addIssue({ code: "custom", message: "Registration must open before the event starts.", path: ["registration_opens_at"] });
  }
}

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
    ...v1RuleFields,
    /** Publish immediately (otherwise saved as a draft). */
    publish: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    checkWindow(data, ctx);
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
    ...readV1Rules(get),
    publish: get("publish") === "true",
  };
}

function readV1Rules(get: (k: string) => string | undefined) {
  return {
    category: get("category"),
    tags: get("tags"),
    requirements: get("requirements"),
    registration_opens_at: get("registration_opens_at") || undefined,
    registration_closes_at: get("registration_closes_at") || undefined,
    requires_approval: get("requires_approval") !== undefined ? get("requires_approval") === "true" : undefined,
    waitlist_enabled: get("waitlist_enabled") !== undefined ? get("waitlist_enabled") === "true" : undefined,
    cancellation_deadline_hours: get("cancellation_deadline_hours"),
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
    ...v1RuleFields,
  })
  .superRefine((data, ctx) => {
    checkWindow(data, ctx);
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
    ...readV1Rules(get),
  };
}

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ── Registration / payment / attendance (V1 RPC inputs) ─────

const planDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.").optional(),
);

/** How a member will pay a paid event (chosen before registering). */
export const paymentPlanFields = {
  paymentMethod: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(["CASH", "BANK_TRANSFER"], { error: "Choose how you will pay." }).optional()),
  plannedDate: planDate,
  note: optionalText(500, "Note"),
};

export const registerForEventSchema = z
  .object({ eventId: UUID, ...paymentPlanFields })
  .superRefine((d, ctx) => {
    if (d.paymentMethod === "BANK_TRANSFER" && !d.plannedDate) {
      ctx.addIssue({ code: "custom", path: ["plannedDate"], message: "Choose the date you plan to make the transfer." });
    }
  });

export const paymentPlanSchema = z
  .object({ registrationId: UUID, ...paymentPlanFields })
  .superRefine((d, ctx) => {
    if (!d.paymentMethod) ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "Choose how you will pay." });
    if (d.paymentMethod === "BANK_TRANSFER" && !d.plannedDate) {
      ctx.addIssue({ code: "custom", path: ["plannedDate"], message: "Choose the date you plan to make the transfer." });
    }
  });
export const cancelRegistrationSchema = z.object({ registrationId: UUID });

export const decideRegistrationSchema = z
  .object({
    registrationId: UUID,
    decision: z.enum(["CONFIRM", "REJECT", "CANCEL"]),
    reason: optionalText(500, "Reason"),
  })
  .superRefine((d, ctx) => {
    if (d.decision === "CANCEL" && !d.reason) {
      ctx.addIssue({ code: "custom", message: "Give the member a reason for the cancellation.", path: ["reason"] });
    }
  });

const amountField = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z
    .number({ error: "Enter the amount." })
    .positive("The amount must be above 0.")
    .max(100000, "That amount looks too large.")
    .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6, "At most 3 decimals (millimes)."),
);

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;

export const submitPaymentProofSchema = z.object({
  registrationId: UUID,
  proofPath: z.string().min(10).max(300),
  amount: amountField,
  reference: optionalText(120, "Transfer reference"),
  note: optionalText(1000, "Note"),
});

export const reviewPaymentSchema = z
  .object({
    submissionId: UUID,
    decision: z.enum(["CONFIRM", "REJECT"]),
    amount: amountField.optional(),
    reason: optionalText(500, "Reason"),
  })
  .superRefine((d, ctx) => {
    if (d.decision === "REJECT" && !d.reason) {
      ctx.addIssue({ code: "custom", message: "Tell the member why the proof was rejected.", path: ["reason"] });
    }
  });

export const recordInPersonPaymentSchema = z.object({
  registrationId: UUID,
  amount: amountField,
  note: optionalText(500, "Note"),
});

export const recordAttendanceSchema = z.object({
  registrationId: UUID,
  status: z.enum(["UNMARKED", "ATTENDED", "NO_SHOW"]),
});

export const eventStatusSchema = z.object({
  eventId: UUID,
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "ARCHIVED"]),
  reason: optionalText(500, "Reason"),
});

export const invitationSchema = z.object({
  eventId: UUID,
  memberId: UUID,
  invited: z.boolean(),
});

export const deleteEventSchema = z.object({ eventId: UUID });

// ── Filters ──────────────────────────────────────────────────

export const eventFilterSchema = z.object({
  type: z.enum(EVENT_TYPES).optional(),
  cursor: z.string().min(1).optional(),
});

export type EventFilterInput = z.infer<typeof eventFilterSchema>;

export const participantFilterSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "WAITLISTED", "REJECTED", "CANCELLED"]).optional(),
});
