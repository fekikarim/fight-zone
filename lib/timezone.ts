/**
 * Fight Zone business-timezone utilities.
 *
 * Fight Zone is operated from Tunisia. Scheduling decisions that depend
 * on "today" (the daily 07:00 coach report) and the wall-clock times shown
 * inside emails are expressed in the business timezone (Africa/Tunis)
 * rather than the server's timezone.
 *
 * Events are stored as `timestamptz` (UTC-normalized); we convert at the
 * scheduling/presentation boundary. The UTC offset is derived from the
 * TZ database (via Intl) rather than assumed, so it stays correct even if
 * the business timezone ever changes.
 */
export const BUSINESS_TIMEZONE = "Africa/Tunis";

/** Formats a Date in the business timezone using the given options. */
export function formatInBusinessTz(
  date: Date | string,
  options: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIMEZONE,
    ...options,
  }).format(d);
}

/** Short time like "18:30" in the business timezone. */
export function formatBusinessTime(date: Date | string): string {
  return formatInBusinessTz(date, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Short date like "Fri, 5 Sep" in the business timezone. */
export function formatBusinessDate(date: Date | string): string {
  return formatInBusinessTz(date, { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Local (business-timezone) date key "YYYY-MM-DD" for a Date. This is the
 * idempotency key for the daily coach report — one report per business
 * day regardless of the server's UTC date.
 */
export function businessDateKey(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInBusinessTz(d, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).split("/").reverse().join("-");
}

/**
 * Africa/Tunis UTC offset in milliseconds at a given instant, resolved via
 * the TZ database. Used to translate local midnight to a UTC timestamptz.
 */
function businessUtcOffsetMs(date: Date = new Date()): number {
  const tzParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => tzParts.find((p) => p.type === t)?.value ?? "0";
  const localAsUtcMs = Date.parse(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`,
  );
  return localAsUtcMs - date.getTime();
}

/**
 * UTC `timestamptz` corresponding to 00:00:00 of the local business day
 * containing the given Date. The exclusive upper bound of the day is
 * produced by `businessDayEnd` (this + 24h, exact for Africa/Tunis).
 */
export function businessDayStart(date: Date | string = new Date()): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  const [y, m, day] = businessDateKey(d).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0) - businessUtcOffsetMs(d));
}

/** End of the local business day (00:00 of the next day). Exclusive bound. */
export function businessDayEnd(date: Date | string = new Date()): Date {
  return new Date(businessDayStart(date).getTime() + 24 * 60 * 60 * 1000);
}
