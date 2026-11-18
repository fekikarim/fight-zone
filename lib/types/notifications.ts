/**
 * Shared notification shapes. Pure types only — safe to import from server
 * queries, server actions, and client components alike.
 */

export type NotificationType =
  | "BOOKING"
  | "SESSION"
  | "EVENT"
  | "MESSAGE"
  | "SYSTEM";

export interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  content: string | null;
  is_read: boolean;
  created_at: string;
  resource_type: string | null;
  resource_id: string | null;
}

export interface NotificationPage {
  items: NotificationRow[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Resolve the deep-link path for a notification's resource. */
export function getResourceHref(
  role: "member" | "staff",
  resourceType: string | null,
  resourceId: string | null,
): string | null {
  if (!resourceType || !resourceId) return null;
  const base = role === "member" ? "/member" : "/admin";
  switch (resourceType) {
    case "event":
      return `${base}/events/${resourceId}`;
    case "conversation":
      return `${base}/messages/${resourceId}`;
    // Bookings/sessions have no detail pages any more.
    default:
      return null;
  }
}

/** Action label for the contextual link. */
export function getResourceLabel(resourceType: string | null): string {
  switch (resourceType) {
    case "event":
      return "View event";
    case "conversation":
      return "Open conversation";
    default:
      return "View";
  }
}
