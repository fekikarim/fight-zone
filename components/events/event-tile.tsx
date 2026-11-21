import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Lock, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { isRemoteImage, resolveEventImage } from "@/lib/events/images";
import { eventTypeLabel, priceLabel, type EventDetail } from "@/lib/types/events";

interface EventTileProps {
  event: EventDetail;
  href: string;
  /** Status badges (registration, payment, event state…). */
  badges?: ReactNode;
  /** Extra line under the badges (e.g. capacity bar for the coach). */
  footer?: ReactNode;
}

/**
 * App list card for an event: duotone art with the date stamped on it,
 * title, time/place/price, then status. Used by member and coach lists.
 */
export function EventTile({ event, href, badges, footer }: EventTileProps) {
  const image = resolveEventImage({ image_url: event.image_url, event_type: event.event_type, is_private_coaching: false });
  return (
    <Link
      href={href}
      className="group flex items-stretch gap-4 rounded-3xl border border-white/[0.06] bg-ink-soft p-2.5 pr-4 transition-[transform,border-color,background-color] duration-200 hover:border-white/15 hover:bg-ink-softer active:scale-[0.99]"
    >
      <span className="zoom-img duotone relative w-24 shrink-0 overflow-hidden rounded-2xl sm:w-28">
        <Image src={image} alt="" fill sizes="112px" unoptimized={isRemoteImage(image)} className="object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" aria-hidden />
        <span className="absolute inset-x-0 bottom-2 flex flex-col items-center leading-none text-white">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{formatDate(event.start_at, { month: "short" })}</span>
          <span className="font-display text-3xl font-bold">{formatDate(event.start_at, { day: "numeric" })}</span>
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1.5">
        <span className="type-overline text-[10px] text-muted">
          {eventTypeLabel[event.event_type] ?? "Event"} · {formatDate(event.start_at, { weekday: "short", hour: "numeric", minute: "2-digit" })}
        </span>
        <span className="flex items-center gap-1.5 font-display text-lg font-semibold uppercase leading-tight sm:text-xl">
          {event.is_private ? <Lock className="h-4 w-4 shrink-0 text-muted" aria-label="Private" /> : null}
          <span className="line-clamp-2">{event.title}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          {event.location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
          <span>{priceLabel(event)}</span>
        </span>
        {badges ? <span className="flex flex-wrap gap-1.5 pt-1">{badges}</span> : null}
        {footer}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
