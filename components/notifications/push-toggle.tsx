"use client";

import { BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/lib/push/client";
import { cn } from "@/lib/utils";

/** Device-notification switch for the notification pages. */
export function PushToggle() {
  const { state, busy, enable, disable } = usePushNotifications();
  if (state === "loading" || state === "unsupported") return null;

  const on = state === "on";
  const blocked = state === "denied";
  const install = state === "needs-install";

  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-ink-soft px-4 py-3.5">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", on ? "bg-primary text-white" : "bg-white/[0.06] text-muted")}>
        {on ? <BellRing className="h-[18px] w-[18px]" aria-hidden /> : <BellOff className="h-[18px] w-[18px]" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Notifications on this device</p>
        <p className="text-xs text-muted">
          {on ? "You'll get alerts even when the app is closed."
            : blocked ? "Blocked in your browser — allow notifications for this site in its settings."
            : install ? "On iPhone, add Fight Zone to your Home Screen first, then enable them here."
            : "Messages, payments and event updates, straight to your device."}
        </p>
      </div>
      {install || blocked ? null : (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Notifications on this device"
          disabled={busy}
          onClick={() => (on ? disable() : enable())}
          className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60", on ? "bg-primary" : "bg-white/15")}
        >
          <span className={cn("absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform duration-200", on && "translate-x-5")}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-ink" aria-hidden /> : null}
          </span>
        </button>
      )}
    </div>
  );
}
