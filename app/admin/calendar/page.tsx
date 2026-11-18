import type { Metadata } from "next";
import { getCalendarEvents } from "@/lib/supabase/queries";
import {
  toDateKey,
  startOfWeek,
  startOfMonth,
  addDays,
  parseDateKey,
} from "@/lib/calendar";
import { businessDateKey, businessDayEnd, businessDayStart } from "@/lib/timezone";
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
  // "Today" is the Fight Zone (Tunis) calendar day, not the server's UTC day.
  const today = parseDateKey(businessDateKey(new Date()))!;
  const anchor = parseDateKey(toSingle(searchParamsResolved.date)) ?? today;

  // Visible calendar days [firstDay, lastDay] for the selected view. These
  // are plain calendar dates; they are converted to Tunis-day UTC bounds
  // below so the query matches exactly what the grid shows.
  let firstDay: Date;
  let lastDay: Date;
  let rangeLabel: string;
  if (view === "month") {
    const ms = startOfMonth(anchor);
    // The month grid shows 6 full weeks, including leading/trailing days.
    firstDay = startOfWeek(ms);
    lastDay = addDays(firstDay, 41);
    rangeLabel = ms.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } else if (view === "week") {
    const ws = startOfWeek(anchor);
    firstDay = ws;
    lastDay = addDays(ws, 6);
    rangeLabel = `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${lastDay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  } else {
    firstDay = anchor;
    lastDay = anchor;
    rangeLabel = anchor.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  // Noon UTC always falls on the same calendar date in Tunis (UTC+1).
  const atNoon = (d: Date) => new Date(`${toDateKey(d)}T12:00:00Z`);
  const from = businessDayStart(atNoon(firstDay));
  const to = new Date(businessDayEnd(atNoon(lastDay)).getTime() - 1);

  const events = await getCalendarEvents(from.toISOString(), to.toISOString());

  // Pass a serializable shape to the client (plain EventDetail is fine).
  const eventProps: EventDetail[] = events;

  return (
    <CalendarClient
      view={view}
      dateKey={toDateKey(anchor)}
      rangeLabel={rangeLabel}
      events={eventProps}
    />
  );
}
