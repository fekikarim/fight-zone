import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BUSINESS_TIMEZONE } from "@/lib/timezone";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a number as a locale-aware price string. */
export function formatPrice(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an ISO date as a readable date in the business timezone
 * (Africa/Tunis). Pinning the zone keeps server (UTC) and browser output
 * identical — no hydration mismatch, no times shown an hour off.
 */
export function formatDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  },
): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TIMEZONE, ...options }).format(date);
}

/** Reads a raw form value and returns a trimmed string. */
export function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}
