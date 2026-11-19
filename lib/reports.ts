import "server-only";

import { fromBusinessDateTimeInput } from "@/lib/timezone";

/** Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD (club timezone) into a half-open ISO range. */
export function parseReportRange(from?: string, to?: string, now: number = Date.now()) {
  const valid = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const toDay = valid(to) ?? new Date(now).toISOString().slice(0, 10);
  const fromDay = valid(from) ?? new Date(now - 30 * 86_400_000).toISOString().slice(0, 10);
  const fromIso = fromBusinessDateTimeInput(`${fromDay}T00:00`) ?? new Date(now - 30 * 86_400_000).toISOString();
  const toStart = fromBusinessDateTimeInput(`${toDay}T00:00`) ?? new Date(now).toISOString();
  const toIso = new Date(new Date(toStart).getTime() + 86_400_000).toISOString();
  return { fromDay, toDay, fromIso, toIso };
}

/** RFC-4180 CSV with formula-injection protection for spreadsheet apps. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
