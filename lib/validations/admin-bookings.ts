import { z } from "zod";

/**
 * Admin booking-management validation. Server actions are the only trust
 * boundary — the `bookingId` and requested `action` are the only values taken
 * from the browser. Status, ownership, and every business rule are derived
 * from the authenticated session and the database.
 */

export const bookingActionSchema = z.enum(["confirm", "cancel", "complete", "no_show"]);

export const updateBookingStatusSchema = z.object({
  bookingId: z.string().uuid("Please choose a valid booking."),
  action: bookingActionSchema,
});

export type BookingAction = z.infer<typeof bookingActionSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
