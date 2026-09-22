import type { MotivationContent, MotivationCategory, MotivationSource } from "@/lib/validations/motivation";

/**
 * Curated fallback quote library for the Daily AI Motivational Coach.
 *
 * This library is the production-safe default: it guarantees the member
 * ALWAYS receives a high-quality, family-friendly, Fight Zone-themed quote
 * even when no AI provider is configured or reachable. It is not an admin
 * CMS — the library is code-reviewed and shipped with the app.
 *
 * Selection is deterministic per member per calendar day (a stable hash of
 * user_id + motivation_date). Consequences:
 *   - the same member+day always resolves to the same quote, so parallel
 *     tabs and multiple devices agree on "today's quote";
 *   - consecutive days point at different library entries, so a member
 *     never sees the same quote on consecutive days;
 *   - no randomness and no shared state, so it is safe under concurrency.
 */

const FALLBACK_SOURCE: MotivationSource = "FALLBACK";

interface LibraryEntry {
  category: MotivationCategory;
  quote: string;
  focus?: string;
}

import backupQuotes from "./backup-quotes.json";

const LIBRARY: LibraryEntry[] = backupQuotes as LibraryEntry[];

/** Deterministic 32-bit string hash (djb2-style), mapped to a non-negative index. */
function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Pick the library entry for a member on a given local "YYYY-MM-DD" date. */
export function pickFromLibrary(userId: string, motivationDate: string): LibraryEntry {
  const h = hashString(`${userId}|${motivationDate}`);
  const entry = LIBRARY[h % LIBRARY.length];
  return {
    category: entry.category,
    quote: entry.quote,
    ...(entry.focus ? { focus: entry.focus } : {}),
  };
}

/**
 * Builds a validated, library-backed MotivationContent for a member/date.
 * Always valid by construction (the library is curated); we still shape it
 * to the shared invariant (source = FALLBACK).
 */
export function fallbackMotivation(userId: string, motivationDate: string): MotivationContent {
  const entry = pickFromLibrary(userId, motivationDate);
  return {
    quote: entry.quote,
    category: entry.category,
    source: FALLBACK_SOURCE,
    ...(entry.focus ? { focus: entry.focus } : {}),
  };
}
