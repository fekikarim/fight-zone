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

/** Type-specific fallback artwork (rendered in the duotone treatment). */
const TYPE_ARTWORK: Partial<Record<EventType, string>> = {
  TRAINING: "/components/event/strength-default.jpg",
  COMPETITION: "/components/boxing-trophy-graphic-design-900x900.jpg",
  WORKSHOP: "/components/event/gym-hero-4.jpg",
};

/** Resolve the display image path for an event. */
export function resolveEventImage(opts: {
  image_url: string | null;
  event_type: EventType;
  is_private_coaching: boolean;
}): string {
  if (opts.image_url) return opts.image_url;
  return TYPE_ARTWORK[opts.event_type] ?? DEFAULT_EVENT_IMAGE;
}

/** Remote (uploaded) images skip the optimizer so any storage host works. */
export function isRemoteImage(src: string): boolean {
  return /^https?:\/\//.test(src);
}
