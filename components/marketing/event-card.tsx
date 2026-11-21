import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatDate } from "@/lib/utils";
import { isRemoteImage, resolveEventImage } from "@/lib/events/images";
import { eventTypeLabel, getEventDisplayState, getEventHref } from "@/lib/types/events";
import type { EventDetail, EventSummary } from "@/lib/types/events";

export type EventItem = EventDetail | EventSummary;

function placesLine(event: EventItem): { text: string; tone: "muted" | "low" | "full" } | null {
  if (event.max_participants == null) return null;
  const taken = "participant_count" in event ? event.participant_count : 0;
  const left = Math.max(0, event.max_participants - taken);
  if (left === 0) return { text: event.waitlist_enabled ? "Full · waitlist open" : "Fully booked", tone: "full" };
  return { text: `${left} of ${event.max_participants} places left`, tone: left <= 3 ? "low" : "muted" };
}

/**
 * Event "fight card": duotone frame with a slanted date stamp, then title,
 * place, seats and price. Status comes from the shared display state, so it
 * reads the same here as on the detail page and in the portals.
 */
export function EventCard({ event, href, priority }: { event: EventItem; href?: string; priority?: boolean }) {
  const isPrivate = "is_private" in event ? event.is_private : !event.is_public;
  const image = resolveEventImage({
    image_url: event.image_url,
    event_type: event.event_type,
    is_private_coaching: isPrivate && event.max_participants === 1,
  });
  const places = placesLine(event);
  const state = "spots_left" in event ? getEventDisplayState(event) : null;
  const price = event.is_free || !event.price_tnd ? "Free" : `${Number(event.price_tnd).toLocaleString("en-US", { maximumFractionDigits: 3 })} TND`;

  return (
    <Link
      href={href ?? getEventHref("public", event.id)}
      className="group lift flex h-full flex-col overflow-hidden rounded-lg border border-ink-border bg-ink-soft focus-visible:ring-2 focus-visible:ring-primary-ring"
    >
      <div className="zoom-img duotone relative aspect-[16/10] overflow-hidden">
        <Image
          src={image}
          alt=""
          fill
          priority={priority}
          unoptimized={isRemoteImage(image)}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute left-4 top-4 z-10 flex items-stretch text-white">
          <span className="tag-slant flex-col !items-start !gap-0 px-3.5 py-1.5 leading-none">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
              {formatDate(event.start_at, { month: "short" })}
            </span>
            <span className="font-display text-3xl font-bold">{formatDate(event.start_at, { day: "numeric" })}</span>
          </span>
        </div>
        <span className="absolute bottom-4 right-4 z-10 rounded-sm bg-ink/85 px-2.5 py-1 font-display text-sm font-semibold uppercase tracking-wide text-foreground backdrop-blur-sm">
          {price}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="type-overline text-[11px] text-muted">
            {eventTypeLabel[event.event_type] ?? event.event_type}
            <span className="text-muted-foreground"> · {formatDate(event.start_at, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
          </p>
          {state && state !== "open" ? <StatusBadge kind="display" status={state} /> : null}
        </div>
        <h3 className="flex items-start justify-between gap-3 font-display text-xl font-semibold uppercase leading-tight tracking-[0.01em] text-balance">
          <span className="line-clamp-2">{event.title}</span>
          <ArrowUpRight
            className="mt-1 h-5 w-5 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden
          />
        </h3>
        <div className="mt-auto flex flex-col gap-1.5 pt-1 text-sm text-muted">
          {event.location ? (
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
          {places ? (
            <span
              className={cn(
                "inline-flex items-center gap-2",
                places.tone === "full" ? "text-danger" : places.tone === "low" ? "text-warning" : undefined,
              )}
            >
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {places.text}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-ink-border bg-ink-soft">
      <div className="skeleton aspect-[16/10]" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-3 w-1/3 rounded-sm" />
        <div className="skeleton h-6 w-4/5 rounded-sm" />
        <div className="skeleton h-4 w-1/2 rounded-sm" />
      </div>
    </div>
  );
}
