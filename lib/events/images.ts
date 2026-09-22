/**
 * Event imagery resolution.
 *
 * An event may carry a custom `image_url` (an uploaded public path). When it
 * does not, we derive a strong discipline-appropriate default from the event
 * type (and private-coaching state) using the static assets under
 * /public/components/event/. All paths are local public assets so Next.js
 * Image Optimization applies and no external host is required.
 */

import type { EventType } from "@/lib/types/events";

const EVENT_DEFAULTS: Record<string, string> = {
  COMPETITION: "/components/event/competition.svg",
  TRAINING: "/components/event/gym-hero-1.jpg",
  WORKSHOP: "/components/event/gym-hero-3.jpg",
  SEMINAR: "/components/event/fitness-default.svg",
  OTHER: "/components/event/gym-hero-2.jpg",
};

export const PRIVATE_COACHING_IMAGE = "/components/event/strength-default.jpg";

/** Resolve the display image path for an event. */
export function resolveEventImage(opts: {
  image_url: string | null;
  event_type: EventType;
  is_private_coaching: boolean;
}): string {
  if (opts.image_url) return opts.image_url;
  if (opts.is_private_coaching) return PRIVATE_COACHING_IMAGE;
  return EVENT_DEFAULTS[opts.event_type] ?? EVENT_DEFAULTS.OTHER;
}
