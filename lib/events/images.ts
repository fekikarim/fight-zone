/**
 * Event imagery resolution.
 *
 * An event may carry a custom `image_url` (uploaded through the admin
 * forms to Supabase Storage). When it does not, the shared default event
 * artwork under /public/assets is used — the admin forms state this
 * explicitly, so "no image" always renders identically everywhere.
 */

import type { EventType } from "@/lib/types/events";

/** Shown when the event has no custom image. */
export const DEFAULT_EVENT_IMAGE = "/assets/default_event.jpg";

/** Resolve the display image path for an event. */
export function resolveEventImage(opts: {
  image_url: string | null;
  event_type: EventType;
  is_private_coaching: boolean;
}): string {
  if (opts.image_url) return opts.image_url;
  return DEFAULT_EVENT_IMAGE;
}
