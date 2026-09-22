import type { Metadata } from "next";
import { getCalendarEvents } from "@/lib/supabase/queries";
import { getEventHref } from "@/lib/types/events";
import {
  toDateKey,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  startOfDay,
  endOfDay,
  parseDateKey,
} from "@/lib/calendar";
import { CalendarClient } from "@/components/admin/calendar/calendar-client";
import type { EventDetail } from "@/lib/types/events";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Fight Zone event calendar and schedule.",
};

export const dynamic = "force-dynamic";

const VALID_VIEWS = ["month", "week", "agenda"] as const;
type CalendarView = (typeof VALID_VIEWS)[number];

function toView(raw: string | string[] | undefined): CalendarView {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (VALID_VIEWS as readonly string[]).includes(v ?? "") ? (v as CalendarView) : "month";
}

function toSingle(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

interface AdminCalendarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCalendarPage({ searchParams }: AdminCalendarPageProps) {
  const searchParamsResolved = await searchParams;
  const view = toView(searchParamsResolved.view);
  const today = new Date();
  const anchor = parseDateKey(toSingle(searchParamsResolved.date)) ?? today;

  // Compute the visible range for the selected view.
  let from: Date;
  let to: Date;
  let rangeLabel: string;
  if (view === "month") {
    const ms = startOfMonth(anchor);
    const me = endOfMonth(anchor);
    from = ms;
    to = me;
    rangeLabel = ms.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } else if (view === "week") {
    const ws = startOfWeek(anchor);
    from = ws;
    to = addDays(ws, 6);
    rangeLabel = `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  } else {
    from = startOfDay(anchor);
    to = endOfDay(anchor);
    rangeLabel = anchor.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const events = await getCalendarEvents(from.toISOString(), to.toISOString());

  // Pass a serializable shape to the client (plain EventDetail is fine).
  const eventProps: EventDetail[] = events;

  return (
    <CalendarClient
      view={view}
      dateKey={toDateKey(anchor)}
      rangeLabel={rangeLabel}
      events={eventProps}
      getEventHref={getEventHref}
    />
  );
}
