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
      (v) => v === true || v === "true" || v === "1",
      z.boolean().default(false),
    )
    .optional(),
  cursor: z.string().min(1).optional(),
});

/** Filter chips: the `?filter=` URL value → query filters. */
export const NOTIFICATION_FILTERS = [
  { value: "", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "EVENT", label: "Events" },
  { value: "MESSAGE", label: "Messages" },
  { value: "SYSTEM", label: "System" },
] as const;

export function parseNotificationFilter(filter: string | undefined) {
  if (filter === "unread") return { unreadOnly: true as const };
  const parsed = notificationFilterSchema.shape.type.safeParse(filter);
  return parsed.success && parsed.data ? { type: parsed.data } : {};
}

export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>;
