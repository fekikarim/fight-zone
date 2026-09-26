/**
 * Pure seen-tracking logic for "new content" nav indicators (no
 * server-only dependencies — safe for client components and headless tests).
 *
 * Each user (or "anon" per browser) stores the newest marker they have seen
 * per feed in localStorage. A feed is "unseen" when a newer marker exists.
 * Markers compare by timestamp, ties broken by id — no duplicates, no
 * refetching, no polling.
 */

export interface FreshnessMarker {
  id: string;
  at: string;
}

export type FreshnessKind = "news" | "events";

export function seenKey(userId: string | null, kind: FreshnessKind): string {
  return `fz_seen:${userId ?? "anon"}:${kind}`;
}

/** True when `candidate` is strictly newer than `seen` (or nothing seen). */
export function isNewer(
  candidate: FreshnessMarker | null,
  seen: FreshnessMarker | null,
): boolean {
  if (!candidate) return false;
  if (!seen) return true;
  if (candidate.at !== seen.at) return candidate.at > seen.at;
  return candidate.id !== seen.id;
}

function readSeen(userId: string | null, kind: FreshnessKind): FreshnessMarker | null {
  try {
    const raw = window.localStorage.getItem(seenKey(userId, kind));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FreshnessMarker>;
    if (typeof parsed.id !== "string" || typeof parsed.at !== "string") return null;
    return { id: parsed.id, at: parsed.at };
  } catch {
    return null;
  }
}

function writeSeen(userId: string | null, kind: FreshnessKind, marker: FreshnessMarker): void {
  try {
    window.localStorage.setItem(seenKey(userId, kind), JSON.stringify(marker));
  } catch {
    // Private mode / quota — indicators simply stay until next visit.
  }
}

type SeenListener = () => void;
const seenListeners = new Set<SeenListener>();

/** Subscribe to seen-state changes (same-tab writes + cross-tab sync). */
export function subscribeSeenChange(fn: SeenListener): () => void {
  seenListeners.add(fn);
  return () => {
    seenListeners.delete(fn);
  };
}

/** Notify subscribers that seen state changed. */
export function notifySeenChange(): void {
  for (const fn of seenListeners) {
    try {
      fn();
    } catch {
      // A failing listener must never break the others.
    }
  }
}

/** Stable snapshot string for useSyncExternalStore ("" when unseen). */
export function getSeenSnapshot(userId: string | null, kind: FreshnessKind): string {
  try {
    return window.localStorage.getItem(seenKey(userId, kind)) ?? "";
  } catch {
    return "";
  }
}

/** Current "has unseen" state for a feed. */
export function hasUnseen(
  userId: string | null,
  kind: FreshnessKind,
  latest: FreshnessMarker | null,
): boolean {
  return isNewer(latest, readSeen(userId, kind));
}

/** Records the feed as seen up to `latest` (no-op without a marker). */
export function markSeen(
  userId: string | null,
  kind: FreshnessKind,
  latest: FreshnessMarker | null,
): void {
  if (!latest) return;
  const current = readSeen(userId, kind);
  if (!isNewer(latest, current)) return;
  writeSeen(userId, kind, latest);
  notifySeenChange();
}
