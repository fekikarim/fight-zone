import Image from "next/image";
import { CalendarDays, Clock, Lock, MapPin, MessageCircle, Tag, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatDate, requestTime } from "@/lib/utils";
import { isRemoteImage, resolveEventImage } from "@/lib/events/images";
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
  /** Cover image with the date stamp (off where the page has its own banner). */
  showCover?: boolean;
}

const TZ = "Africa/Tunis";
const dayKey = (t: number | string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(t));

/** "Today" / "Tomorrow" / "In 5 days" / "Started" — in gym (Tunis) days. */
function countdown(startAt: string, endAt: string | null, now: number): string | null {
  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : start + 2 * 3_600_000;
  if (now > end) return null;
  if (now >= start) return "Happening now";
  const days = Math.round((Date.parse(dayKey(start)) - Date.parse(dayKey(now))) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
}

function duration(startAt: string, endAt: string | null): string | null {
  if (!endAt) return null;
  const mins = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/** One "at a glance" tile. */
function Tile({ icon: Icon, label, children, sub, className }: {
  icon: typeof CalendarDays; label: string; children: React.ReactNode; sub?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 rounded-2xl border border-white/[0.06] bg-ink-soft p-4 sm:p-5", className)}>
      <span className="flex items-center gap-2 type-overline text-[10px] text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-primary-readable">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        {label}
      </span>
      <dd className="break-words font-display text-xl font-semibold uppercase leading-tight tracking-tight sm:text-[22px]">{children}</dd>
      {sub ? <div className="text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="type-overline mb-3 flex items-center gap-2.5 text-muted">
      <span className="slant-bar h-1 w-4" aria-hidden />
      {children}
    </h2>
  );
}

/**
 * Event detail shared by the public page, the member page and the admin page.
 * Desktop: cover + "at a glance" tiles + details on the left, a sticky ticket
 * (price, summary, registration) on the right. Phones: cover, ticket, details.
 */
export function EventDetailDisplay({
  event,
  action,
  showParticipants = true,
  titleAs: Title = "h1",
  showTitle = true,
  asideExtra,
  showCover = true,
}: EventDetailDisplayProps) {
  const state = getEventDisplayState(event);
  const now = requestTime();
  const timeOpts = { hour: "numeric", minute: "2-digit" } as const;
  const image = resolveEventImage({ image_url: event.image_url, event_type: event.event_type, is_private_coaching: event.is_private_coaching });
  const soon = state === "cancelled" ? null : countdown(event.start_at, event.end_at, now);
  const length = duration(event.start_at, event.end_at);
  const capped = event.max_participants != null && event.max_participants > 0;
  const fill = capped ? Math.min(100, Math.round((event.participant_count / event.max_participants!) * 100)) : 0;
  const availability =
    event.max_participants == null
      ? `${event.participant_count} going`
      : event.spots_left === 0
        ? event.waitlist_enabled ? "Full · waitlist" : "Full"
        : `${event.spots_left} left`;
  const timeRange = `${formatDate(event.start_at, timeOpts)}${event.end_at ? ` – ${formatDate(event.end_at, timeOpts)}` : ""}`;

  const cover = (
    <div className="duotone relative aspect-[16/9] overflow-hidden rounded-3xl border border-white/[0.06] sm:aspect-[21/9]">
      <Image src={image} alt="" fill priority sizes="(min-width: 1024px) 760px, 100vw" unoptimized={isRemoteImage(image)} className="object-cover" />
      <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" aria-hidden />
      <span className="absolute inset-0 bg-gradient-to-r from-ink/70 to-transparent" aria-hidden />
      {/* date stamp */}
      <div className="absolute bottom-4 left-4 flex items-end gap-4 sm:bottom-6 sm:left-6">
        <div className="flex flex-col items-center rounded-2xl bg-primary px-3.5 pb-2 pt-2.5 leading-none text-white shadow-[var(--shadow-hit)] sm:px-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{formatDate(event.start_at, { month: "short" })}</span>
          <span className="font-display text-4xl font-bold sm:text-5xl">{formatDate(event.start_at, { day: "numeric" })}</span>
        </div>
        <div className="flex flex-col gap-1 pb-1 text-white">
          <span className="font-display text-lg font-semibold uppercase leading-none tracking-wide sm:text-2xl">
            {formatDate(event.start_at, { weekday: "long" })}
          </span>
          <span className="text-sm text-white/75 tabular">{timeRange}</span>
        </div>
      </div>
      {soon ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-ink/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md sm:right-6 sm:top-6">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
          {soon}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
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
        <p role="status" className="rounded-2xl border border-danger/35 bg-danger-soft px-5 py-4 text-sm text-red-100">
          <strong className="font-semibold">This event has been cancelled.</strong>
          {event.cancellation_reason ? ` ${event.cancellation_reason}` : ""}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-x-10 lg:gap-y-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* 1 · cover + glance (top-left) */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          {showCover ? cover : null}
          <dl className={cn("grid gap-3", showParticipants ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2 xl:grid-cols-3")}>
            <Tile icon={CalendarDays} label="Date" sub={`${formatDate(event.start_at, { weekday: "long" })} · ${formatDate(event.start_at, { year: "numeric" })}`}>
              {formatDate(event.start_at, { day: "numeric", month: "short" })}
            </Tile>
            <Tile icon={Clock} label="Time" sub={length ?? "Tunis time"}>
              <span className="tabular">{formatDate(event.start_at, timeOpts)}</span>
            </Tile>
            {showParticipants ? (
              <Tile
                icon={Users}
                label="Places"
                sub={
                  capped ? (
                    <span className="flex flex-col gap-1.5">
                      <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
                        <span className={cn("block h-full rounded-full", fill >= 100 ? "bg-warning" : "bg-primary")} style={{ width: `${Math.max(fill, 4)}%` }} />
                      </span>
                      {event.participant_count} of {event.max_participants} taken
                    </span>
                  ) : "No limit"
                }
              >
                {availability}
              </Tile>
            ) : null}
            <Tile icon={MapPin} label="Where" className={cn(!showParticipants && "col-span-2 xl:col-span-1")}>
              <span className="normal-case">{event.location ?? "Fight Zone gym"}</span>
            </Tile>
          </dl>
        </div>

        {/* 2 · ticket (right, sticky) */}
        <aside className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-soft shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
            <div className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-br from-primary/20 via-ink-softer to-ink-softer px-5 py-5 sm:px-6">
              <span className="type-overline text-[10px] text-muted">Entry</span>
              <p className="mt-1 font-display text-4xl font-bold uppercase leading-none">{priceLabel(event)}</p>
              <p className="mt-2 text-xs text-muted">
                {formatDate(event.start_at, { weekday: "short", day: "numeric", month: "short" })} · {timeRange}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </div>
            {event.registration_closes_at && state !== "completed" && state !== "cancelled" ? (
              <p className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3 text-xs text-muted sm:px-6">
                <Clock className="h-3.5 w-3.5 shrink-0 text-primary-readable" aria-hidden />
                Registration closes {formatDate(event.registration_closes_at, { weekday: "short", day: "numeric", month: "short", ...timeOpts })}
              </p>
            ) : null}
            {action ? <div className="@container p-5 sm:p-6">{action}</div> : null}
          </div>
          {asideExtra}
        </aside>

        {/* 3 · details (left, under the glance) */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
          <section aria-label="About this event" className="rounded-3xl border border-white/[0.06] bg-ink-soft/60 p-5 sm:p-7">
            <SectionTitle>About this event</SectionTitle>
            {event.description ? (
              <div className="whitespace-pre-line break-words text-base leading-relaxed text-foreground/85 text-pretty sm:text-lg">
                {event.description}
              </div>
            ) : (
              <div className="flex items-start gap-3 text-sm text-muted">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-readable" aria-hidden />
                <p>Coach Seif will share the details of this event closer to the date. Questions before then? Message him any time.</p>
              </div>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {event.requirements ? (
              <section className="rounded-3xl border border-white/[0.06] bg-ink-soft/60 p-5 sm:p-6">
                <SectionTitle>What to bring</SectionTitle>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/85">{event.requirements}</p>
              </section>
            ) : null}
            {!event.is_free ? (
              <section className={cn("rounded-3xl border border-white/[0.06] bg-ink-soft/60 p-5 sm:p-6", !event.requirements && "md:col-span-2")}>
                <SectionTitle>How payment works</SectionTitle>
                <p className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary-readable" aria-hidden />
                  {MANUAL_PAYMENT_NOTICE}
                </p>
              </section>
            ) : null}
          </div>

          {event.tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
              {event.tags.map((t) => (
                <li key={t} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-muted">
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
