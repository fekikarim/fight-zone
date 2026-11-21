"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CornerTalkContent {
  quote: string;
  focus?: string | null;
  category?: string;
}

interface CornerTalkProps {
  open: boolean;
  onClose: () => void;
  content: CornerTalkContent | null;
  firstName?: string;
}

const EXIT_MS = 260;

function titleCase(value?: string) {
  if (!value) return "Mindset";
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/**
 * "Corner talk" — the daily motivation as a full-screen moment, the way a
 * coach leans in between rounds: a crimson bell-wipe on the logo's 12°
 * angle, the member's name, the line rising word by word, then today's one
 * action and a single "Let's go". Full screen on phones and desktop alike.
 * Escape / X / backdrop-less CTA close it; reduced motion shows it static.
 */
export function CornerTalk({ open, onClose, content, firstName }: CornerTalkProps) {
  const [visible, setVisible] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  // Mount on open; play the exit before unmounting on close.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setVisible(true);
      setLeaving(false);
    } else if (visible) {
      setLeaving(true);
    }
  }

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => {
      setVisible(false);
      setLeaving(false);
    }, EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!visible || leaving) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The CTA appears after the line has landed; focus it then.
    const focusId = window.setTimeout(() => ctaRef.current?.focus({ preventScroll: true }), 900);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusId);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus.current?.focus?.({ preventScroll: true });
    };
  }, [visible, leaving, close]);

  if (!visible || !content) return null;

  const words = content.quote.trim().split(/\s+/);
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Africa/Tunis" }).format(new Date());
  const lastWordDelay = 420 + words.length * 45;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="corner-talk-quote"
      className={
        "fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-ink text-foreground " +
        (leaving ? "animate-[fz-ct-out_260ms_ease-in_both]" : "animate-[fz-backdrop-in_200ms_ease-out_both]")
      }
    >
      {/* Bell wipe: a crimson band on the logo's angle sweeps across once. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-y-0 -left-1/4 w-[150%] origin-left -skew-x-12 bg-primary animate-[fz-ct-wipe_900ms_cubic-bezier(0.65,0,0.35,1)_both]" />
        {/* Resting accents */}
        <div className="absolute -right-24 top-0 h-full w-[42%] -skew-x-12 bg-gradient-to-b from-primary/[0.14] via-primary/[0.05] to-transparent animate-[fz-fade-up_700ms_500ms_var(--ease-out)_both]" />
        <p className="absolute -bottom-6 right-4 select-none font-display text-[clamp(5rem,22vw,18rem)] font-bold uppercase leading-none text-white/[0.03] animate-[fz-fade-up_900ms_600ms_var(--ease-out)_both] sm:right-10">
          {titleCase(content.category)}
        </p>
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-10">
        {/* Top bar */}
        <header className="flex items-center justify-between animate-[fz-fade-up_500ms_450ms_var(--ease-out)_both]">
          <p className="type-overline flex items-center gap-3 text-[11px] text-muted">
            <span className="slant-bar h-1 w-5" aria-hidden />
            {today} · Corner talk
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        {/* The line */}
        <div className="flex flex-1 flex-col justify-center py-10 sm:py-16">
          <p className="font-display text-2xl font-bold uppercase tracking-tight text-primary animate-[fz-fade-up_500ms_380ms_var(--ease-out)_both] sm:text-3xl">
            {firstName ? `${firstName},` : "Fighter,"}
          </p>
          <blockquote
            id="corner-talk-quote"
            className="mt-4 font-display text-[clamp(2.25rem,7.2vw,5.5rem)] font-bold uppercase leading-[0.95] tracking-[-0.01em] text-balance"
          >
            {words.map((word, i) => (
              <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
                <span
                  className="inline-block animate-[fz-rise_700ms_var(--ease-out)_both]"
                  style={{ animationDelay: `${420 + i * 45}ms` }}
                >
                  {word}
                  {i < words.length - 1 ? " " : ""}
                </span>
              </span>
            ))}
          </blockquote>

          {content.focus ? (
            <div
              className="mt-10 flex flex-col gap-3 animate-[fz-fade-up_600ms_var(--ease-out)_both] sm:flex-row sm:items-center sm:gap-5"
              style={{ animationDelay: `${lastWordDelay + 120}ms` }}
            >
              <span className="type-overline text-[11px] text-muted">Today&apos;s round</span>
              <span className="tag-slant w-fit px-4 py-1.5 font-display text-lg font-semibold uppercase tracking-wide text-white sm:text-xl">
                {content.focus}
              </span>
            </div>
          ) : null}
        </div>

        {/* Action */}
        <footer
          className="flex flex-col gap-4 border-t border-ink-border pt-6 animate-[fz-fade-up_600ms_var(--ease-out)_both] sm:flex-row sm:items-center sm:justify-between"
          style={{ animationDelay: `${lastWordDelay + 260}ms` }}
        >
          <p className="text-sm text-muted">From your corner at Fight Zone — a new line every morning.</p>
          <Button ref={ctaRef} size="lg" onClick={close} className="w-full sm:w-auto">
            Let&apos;s go
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Button>
        </footer>
      </div>
    </div>
  );
}
