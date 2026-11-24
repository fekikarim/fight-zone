"use client";

import { Download, Share } from "lucide-react";
import { useInstallApp } from "@/lib/push/client";

/** "Install Fight Zone" — one tap on Android/desktop, instructions on iPhone. */
export function InstallAppCard({ className }: { className?: string }) {
  const { canInstall, installed, ios, install } = useInstallApp();
  if (installed || (!canInstall && !ios)) return null;

  return (
    <div className={`flex items-center gap-3.5 rounded-2xl border border-primary/25 bg-primary/[0.07] px-4 py-3.5 ${className ?? ""}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        {canInstall ? <Download className="h-[18px] w-[18px]" aria-hidden /> : <Share className="h-[18px] w-[18px]" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install Fight Zone</p>
        <p className="text-xs text-muted">
          {canInstall ? "Add it to your home screen — opens like an app and can notify you when it's closed."
            : "Tap Share, then “Add to Home Screen”. Notifications on iPhone need the installed app."}
        </p>
      </div>
      {canInstall ? (
        <button type="button" onClick={() => void install()} className="h-10 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-primary-hover active:scale-[0.97]">
          Install
        </button>
      ) : null}
    </div>
  );
}
