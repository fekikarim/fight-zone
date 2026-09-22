/**
 * Pure calendar date helpers (server + client safe).
 * All date math is done in local time for a consistent, timezone-aware
 * calendar display. Inputs/outputs use the caller's local timezone.
 */

/** Format a Date as YYYY-MM-DD in local time. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Start of the day for a Date, in local time. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** End (just before next day) of the day for a Date, in local time. */
export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, -1);
}

/** Start of the week containing `date` (Sunday = start). */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Start of the month containing `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** End of the month containing `date`. */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 0, 0, 0, -1);
}

/** Number of days in the month containing `date`. */
export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Add `days` to a Date (local). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export interface CalendarDay {
  key: string;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
}

/** Build the 6x7 grid of days for a month view (leading/trailing blanks). */
export function buildMonthGrid(anchor: Date, today: Date): CalendarDay[] {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    days.push({
      key: toDateKey(date),
      date,
      inMonth: date.getMonth() === anchor.getMonth(),
      isToday: toDateKey(date) === toDateKey(today),
    });
  }
  return days;
}

/** Parse a YYYY-MM-DD string into a local Date, or null if invalid. */
export function parseDateKey(key: string | undefined | null): Date | null {
  if (!key) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}
