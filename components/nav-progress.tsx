"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Slim crimson bar under the top edge: starts the instant an internal link
 * is pressed (or history changes) and finishes when the new route renders,
 * so every navigation gives immediate feedback.
 */
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<"idle" | "run" | "done">("idle");
  const timer = useRef<number | null>(null);
  const key = `${pathname}?${search}`;
  const lastKey = useRef(key);

  useEffect(() => {
    const start = () => {
      if (timer.current) window.clearTimeout(timer.current);
      setPhase("run");
      // Safety net: never hang if a navigation is cancelled.
      timer.current = window.setTimeout(() => setPhase("idle"), 12_000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
    };
  }, []);

  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    if (timer.current) window.clearTimeout(timer.current);
    setPhase("done");
    timer.current = window.setTimeout(() => setPhase("idle"), 380);
  }, [key]);

  if (phase === "idle") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[150] h-[3px]">
      <div
        className="h-full origin-left bg-gradient-to-r from-[#e11d48] to-[#ff5c7c] shadow-[0_0_12px_rgba(225,29,72,0.8)]"
        style={
          phase === "run"
            ? { animation: "fz-nav-grow 8s cubic-bezier(0.1, 0.6, 0.2, 1) forwards" }
            : { transform: "scaleX(1)", opacity: 0, transition: "transform 180ms ease-out, opacity 260ms ease-out 120ms" }
        }
      />
    </div>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
