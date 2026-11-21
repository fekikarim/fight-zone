"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTodayMotivation } from "@/lib/actions/motivation";
import { CornerTalk, type CornerTalkContent } from "@/components/motivation/corner-talk";
import { businessDateKey } from "@/lib/timezone";

interface DailyMotivationGateProps {
  /** Member's first name for personalization (shown only, never sent to AI). */
  userFirstName?: string;
}

const SS_KEY_PREFIX = "fz_motivation_shown";
/** Fired by the dashboard card's "Replay" button. */
export const MOTIVATION_REPLAY_EVENT = "fz:motivation-replay";

/**
 * Daily "corner talk".
 *
 * Fetching is silent: no dialog, no spinner. Once the page is idle the
 * server action returns today's stored line (or generates it once — AI with
 * the curated fallback), and only when it is ready does the full-screen
 * moment play. It plays automatically once per business day per browser
 * session; the dashboard card can replay it at any time.
 *
 * The database stays the source of truth (one line per member per day);
 * sessionStorage only prevents replaying on every navigation.
 */
export function DailyMotivationGate({ userFirstName }: DailyMotivationGateProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<CornerTalkContent | null>(null);
  const contentRef = useRef<CornerTalkContent | null>(null);
  const started = useRef(false);

  const load = useCallback(async (): Promise<CornerTalkContent | null> => {
    if (contentRef.current) return contentRef.current;
    try {
      const result = await getTodayMotivation();
      if (!result.ok || !result.quote) return null;
      const next = { quote: result.quote, focus: result.focus ?? null, category: result.category };
      contentRef.current = next;
      setContent(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  // Automatic play: once per business day per session, after the page is idle.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const key = `${SS_KEY_PREFIX}:${safeDateKey(businessDateKey())}`;
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(key) === "1";
    } catch {
      // Storage unavailable (private mode): still play once per load.
    }
    if (alreadyShown) return;

    let cancelled = false;
    let onVisible: (() => void) | null = null;
    const play = () => {
      if (cancelled) return;
      setOpen(true);
      try {
        window.sessionStorage.setItem(key, "1");
      } catch {
        // Ignore storage failures.
      }
      // The dashboard card is server-rendered: refresh so it shows today's line.
      router.refresh();
    };
    const run = async () => {
      const next = await load();
      if (cancelled || !next) return;
      // Opened in a background tab: play the moment the member looks at it.
      if (document.visibilityState === "hidden") {
        onVisible = () => {
          if (document.visibilityState !== "visible") return;
          document.removeEventListener("visibilitychange", onVisible!);
          play();
        };
        document.addEventListener("visibilitychange", onVisible);
        return;
      }
      play();
    };

    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const handle = w.requestIdleCallback ? w.requestIdleCallback(() => void run(), { timeout: 1500 }) : window.setTimeout(() => void run(), 600);
    return () => {
      cancelled = true;
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
      if (!w.requestIdleCallback) window.clearTimeout(handle);
    };
  }, [load, router]);

  // Replay on demand (dashboard card).
  useEffect(() => {
    const onReplay = async () => {
      const next = await load();
      if (next) setOpen(true);
    };
    window.addEventListener(MOTIVATION_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(MOTIVATION_REPLAY_EVENT, onReplay);
  }, [load]);

  return <CornerTalk open={open} onClose={() => setOpen(false)} content={content} firstName={userFirstName} />;
}

function safeDateKey(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "unknown";
}
