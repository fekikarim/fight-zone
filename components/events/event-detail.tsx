import { CalendarDays, Clock, Lock, MapPin, Tag, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatDate } from "@/lib/utils";
import {
  MANUAL_PAYMENT_NOTICE,
  eventTypeLabel,
  getEventDisplayState,
  priceLabel,
  type EventDetail,
} from "@/lib/types/events";

interface EventDetailDisplayProps {
  event: EventDetail;
  /** Registration / payment panel, shown in the sticky ticket column. */
  action?: React.ReactNode;
  /** Show seat counts (public pages show availability, not member lists). */
  showParticipants?: boolean;
  /** Heading level for the title (one h1 per page). */
  titleAs?: "h1" | "h2";
  /** Hide the title when the page header already shows it. */
  showTitle?: boolean;
  /** Extra content under the ticket (host, notes). */
  asideExtra?: React.ReactNode;
}

function Fact({ icon: Icon, label, children }: { icon: typeof CalendarDays; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5 [&+&]:border-t [&+&]:border-ink-border">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <dt className="type-overline text-[10px] text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}

/**
 * Event detail shared by the public page, the member page and the admin
 * page: content on the left, a sticky "ticket" with the facts and the
 * registration action on the right (stacked on phones, ticket first).
 */
export function EventDetailDisplay({
  event,
  action,
  showParticipants = true,
  titleAs: Title = "h1",
  showTitle = true,
  asideExtra,
}: EventDetailDisplayProps) {
  const state = getEventDisplayState(event);
  const dateOpts = { weekday: "long", month: "long", day: "numeric", year: "numeric" } as const;
  const timeOpts = { hour: "numeric", minute: "2-digit" } as const;
  const availability =
    event.max_participants == null
      ? `${event.participant_count} registered · no limit`
      : event.spots_left === 0
        ? event.waitlist_enabled
          ? "Full — waitlist open"
          : "Full"
        : `${event.spots_left} of ${event.max_participants} places left`;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="display" status={state} />
          <Badge variant="neutral">{eventTypeLabel[event.event_type] ?? event.event_type}</Badge>
          <Badge variant="neutral">{event.event_format === "INDIVIDUAL" ? "Individual · 1 person" : "Group"}</Badge>
          {event.is_private ? (
            <Badge variant="neutral">
              <Lock className="h-3 w-3" aria-hidden /> Private
            </Badge>
          ) : null}
          {event.category ? <Badge variant="outline">{event.category}</Badge> : null}
        </div>
        {showTitle ? (
          <Title className="type-h1 break-words text-balance">{event.title}</Title>
        ) : null}
      </header>

      {state === "cancelled" ? (
        <p role="status" className="rounded-md border border-danger/35 bg-danger-soft px-5 py-4 text-sm text-red-100">
          <strong className="font-semibold">This event has been cancelled.</strong>
          {event.cancellation_reason ? ` ${event.cancellation_reason}` : ""}
        </p>
      ) : null}

      <div className={cn("grid gap-8", action || asideExtra ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-12" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]")}>
        {/* Ticket column — first on phones so the action is reachable */}
        <aside className="flex flex-col gap-4 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-lg border border-ink-border bg-ink-soft">
            <div className="flex items-center justify-between gap-3 border-b border-ink-border bg-ink-softer px-5 py-4">
              <span className="type-overline text-[10px] text-muted">Entry</span>
              <span className="font-display text-2xl font-bold uppercase leading-none">{priceLabel(event)}</span>
            </div>
            <dl className="px-5 py-1">
              <Fact icon={CalendarDays} label="Date">{formatDate(event.start_at, dateOpts)}</Fact>
              <Fact icon={Clock} label="Time">
                {formatDate(event.start_at, timeOpts)}
                {event.end_at ? ` – ${formatDate(event.end_at, timeOpts)}` : ""}
              </Fact>
              {event.location ? <Fact icon={MapPin} label="Location">{event.location}</Fact> : null}
              {showParticipants ? <Fact icon={Users} label="Places">{availability}</Fact> : null}
              {event.registration_closes_at && state !== "completed" && state !== "cancelled" ? (
                <Fact icon={Clock} label="Registration closes">
                  {formatDate(event.registration_closes_at, { ...dateOpts, ...timeOpts })}
                </Fact>
              ) : null}
              {!event.is_free ? <Fact icon={Wallet} label="Payment">{MANUAL_PAYMENT_NOTICE}</Fact> : null}
            </dl>
            {action ? <div className="border-t border-ink-border p-5">{action}</div> : null}
          </div>
          {asideExtra}
        </aside>

        <div className="flex min-w-0 flex-col gap-8 lg:order-1">
          {event.description ? (
            <section aria-label="About this event">
              <p className="type-overline mb-3 flex items-center gap-2.5 text-muted">
                <span className="slant-bar h-1 w-4" aria-hidden />
                About this event
              </p>
              <div className="whitespace-pre-line break-words text-base leading-relaxed text-foreground/85 text-pretty sm:text-lg">
                {event.description}
              </div>
            </section>
          ) : (
            <p className="text-sm text-muted">Coach Seif will share the details of this event closer to the date.</p>
          )}

          {event.requirements ? (
            <section className="border-l-2 border-primary pl-5">
              <h2 className="type-overline text-muted">What to bring</h2>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">{event.requirements}</p>
            </section>
          ) : null}

          {event.tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
              {event.tags.map((t) => (
                <li key={t} className="inline-flex items-center gap-1 rounded-sm border border-ink-border px-2.5 py-1 text-xs text-muted">
                  <Tag className="h-3 w-3" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
