"use client";

import { Play } from "lucide-react";
import { MOTIVATION_REPLAY_EVENT } from "@/components/motivation/daily-motivation-gate";

/** Replays today's full-screen corner talk (handled by DailyMotivationGate). */
export function MotivationReplayButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(MOTIVATION_REPLAY_EVENT))}
      className="group inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold text-foreground"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-strong transition-colors group-hover:border-primary group-hover:bg-primary">
        <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden />
      </span>
      <span className="link-draw">Replay</span>
    </button>
  );
}
