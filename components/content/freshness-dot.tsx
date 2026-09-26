"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  getSeenSnapshot,
  isNewer,
  markSeen,
  notifySeenChange,
  subscribeSeenChange,
  type FreshnessKind,
  type FreshnessMarker,
} from "@/lib/content-freshness";

interface FreshnessDotProps {
  kind: FreshnessKind;
  /** Pages whose visit marks the feed seen (e.g. ["/events", "/member/events"]). */
  hrefs: string[];
  /** Null for signed-out visitors (per-browser "anon" tracking). */
  userId: string | null;
  /** Server-rendered snapshot — zero extra requests to start. */
  initial: FreshnessMarker | null;
}

const TABLE: Record<FreshnessKind, string> = { news: "news", events: "events" };
const FILTER: Record<FreshnessKind, string> = {
  news: "is_published=eq.true",
  events: "is_public=eq.true",
};
const AT_FIELD: Record<FreshnessKind, string> = {
  news: "published_at",
  events: "created_at",
};

function onPage(pathname: string, hrefs: string[]): boolean {
  return hrefs.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

function parseSnapshot(raw: string): FreshnessMarker | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FreshnessMarker>;
    if (typeof parsed.id !== "string" || typeof parsed.at !== "string") return null;
    return { id: parsed.id, at: parsed.at };
  } catch {
    return null;
  }
}

/**
 * "New content" dot for a navbar link. Shows when a newer article/event
 * exists than the user has seen; clears on visiting the page; reappears on
 * the next publish via realtime. Seen state lives in an external store
 * (localStorage + listeners) so it stays hydration-safe, synced across
 * tabs, and free of render cascades. Silent on offline/subscription failure.
 */
export function FreshnessDot({ kind, hrefs, userId, initial }: FreshnessDotProps) {
  const pathname = usePathname();
  const [latest, setLatest] = useState<FreshnessMarker | null>(initial);

  // Adopt a newer server snapshot on revalidation (adjust-during-render:
  // conditional and convergent, so no render loop).
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (initial && isNewer(initial, latest)) setLatest(initial);
  }

  // Seen state as an external store: hydration-safe (server snapshot ""),
  // re-renders only when the stored value actually changes.
  const seenRaw = useSyncExternalStore(
    subscribeSeenChange,
    () => getSeenSnapshot(userId, kind),
    () => "",
  );
  const seen = useMemo(() => parseSnapshot(seenRaw), [seenRaw]);

  const viewing = onPage(pathname, hrefs);
  const show = !viewing && isNewer(latest, seen);

  // Visiting the page marks the feed seen (external write only — the store
  // subscription above re-renders with the cleared state).
  useEffect(() => {
    if (viewing && latest) markSeen(userId, kind, latest);
  }, [viewing, latest, userId, kind]);

  // Cross-tab sync: another tab's write notifies this tab's store.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (typeof e.key === "string" && e.key.endsWith(`:${kind}`)) {
        notifySeenChange();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [kind]);

  // Realtime: new published rows arrive via RLS-filtered broadcasts
  // (anon/members only ever receive published/public rows). Each mounted
  // dot uses its own channel: supabase-js reuses channel instances by
  // topic, so sharing one name across simultaneous instances (desktop +
  // mobile nav, sidebar + drawer) throws when the second .on() lands on
  // an already-subscribed channel.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    try {
      channel = supabase
        .channel(`freshness-${kind}-${instanceId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: TABLE[kind], filter: FILTER[kind] },
          (payload) => {
            if (cancelled) return;
            const row = (payload.new ?? {}) as Record<string, unknown>;
            const id = row.id;
            const at = row[AT_FIELD[kind]];
            if (typeof id !== "string" || typeof at !== "string") return;
            setLatest((prev) => {
              const next = { id, at };
              return isNewer(next, prev) ? next : prev;
            });
          },
        )
        .subscribe();
    } catch {
      // Realtime is best-effort: the SSR snapshot still drives the dot,
      // so a subscription race must never crash the navbar.
      channel = null;
    }
    return () => {
      cancelled = true;
      if (channel) {
        try {
          void supabase.removeChannel(channel);
        } catch {
          // Cleanup must never throw.
        }
      }
    };
  }, [kind, instanceId]);

  if (!show) return null;
  return (
    <span
      role="status"
      aria-label={`New ${kind === "news" ? "articles" : "events"}`}
      title={kind === "news" ? "New articles" : "New events"}
      className="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
    />
  );
}
