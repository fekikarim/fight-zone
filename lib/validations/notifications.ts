import { z } from "zod";

/**
 * Notification validation schemas.  Server actions are the only trust
 * boundary: every id is validated as a UUID before reaching the database.
 * Ownership is always derived from the session — never from form input.
 */

export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid("Invalid notification."),
});

export const notificationFilterSchema = z.object({
  type: z
    .enum(["BOOKING", "SESSION", "EVENT", "MESSAGE", "SYSTEM"])
    .optional(),
  unreadOnly: z
    .preprocess(
      (v) => v === "true" || v === "1",
      z.boolean().default(false),
    )
    .optional(),
  cursor: z.string().min(1).optional(),
});

export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>;
