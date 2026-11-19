import { CalendarDays, Clock, Lock, MapPin, Tag, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  MANUAL_PAYMENT_NOTICE,
  eventDisplayStateLabel,
  eventTypeLabel,
  getEventDisplayState,
  priceLabel,
  type EventDetail,
  type EventDisplayState,
} from "@/lib/types/events";

interface EventDetailDisplayProps {
  event: EventDetail;
  /** Registration / payment panel. */
  action?: React.ReactNode;
  /** Show seat counts (public pages show availability, not member lists). */
  showParticipants?: boolean;
}

const stateVariant: Record<EventDisplayState, "default" | "outline" | "solid" | "neutral"> = {
  draft: "neutral",
  cancelled: "outline",
  archived: "neutral",
  completed: "neutral",
  in_progress: "solid",
  full: "outline",
  registration_not_open: "neutral",
  registration_closed: "outline",
  open: "default",
};

export function EventDetailDisplay({ event, action, showParticipants = true }: EventDetailDisplayProps) {
  const state = getEventDisplayState(event);
  const dateOpts = { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" } as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={stateVariant[state]}>{eventDisplayStateLabel[state]}</Badge>
        <Badge variant="neutral">{eventTypeLabel[event.event_type] ?? event.event_type}</Badge>
        <Badge variant="neutral">{event.event_format === "INDIVIDUAL" ? "Individual (1 person)" : "Group"}</Badge>
        {event.is_private ? (
          <Badge variant="neutral" className="gap-1">
            <Lock className="h-3 w-3" aria-hidden /> Private
          </Badge>
        ) : null}
        <Badge variant={event.is_free ? "neutral" : "outline"}>{priceLabel(event)}</Badge>
        {event.category ? <Badge variant="neutral">{event.category}</Badge> : null}
      </div>

      <h1 className="font-display text-3xl font-bold uppercase tracking-tight break-words sm:text-4xl">{event.title}</h1>

      {state === "cancelled" ? (
        <p role="status" className="rounded-xl border border-primary/40 bg-primary-soft px-5 py-4 text-sm">
          This event has been cancelled.{event.cancellation_reason ? ` ${event.cancellation_reason}` : ""}
        </p>
      ) : null}

      <dl className="grid gap-3 text-sm text-muted sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div>
            <dt className="sr-only">Starts</dt>
            <dd>{formatDate(event.start_at, dateOpts)}</dd>
          </div>
        </div>
        {event.end_at ? (
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <dt className="sr-only">Ends</dt>
              <dd>Ends {formatDate(event.end_at, { hour: "numeric", minute: "2-digit" })}</dd>
            </div>
          </div>
        ) : null}
        {event.location ? (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <dt className="sr-only">Location</dt>
              <dd className="break-words">{event.location}</dd>
            </div>
          </div>
        ) : null}
        {showParticipants ? (
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <dt className="sr-only">Availability</dt>
              <dd>
                {event.max_participants == null
                  ? `${event.participant_count} registered`
                  : event.spots_left === 0
                    ? event.waitlist_enabled
                      ? "Full — waitlist open"
                      : "Full"
                    : `${event.spots_left} of ${event.max_participants} places left`}
              </dd>
            </div>
          </div>
        ) : null}
        {event.registration_closes_at && state !== "completed" && state !== "cancelled" ? (
          <div className="flex items-start gap-2 sm:col-span-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <dt className="sr-only">Registration deadline</dt>
              <dd>Registration closes {formatDate(event.registration_closes_at, dateOpts)}</dd>
            </div>
          </div>
        ) : null}
      </dl>

      {event.description ? (
        <div className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">{event.description}</div>
      ) : null}

      {event.requirements ? (
        <section className="rounded-xl border border-ink-border bg-ink-soft/40 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">What to bring / requirements</h2>
          <p className="mt-2 whitespace-pre-line break-words text-sm text-foreground/85">{event.requirements}</p>
        </section>
      ) : null}

      {event.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {event.tags.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 rounded-full border border-ink-border px-2.5 py-0.5 text-xs text-muted">
              <Tag className="h-3 w-3" aria-hidden /> {t}
            </li>
          ))}
        </ul>
      ) : null}

      {!event.is_free ? (
        <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-5 py-4 text-sm text-muted">{MANUAL_PAYMENT_NOTICE}</p>
      ) : null}

      {action ? <div>{action}</div> : null}
    </div>
  );
}
