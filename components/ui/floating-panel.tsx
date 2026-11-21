"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const PHONE = "(max-width: 639px)";

/** True on phone widths — pickers become bottom sheets there. */
export function useIsPhone() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(PHONE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

/** Write a value into a native field and fire the event React listens to. */
export function setNativeValue(el: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

/** The visible label of a field (for the phone sheet title). */
export function labelFor(trigger: HTMLElement | null, id: string, fallback: string) {
  let text = document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent ?? "";
  const wrap = trigger?.closest("label");
  if (!text && wrap) text = (wrap.textContent ?? "").replace(trigger?.textContent ?? "", "");
  return text.replace(/\(optional\)/i, "").replace(/\s*\*\s*$/, "").trim() || fallback;
}

interface FloatingPanelProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  /** `restoreFocus` is true when closed by Escape / the close button. */
  onClose: (restoreFocus: boolean) => void;
  title: string;
  /** Minimum desktop width in px (defaults to the anchor's width). */
  minWidth?: number;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Picker surface: a popover anchored to its field on desktop/tablet, a
 * bottom sheet on phones. Portalled so dialogs/cards never clip it.
 */
export function FloatingPanel({ anchorRef, open, onClose, title, minWidth = 0, footer, children }: FloatingPanelProps) {
  const isPhone = useIsPhone();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);

  const place = useCallback(() => {
    const a = anchorRef.current?.getBoundingClientRect();
    const p = panelRef.current;
    if (!a || !p) return;
    const width = Math.min(Math.max(a.width, minWidth), window.innerWidth - 16);
    const h = p.offsetHeight;
    const below = window.innerHeight - a.bottom - 12;
    const up = h > below && a.top - 12 > below;
    setPos({
      top: up ? Math.max(8, a.top - 8 - h) : a.bottom + 8,
      left: Math.min(Math.max(8, a.left), window.innerWidth - width - 8),
      width,
      up,
    });
  }, [anchorRef, minWidth]);

  useLayoutEffect(() => {
    if (!open || isPhone) return;
    place();
    const ro = new ResizeObserver(place);
    if (panelRef.current) ro.observe(panelRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, isPhone, place]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      onClose(true);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    const prevOverflow = document.body.style.overflow;
    if (isPhone) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isPhone, onClose, anchorRef]);

  if (!open) return null;

  if (isPhone) {
    return createPortal(
      <div className="fixed inset-0 z-[90]" role="presentation">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fz-backdrop-in_200ms_ease-out_both]" aria-hidden />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-[28px] border-t border-white/[0.08] bg-ink-soft pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)] animate-[fz-sheet-up_320ms_var(--ease-out)_both]"
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-white/15" aria-hidden />
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3">
            <p className="font-display text-xl font-bold uppercase tracking-tight">{title}</p>
            <button
              type="button"
              onClick={() => onClose(true)}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-muted transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">{children}</div>
          {footer ? <div className="shrink-0 border-t border-white/[0.06] px-4 pt-3">{footer}</div> : null}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title}
      style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { top: 0, left: 0, visibility: "hidden" }}
      className={cn(
        "fixed z-[90] flex max-h-[min(420px,calc(100dvh-24px))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-soft/95 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)] backdrop-blur-xl",
        pos && (pos.up ? "origin-bottom" : "origin-top"),
        "animate-[fz-panel-in_180ms_var(--ease-out)_both]",
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">{children}</div>
      {footer ? <div className="shrink-0 border-t border-white/[0.06] px-3 py-2.5">{footer}</div> : null}
    </div>,
    document.body,
  );
}
