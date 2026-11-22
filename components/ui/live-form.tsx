"use client";

import { useEffect, useRef, useTransition, type FormHTMLAttributes } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LiveFormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "action" | "method"> {
  /** Page the filters live on. Defaults to the current path. */
  action?: string;
  /** Typing delay for text fields (ms). Selects, checkboxes and dates apply instantly. */
  delay?: number;
  /** Params dropped whenever a filter changes (e.g. pagination). */
  resetParams?: string[];
}

/**
 * GET filter form that applies itself as you type or change a field — no
 * Search button, no full page reload. It serialises the fields into the URL
 * (shareable, back-button friendly) and lets the server re-render the list
 * in a transition, so typing never blocks. Without JS it is a normal GET form.
 */
export function LiveForm({ action, delay = 220, resetParams = ["page", "cursor"], className, children, ...rest }: LiveFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<number | null>(null);
  const [pending, startTransition] = useTransition();
  const target = action ?? pathname;

  const apply = () => {
    const form = ref.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value !== "string") continue;
      const v = value.trim();
      if (v) params.set(key, v);
    }
    for (const k of resetParams) params.delete(k);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${target}?${qs}` : target, { scroll: false }));
  };

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const schedule = (immediate: boolean) => {
    if (timer.current) window.clearTimeout(timer.current);
    if (immediate) apply();
    else timer.current = window.setTimeout(apply, delay);
  };

  return (
    <form
      {...rest}
      ref={ref}
      method="get"
      action={target}
      aria-busy={pending}
      onSubmit={(e) => { e.preventDefault(); schedule(true); }}
      onInput={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        const typing = t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && ["text", "search", "email", "tel", "url", "number"].includes(t.type));
        if (typing) schedule(false);
      }}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        const typing = t.tagName === "INPUT" && ["text", "search", "email", "tel", "url", "number"].includes(t.type);
        if (!typing) schedule(true);
      }}
      className={cn("group/live relative", className)}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-3 -bottom-px h-0.5 overflow-hidden rounded-full opacity-0 transition-opacity duration-150",
          pending && "opacity-100",
        )}
      >
        <span className="block h-full w-1/3 rounded-full bg-primary [animation:fz-bar-run_1s_cubic-bezier(0.65,0,0.35,1)_infinite]" />
      </span>
    </form>
  );
}
