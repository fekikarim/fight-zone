"use client";

import { useEffect, useRef } from "react";
import { Loader2, Quote, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MotivationActionState } from "@/lib/actions/motivation";

// ─── Category metadata ──────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string }> = {
  DISCIPLINE:   { label: "Discipline" },
  STRENGTH:     { label: "Strength" },
  BOXING:       { label: "Boxing" },
  KICKBOXING:   { label: "Kickboxing" },
  FITNESS:      { label: "Fitness" },
  CONSISTENCY:  { label: "Consistency" },
  CONFIDENCE:   { label: "Confidence" },
  RECOVERY:     { label: "Recovery" },
  MINDSET:      { label: "Mindset" },
  RESILIENCE:   { label: "Resilience" },
};

interface DailyMotivationDialogProps {
  open: boolean;
  onClose: () => void;
  state: MotivationActionState | null;
  loading: boolean;
  firstName?: string;
}

/**
 * Daily motivational coach dialog. Shown once per member per business day
 * (see the session-guarded gate in components/motivation/daily-motivation-gate).
 * Hand-rolled overlay matching the app's dialog conventions (backdrop,
 * Escape/backdrop close, aria-modal, focus return), with a reduced-motion-safe
 * entrance animation.
 */
export function DailyMotivationDialog({
  open,
  onClose,
  state,
  loading,
  firstName,
}: DailyMotivationDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => closeRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const category = state?.category;
  const categoryInfo = category ? CATEGORY_META[category] ?? CATEGORY_META.MINDSET : CATEGORY_META.MINDSET;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: "fz-backdrop-in 0.3s ease both" }}
      role="dialog"
      aria-modal="true"
      aria-label="Your daily motivation from Fight Zone"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" aria-hidden />

      {/* Panel */}
      <div
        className="motivation-panel relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        style={{ animation: "fz-panel-in 0.45s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        {/* Radial glow background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(225,29,72,0.22) 0%, rgba(10,10,10,0.97) 70%)",
          }}
          aria-hidden
        />
        {/* Grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--ink-border) 1px, transparent 1px), linear-gradient(90deg, var(--ink-border) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          aria-hidden
        />

        {/* Top accent bar */}
        <div
          className="relative h-1 w-full"
          style={{
            background: "linear-gradient(90deg, #e11d48 0%, #fb7185 40%, rgba(225,29,72,0.2) 100%)",
          }}
        />

        {/* Header row */}
        <div className="relative flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" aria-hidden />
            <span className="font-display text-xs font-bold uppercase tracking-[0.22em] text-primary">
              Today&apos;s Motivation
            </span>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-ring"
            aria-label="Close motivation dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="relative px-7 pb-6 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-14">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                <Loader2 className="relative h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-sm font-medium text-zinc-400">
                Summoning your motivation…
              </p>
            </div>
          ) : state && state.ok && state.quote ? (
            <figure>
              {/* Big quote mark — stagger 0 */}
              <Quote
                className="mb-5 h-10 w-10 text-primary/40"
                aria-hidden
                style={{ animation: "fz-fade-up 0.5s 0.05s cubic-bezier(0.22,1,0.36,1) both" }}
              />

              {/* Category badge — stagger 1 */}
              <div
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1"
                style={{ animation: "fz-fade-up 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both" }}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {categoryInfo.label}
                </span>
              </div>

              {/* Quote text — stagger 2 */}
              <blockquote
                className="font-display text-2xl font-bold uppercase leading-snug tracking-tight text-white sm:text-[1.7rem]"
                style={{ animation: "fz-fade-up 0.55s 0.18s cubic-bezier(0.22,1,0.36,1) both" }}
              >
                {state.quote}
              </blockquote>

              {/* Focus / attribution — stagger 3 */}
              <figcaption
                className="mt-6 flex flex-col gap-1"
                style={{ animation: "fz-fade-up 0.5s 0.28s cubic-bezier(0.22,1,0.36,1) both" }}
              >
                {state.focus ? (
                  <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                    {state.focus}
                  </span>
                ) : null}
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  {firstName ?? "Athlete"} · Fight Zone
                </span>
              </figcaption>
            </figure>
          ) : (
            <p className="py-10 text-center text-sm text-zinc-500">
              Could not load today&apos;s motivation.
            </p>
          )}
        </div>

        {/* Footer CTA */}
        {!loading && state?.ok && state.quote ? (
          <div
            className="relative flex items-center justify-between border-t border-white/5 bg-white/[0.02] px-6 py-4"
            style={{ animation: "fz-fade-up 0.5s 0.35s cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <span className="text-xs text-zinc-600">
              One quote · one day · one fight
            </span>
            <Button
              onClick={onClose}
              size="sm"
              className="gap-2 font-bold uppercase tracking-wider"
            >
              I&apos;m Ready
            </Button>
          </div>
        ) : (
          <div className="relative flex justify-end border-t border-white/5 bg-white/[0.02] px-6 py-4">
            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
