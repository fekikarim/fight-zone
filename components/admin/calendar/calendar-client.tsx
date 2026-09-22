"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  toDateKey,
  buildMonthGrid,
  addDays,
  startOfWeek,
  parseDateKey,
  startOfDay,
} from "@/lib/calendar";
import { eventTypeLabel, getEventLifecycleStatus } from "@/lib/types/events";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventDetail } from "@/lib/types/events";

export type CalendarView = "month" | "week" | "agenda";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "agenda", label: "Day" },
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarClientProps {
  view: CalendarView;
  dateKey: string;
  rangeLabel: string;
  events: EventDetail[];
  getEventHref: (role: "staff", eventId: string) => string;
}

export function CalendarClient({
  view,
  dateKey,
  rangeLabel,
  events,
  getEventHref,
}: CalendarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);

  const anchor = useMemo(() => parseDateKey(dateKey) ?? new Date(), [dateKey]);

  // Group events by local day key.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventDetail[]>();
    for (const event of events) {
      const key = toDateKey(new Date(event.start_at));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_at.localeCompare(b.start_at));
    }
    return map;
  }, [events]);

  const navigate = useCallback(
    (to: { view?: CalendarView; date?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (to.view) params.set("view", to.view);
      if (to.date) params.set("date", to.date);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const shift = useCallback(
    (amount: number, forView: CalendarView) => {
      const base = parseDateKey(dateKey) ?? new Date();
      let next: Date;
      if (forView === "month") {
        next = new Date(base.getFullYear(), base.getMonth() + amount, 1);
      } else if (forView === "week") {
        next = addDays(startOfWeek(base), amount * 7);
      } else {
        next = addDays(startOfDay(base), amount);
      }
      navigate({ date: toDateKey(next) });
    },
    [dateKey, navigate],
  );

  const goToday = useCallback(() => {
    navigate({ date: toDateKey(new Date()) });
  }, [navigate]);

  // Realtime sync: refresh server data when events or participants change.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-calendar")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_participants" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="flex flex-col gap-6 px-6 py-6 sm:px-8">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted">Plan and track events across your schedule.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous"
            onClick={() => shift(-1, view)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next"
            onClick={() => shift(1, view)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-lg font-semibold">{rangeLabel}</p>
        <div className="flex rounded-lg border border-ink-border p-0.5" role="tablist">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={view === option.value}
              onClick={() => navigate({ view: option.value })}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                view === option.value
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      <div className={view === "agenda" ? "block" : "hidden sm:block"}>
        {view === "month" && (
          <MonthView eventsByDay={eventsByDay} anchor={anchor} onSelect={setSelectedEvent} />
        )}
        {view === "week" && <WeekView eventsByDay={eventsByDay} anchor={anchor} onSelect={setSelectedEvent} />}
        {view === "agenda" && <AgendaView events={events} onSelect={setSelectedEvent} />}
      </div>

      {/* Mobile progressive disclosure: month/week collapse to a list view */}
      <div className="sm:hidden">
        <AgendaView events={events} onSelect={setSelectedEvent} compact />
      </div>

      {selectedEvent && (
        <EventDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} getEventHref={getEventHref} />
      )}
    </div>
  );
}

interface DayMap {
  eventsByDay: Map<string, EventDetail[]>;
  anchor: Date;
  onSelect: (event: EventDetail) => void;
}

function MonthView({ eventsByDay, anchor, onSelect }: DayMap) {
  const today = new Date();
  const grid = buildMonthGrid(anchor, today);
  return (
    <div className="overflow-hidden rounded-xl border border-ink-border">
      <div className="grid grid-cols-7 border-b border-ink-border bg-ink-soft/40">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day) => {
          const dayEvents = eventsByDay.get(day.key) ?? [];
          return (
            <div
              key={day.key}
              className={`min-h-[88px] border-b border-r border-ink-border p-1.5 ${
                day.inMonth ? "bg-background" : "bg-ink-soft/30"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    day.isToday
                      ? "bg-primary font-semibold text-white"
                      : day.inMonth
                        ? "text-foreground"
                        : "text-muted"
                  }`}
                >
                  {day.date.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelect(event)}
                    className={`block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-80 ${
                      event.is_public
                        ? "bg-primary-soft text-primary"
                        : "bg-ink-soft text-foreground"
                    }`}
                  >
                    {formatDate(event.start_at, { hour: "numeric", minute: "2-digit" })} {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[11px] text-muted">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ eventsByDay, anchor, onSelect }: DayMap) {
  const today = new Date();
  const weekStart = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="overflow-hidden rounded-xl border border-ink-border">
      <div className="grid grid-cols-1 gap-px bg-ink-border sm:grid-cols-7">
        {days.map((day) => {
          const key = toDateKey(day);
          const isToday = key === toDateKey(today);
          const dayEvents = eventsByDay.get(key) ?? [];
          return (
            <div key={key} className="bg-background p-2">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-medium uppercase text-muted">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-primary font-semibold text-white" : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1.5">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelect(event)}
                    className="w-full rounded-md border border-ink-border px-2 py-1.5 text-left transition-colors hover:bg-ink-soft/40"
                  >
                    <p className="truncate text-xs font-medium">{event.title}</p>
                    <p className="text-[11px] text-muted">
                      {formatDate(event.start_at, { hour: "numeric", minute: "2-digit" })} ·{" "}
                      {eventTypeLabel[event.event_type]}
                    </p>
                  </button>
                ))}
                {dayEvents.length === 0 && <p className="text-[11px] text-muted">No events</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AgendaProps {
  events: EventDetail[];
  onSelect: (event: EventDetail) => void;
  compact?: boolean;
}

function AgendaView({ events, onSelect, compact }: AgendaProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-12 text-center">
        <CalendarDays className="h-8 w-8 text-primary" />
        <p className="text-muted">No events on this day.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          onClick={() => onSelect(event)}
          className={`flex w-full items-start gap-3 rounded-xl border border-ink-border p-3 text-left transition-colors hover:bg-ink-soft/40 ${
            compact ? "sm:hidden" : ""
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-soft text-primary">
            <span className="text-sm font-bold leading-none">{formatDate(event.start_at, { day: "numeric" })}</span>
            <span className="text-[10px] uppercase leading-tight">{formatDate(event.start_at, { month: "short" })}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{event.title}</p>
            <p className="text-xs text-muted">
              {eventTypeLabel[event.event_type]} ·{" "}
              {formatDate(event.start_at, { hour: "numeric", minute: "2-digit" })}
              {event.end_at ? ` – ${formatDate(event.end_at, { hour: "numeric", minute: "2-digit" })}` : ""}
            </p>
            {event.location && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <MapPin className="h-3 w-3" />
                {event.location}
              </p>
            )}
          </div>
          <AvailabilityBadge event={event} />
        </button>
      ))}
    </div>
  );
}

function AvailabilityBadge({ event }: { event: EventDetail }) {
  const full = event.max_participants != null && event.participant_count >= event.max_participants;
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs ${
        full ? "bg-red-500/10 text-red-400" : "bg-primary-soft text-primary"
      }`}
    >
      <Users className="h-3 w-3" />
      {event.max_participants == null
        ? `${event.participant_count}`
        : `${event.participant_count}/${event.max_participants}`}
    </span>
  );
}

function EventDialog({
  event,
  onClose,
  getEventHref,
}: {
  event: EventDetail;
  onClose: () => void;
  getEventHref: (role: "staff", eventId: string) => string;
}) {
  const full = event.max_participants != null && event.participant_count >= event.max_participants;
  const lifecycle = getEventLifecycleStatus(event.is_public, event.start_at, event.end_at);
  const lifecycleVariant: Record<string, "default" | "outline" | "solid" | "neutral"> = {
    draft: "neutral",
    upcoming: "default",
    ongoing: "solid",
    past: "outline",
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={event.title}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-ink-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={event.is_public ? "default" : "neutral"}>
                {event.is_public ? "Public" : "Private"}
              </Badge>
              <Badge variant="outline">{eventTypeLabel[event.event_type]}</Badge>
              <Badge variant={lifecycleVariant[lifecycle]}>{lifecycle}</Badge>
            </div>
            <h2 className="font-display text-xl font-bold uppercase tracking-tight">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-ink-soft hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Date</dt>
            <dd className="text-right font-medium">
              {formatDate(event.start_at, {
                weekday: "short",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Time</dt>
            <dd className="text-right font-medium">
              {formatDate(event.start_at, { hour: "numeric", minute: "2-digit" })}
              {event.end_at
                ? ` – ${formatDate(event.end_at, { hour: "numeric", minute: "2-digit" })}`
                : ""}
            </dd>
          </div>
          {event.location && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Location</dt>
              <dd className="text-right font-medium">{event.location}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Price</dt>
            <dd className="text-right font-medium">{event.is_free ? "Free" : `${event.price_tnd} TND`}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Participants</dt>
            <dd className="text-right font-medium">
              {event.max_participants == null
                ? `${event.participant_count} registered`
                : `${event.participant_count} of ${event.max_participants}`}
            </dd>
          </div>
          {event.max_participants != null && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Availability</dt>
              <dd className={`text-right font-medium ${full ? "text-red-400" : "text-primary"}`}>
                {full ? "Fully booked" : `${Math.max(0, event.max_participants - event.participant_count)} spots left`}
              </dd>
            </div>
          )}
          {event.max_participants == null && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Capacity</dt>
              <dd className="text-right font-medium">Unlimited</dd>
            </div>
          )}
        </dl>

        {event.description && (
          <p className="mt-4 border-t border-ink-border pt-4 text-sm text-muted">{event.description}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button asChild>
            <Link href={getEventHref("staff", event.id)}>Manage event</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
