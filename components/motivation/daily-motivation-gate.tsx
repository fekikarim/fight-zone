"use client";

import { useEffect, useRef, useState } from "react";
import { getTodayMotivation, type MotivationActionState } from "@/lib/actions/motivation";
import { DailyMotivationDialog } from "@/components/motivation/daily-motivation-dialog";
import { businessDateKey } from "@/lib/timezone";

interface DailyMotivationGateProps {
  /** Member's first name for personalization; safe client string. */
  userFirstName?: string;
}

const SS_KEY_PREFIX = "fz_motivation_shown";

/**
 * Renders the daily motivation dialog for authenticated members.
 *
 * The database is the source of truth (one quote per member per business
 * day). sessionStorage is used ONLY as a client-side optimization so the
 * dialog auto-opens once per calendar day per session and does not re-open
 * on every refresh/navigation mid-session (the day key rolls over to a new
 * value on the next business day, so it re-opens then).
 *
 * This lives inside the member layout, which does not re-mount on client
 * navigations, so it fires once per full page load at most.
 */
export function DailyMotivationGate({ userFirstName }: DailyMotivationGateProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<MotivationActionState | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const dateKey = safeDateKey(businessDateKey());
    try {
      if (window.sessionStorage.getItem(`${SS_KEY_PREFIX}:${dateKey}`) === "1") return;
    } catch {
      // sessionStorage unavailable (privacy mode); still show the dialog.
    }

    let cancelled = false;
    getTodayMotivation()
      .then((result) => {
        if (cancelled) return;
        setState(result);
        if (result.ok && result.quote) {
          setOpen(true);
          try {
            window.sessionStorage.setItem(`${SS_KEY_PREFIX}:${dateKey}`, "1");
          } catch {
            // Ignore storage failures.
          }
        }
      })
      .catch(() => {
        if (!cancelled) setState({ ok: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DailyMotivationDialog
      open={open}
      onClose={() => setOpen(false)}
      state={state}
      loading={loading}
      firstName={userFirstName}
    />
  );
}

function safeDateKey(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "unknown";
}
