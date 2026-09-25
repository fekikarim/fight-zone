import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { eventTypeLabel, getEventLifecycleStatus, CASH_PAYMENT_NOTICE } from "@/lib/types/events";
import type { EventDetail } from "@/lib/types/events";

interface EventDetailDisplayProps {
  event: EventDetail;
  /** Optional action slot (e.g. register button) */
  action?: React.ReactNode;
  /** Show participant count */
  showParticipants?: boolean;
}

const lifecycleLabel: Record<string, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  past: "Past",
};

const lifecycleVariant: Record<string, "default" | "outline" | "solid" | "neutral"> = {
  draft: "neutral",
  upcoming: "default",
  ongoing: "solid",
  past: "outline",
};

export function EventDetailDisplay({
  event,
  action,
  showParticipants = true,
}: EventDetailDisplayProps) {
  const lifecycle = getEventLifecycleStatus(event.is_public, event.start_at, event.end_at);
  const spotsLeft =
    event.max_participants != null
      ? Math.max(0, event.max_participants - event.participant_count)
      : null;
  const isFull = spotsLeft !== null && spotsLeft === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{eventTypeLabel[event.event_type] ?? event.event_type}</Badge>
        <Badge variant="neutral">
          {event.event_format === "INDIVIDUAL" ? "Individual" : "Collective"}
        </Badge>
        <Badge variant={lifecycleVariant[lifecycle]}>{lifecycleLabel[lifecycle]}</Badge>
        {!event.is_free ? (
          <Badge variant="outline">
            {event.price_tnd ?? 0} TND · Paid event
          </Badge>
        ) : null}
        {isFull ? <Badge variant="outline">Fully booked</Badge> : null}
      </div>

      <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
        {event.title}
      </h1>

      <div className="flex flex-col gap-3 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          {formatDate(event.start_at, {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
        {event.end_at ? (
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" aria-hidden />
            Ends{" "}
            {formatDate(event.end_at, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        ) : null}
        {event.location ? (
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            {event.location}
          </span>
        ) : null}
        {showParticipants ? (
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            {event.participant_count} registered
            {spotsLeft != null ? ` · ${spotsLeft} spots left` : ""}
          </span>
        ) : null}
      </div>

      {event.description ? (
        <div className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground/80">
          {event.description}
        </div>
      ) : null}

      {!event.is_free ? (
        <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-5 py-4 text-sm text-muted">
          {CASH_PAYMENT_NOTICE}
        </p>
      ) : null}

      {action ? <div>{action}</div> : null}
    </div>
  );
}
