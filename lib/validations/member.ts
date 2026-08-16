import { z } from "zod";

/**
 * Member-platform validation schemas. Server actions are the only trust
 * boundary: every field is trimmed, sized, and typed before it reaches the
 * database. Optional text/number inputs treat empty strings as NULL rather
 * than storing meaningless empty values.
 */

/** Optional text field; empty strings normalize to null. */
function optionalText(max: number, message: string) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max, message).nullish(),
  );
}

/** Optional numeric field; empty strings normalize to null. */
function optionalNumber(max: number, message: string) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim() === "") return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    },
    z
      .number({ message })
      .positive(message)
      .max(max, message)
      .nullish(),
  );
}

export const genderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);
export const skillLevelSchema = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "PROFESSIONAL",
]);

export const memberProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(120, "Name is too long."),
  phone: optionalText(20, "Phone number is too long."),
  dateOfBirth: optionalText(10, "Please enter a valid date.")
    .refine(
      (value) => {
        if (!value) return true;
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return false;
        return date.getTime() < Date.now() && date.getFullYear() >= 1900;
      },
      { message: "Please enter a valid past date." },
    )
    .transform((value) => value ?? null),
  gender: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    genderSchema.nullish(),
  ),
  address: optionalText(300, "Address is too long."),
  skillLevel: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    skillLevelSchema.nullish(),
  ),
  weight: optionalNumber(400, "Weight must be a number between 0 and 400 kg."),
  height: optionalNumber(250, "Height must be a number between 0 and 250 cm."),
  bio: optionalText(1000, "Bio is too long."),
});

export const bookingSchema = z.object({
  sessionId: z.string().uuid("Please choose a valid session."),
  scheduledAt: z
    .string()
    .trim()
    .min(1, "Please choose a date and time.")
    .refine(
      (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return false;
        const now = Date.now();
        return (
          date.getTime() > now && date.getTime() < now + 180 * 24 * 60 * 60 * 1000
        );
      },
      { message: "Please choose a future time within the next 6 months." },
    ),
  notes: optionalText(500, "Notes are too long."),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid("Please choose a valid booking."),
});

export type MemberProfileInput = z.infer<typeof memberProfileSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

/**
 * Form-facing values (what the DOM actually submits). These differ from the
 * inferred output types because optional fields are preprocessed to NULL —
 * forms keep the raw strings and normalize them via `String(value ?? "")`.
 */
export type MemberProfileFormValues = z.input<typeof memberProfileSchema>;
export type BookingFormValues = z.input<typeof bookingSchema>;
