import Link from "next/link";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { resolveEventImage } from "@/lib/events/images";
import { eventTypeLabel, getEventHref } from "@/lib/types/events";
import type { EventDetail, EventSummary } from "@/lib/types/events";

export type EventItem = EventDetail | EventSummary;

export function EventCard({ event }: { event: EventItem }) {
  const isPrivateCoaching =
    "is_private_coaching" in event
      ? event.is_private_coaching
      : !event.is_public && event.max_participants === 1;

  const image = resolveEventImage({
    image_url: event.image_url,
    event_type: event.event_type,
    is_private_coaching: isPrivateCoaching,
  });

  const participantCount = "participant_count" in event ? event.participant_count : 0;
  const spotsLeft =
    event.max_participants != null
      ? Math.max(0, event.max_participants - participantCount)
      : null;
  const isLow = spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 3;
  const isFull = spotsLeft !== null && spotsLeft === 0;

  return (
    <Link href={getEventHref("public", event.id)} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
        <div className="relative aspect-[16/10] bg-ink-softer">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${image})` }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent"
            aria-hidden
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
            <Badge className="backdrop-blur-sm">
              {eventTypeLabel[event.event_type] ?? event.event_type}
            </Badge>
            <Badge
              variant={event.is_free ? "neutral" : "solid"}
              className="backdrop-blur-sm"
            >
              {event.is_free ? "Free" : `${event.price_tnd ?? 0} TND`}
            </Badge>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col gap-3 p-5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(event.start_at, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>

          <CardTitle className="line-clamp-2 text-lg">{event.title}</CardTitle>

          {event.description ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted">
              {event.description}
            </p>
          ) : null}

          <div className="mt-auto flex flex-col gap-2 pt-2 text-sm text-muted">
            {event.end_at ? (
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Ends {formatDate(event.end_at, { hour: "numeric", minute: "2-digit" })}
              </span>
            ) : null}
            {event.location ? (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {event.location}
              </span>
            ) : null}
            {spotsLeft !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-2",
                  isFull ? "text-destructive" : isLow ? "text-amber-300" : "text-muted",
                )}
              >
                <Users className="h-4 w-4 text-primary" />
                {isFull
                  ? "Fully booked"
                  : `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}