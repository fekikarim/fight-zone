"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Share, X } from "lucide-react";
import { usePushNotifications } from "@/lib/push/client";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "fz:push-prompt-dismissed";
const WEEK = 24 * 3600 * 1000; // ask again after a day

/** One-time, polite ask to turn on device notifications (never on page load). */
export function PushPrompt({ hidden }: { hidden?: boolean }) {
  const { state, busy, enable } = usePushNotifications();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Read the stored choice only after the delay (also keeps the ask unobtrusive).
    const t = window.setTimeout(() => {
      try {
        const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
        setDismissed(Date.now() - at < WEEK);
      } catch { setDismissed(false); }
      setReady(true);
    }, 7000);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  };

  const show = ready && !dismissed && !hidden && (state === "off" || state === "needs-install");
  if (!show) return null;
  const install = state === "needs-install";

  return (
    <div
      role="dialog"
      aria-label="Turn on notifications"
      className={cn(
        "fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md animate-[fz-sheet-up_380ms_var(--ease-out)_both] sm:bottom-28",
      )}
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-ink-soft/95 p-4 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)] backdrop-blur-xl">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/25 blur-3xl" />
        <button type="button" onClick={dismiss} aria-label="Not now" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground">
          <X className="h-4 w-4" aria-hidden />
        </button>
        <div className="relative flex items-start gap-3.5 pr-7">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[var(--shadow-hit)]">
            {install ? <Share className="h-5 w-5" aria-hidden /> : <BellRing className="h-5 w-5" aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold uppercase leading-tight tracking-tight">
              {install ? "Get alerts on your iPhone" : "Never miss a round"}
            </p>
            <p className="mt-1 text-sm leading-snug text-muted">
              {install
                ? "Tap Share, then “Add to Home Screen”, and open Fight Zone from there to enable notifications."
                : "Get a ping for messages from Coach Seif, payment confirmations and event updates — even when the app is closed."}
            </p>
          </div>
        </div>
        {install ? null : (
          <div className="relative mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => { await enable(); dismiss(); }}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-primary-hover active:scale-[0.97] disabled:opacity-60"
            >
              <Bell className="h-4 w-4" aria-hidden /> {busy ? "Asking…" : "Turn on"}
            </button>
            <button type="button" onClick={dismiss} className="h-11 rounded-full px-5 text-sm font-semibold text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground">
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
