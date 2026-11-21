"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { FIELD_BASE } from "@/components/ui/field-styles";
import { Button } from "@/components/ui/button";
import { FloatingPanel, labelFor, setNativeValue, useIsPhone } from "@/components/ui/floating-panel";

// ── plain calendar maths on "YYYY-MM-DD" strings (no time zones involved) ──
interface Ymd { y: number; m: number; d: number } // m is 0-based
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = ({ y, m, d }: Ymd) => `${y}-${pad(m + 1)}-${pad(d)}`;
const fromUtc = (t: number): Ymd => {
  const dt = new Date(t);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
};
const addDays = (v: Ymd, n: number) => fromUtc(Date.UTC(v.y, v.m, v.d + n));
const addMonths = (v: Ymd, n: number): Ymd => {
  const last = new Date(Date.UTC(v.y, v.m + n + 1, 0)).getUTCDate();
  const first = fromUtc(Date.UTC(v.y, v.m + n, 1));
  return { ...first, d: Math.min(v.d, last) };
};
function parse(value: string): { date: Ymd | null; time: string | null } {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value ?? "");
  if (!m) return { date: null, time: null };
  return { date: { y: +m[1], m: +m[2] - 1, d: +m[3] }, time: m[4] ? `${m[4]}:${m[5]}` : null };
}
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" });
const FMT_DAY = fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
const FMT_MONTH = fmt({ month: "long", year: "numeric" });
const FMT_MONTH_SHORT = fmt({ month: "short" });
const FMT_A11Y = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const utc = (v: Ymd) => Date.UTC(v.y, v.m, v.d);
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));
const DEFAULT_TIME = "18:00";

type View = "days" | "months" | "years";

export type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** `date` (default) or `datetime-local` — same value formats as the native inputs. */
  type?: "date" | "datetime-local";
};

/**
 * Fight Zone date / date-time picker. Drop-in for `<input type="date">` and
 * `<input type="datetime-local">`: a hidden native input keeps the value,
 * min/max/required validation, FormData and react-hook-form working; the
 * visible part is a calendar — popover on desktop, bottom sheet on phones.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  {
    id,
    type = "date",
    className,
    value,
    defaultValue,
    onChange,
    onBlur,
    min,
    max,
    required,
    disabled,
    placeholder,
    "aria-label": ariaLabel,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedby,
    ...rest
  },
  ref,
) {
  const withTime = type === "datetime-local";
  const autoId = useId();
  const triggerId = id ?? `date-${autoId}`;
  const nativeRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isPhone = useIsPhone();

  const controlled = value !== undefined;
  const [inner, setInner] = useState(() => (defaultValue != null ? String(defaultValue) : ""));
  const current = controlled ? String(value ?? "") : inner;
  const parsed = parse(current);

  useEffect(() => {
    const el = nativeRef.current;
    if (!el || controlled) return;
    const sync = () => requestAnimationFrame(() => nativeRef.current && setInner(nativeRef.current.value));
    sync();
    el.form?.addEventListener("reset", sync);
    return () => el.form?.removeEventListener("reset", sync);
  }, [controlled]);

  const minD = parse(String(min ?? "")).date;
  const maxD = parse(String(max ?? "")).date;
  const outOfRange = useCallback(
    (v: Ymd) => (minD ? utc(v) < utc(minD) : false) || (maxD ? utc(v) > utc(maxD) : false),
    [minD, maxD],
  );

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [view, setView] = useState<View>("days");
  const [today, setToday] = useState<Ymd>({ y: 2026, m: 0, d: 1 });
  const [cursor, setCursor] = useState<Ymd>({ y: 2026, m: 0, d: 1 }); // focused day; its month is shown

  const commit = (next: string) => {
    if (nativeRef.current && next !== current) setNativeValue(nativeRef.current, next);
  };

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const openPicker = () => {
    if (disabled) return;
    const now = new Date();
    const t = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
    let start = parsed.date ?? t;
    if (!parsed.date && minD && utc(start) < utc(minD)) start = minD;
    if (!parsed.date && maxD && utc(start) > utc(maxD)) start = maxD;
    setToday(t);
    setCursor(start);
    setView("days");
    setTitle(labelFor(triggerRef.current, triggerId, ariaLabel ?? (withTime ? "Date & time" : "Date")));
    setOpen(true);
  };

  const pickDay = (v: Ymd) => {
    if (outOfRange(v)) return;
    setCursor(v);
    if (withTime) commit(`${toIso(v)}T${parsed.time ?? DEFAULT_TIME}`);
    else {
      commit(toIso(v));
      close(true);
    }
  };

  const pickTime = (part: "h" | "m", v: string) => {
    const date = parsed.date ?? cursor;
    const [h, m] = (parsed.time ?? DEFAULT_TIME).split(":");
    commit(`${toIso(date)}T${part === "h" ? v : h}:${part === "m" ? v : m}`);
  };

  // Roving focus inside the day grid.
  useEffect(() => {
    if (!open || view !== "days") return;
    const id = requestAnimationFrame(() =>
      gridRef.current?.querySelector<HTMLElement>(`[data-day="${toIso(cursor)}"]`)?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(id);
  }, [open, view, cursor]);

  const onGridKey = (e: KeyboardEvent) => {
    const step: Record<string, () => Ymd> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(cursor, e.shiftKey ? 12 : 1),
      Home: () => addDays(cursor, -((new Date(utc(cursor)).getUTCDay() + 6) % 7)),
      End: () => addDays(cursor, 6 - ((new Date(utc(cursor)).getUTCDay() + 6) % 7)),
    };
    if (step[e.key]) {
      e.preventDefault();
      setCursor(step[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pickDay(cursor);
    }
  };

  const days = useMemo(() => {
    const first = Date.UTC(cursor.y, cursor.m, 1);
    const offset = (new Date(first).getUTCDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => fromUtc(Date.UTC(cursor.y, cursor.m, 1 - offset + i)));
  }, [cursor.y, cursor.m]);

  const nextMonth = addMonths({ ...cursor, d: 1 }, 1);
  const canPrev = !minD || Date.UTC(cursor.y, cursor.m, 1) - 86_400_000 >= utc(minD);
  const canNext = !maxD || utc(nextMonth) <= utc(maxD);

  const years = useMemo(() => {
    const from = minD?.y ?? today.y - 100;
    const to = maxD?.y ?? today.y + 5;
    return Array.from({ length: to - from + 1 }, (_, i) => to - i);
  }, [minD?.y, maxD?.y, today.y]);

  // Keep the chosen year / time in view when those lists open.
  const yearsRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      for (const box of [yearsRef.current, hoursRef.current, minsRef.current]) {
        const sel = box?.querySelector<HTMLElement>('[aria-pressed="true"], [aria-selected="true"]');
        if (box && sel) box.scrollTo({ top: sel.offsetTop - box.clientHeight / 2 + sel.offsetHeight / 2, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [open, view, parsed.time]);

  const display = parsed.date
    ? `${FMT_DAY.format(utc(parsed.date))}${withTime && parsed.time ? ` · ${parsed.time}` : ""}`
    : null;
  const [hh, mm] = (parsed.time ?? "").split(":");
  const minutes = mm && !MINUTES.includes(mm) ? [...MINUTES, mm].sort() : MINUTES;
  const todayOk = !outOfRange(today);

  const chip = "flex items-center justify-center rounded-xl text-sm font-semibold transition-colors";

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-1">
        {!required && current ? (
          <button type="button" onClick={() => { commit(""); close(true); }} className="h-10 rounded-full px-3.5 text-sm font-semibold text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground">
            Clear
          </button>
        ) : null}
        {todayOk ? (
          <button type="button" onClick={() => pickDay(today)} className="h-10 rounded-full px-3.5 text-sm font-semibold text-primary-readable transition-colors hover:bg-primary/10">
            Today
          </button>
        ) : null}
      </div>
      {withTime || isPhone ? (
        <Button type="button" size="sm" onClick={() => close(true)} className="h-10 rounded-full px-5">
          Done
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        disabled={disabled}
        onClick={() => (open ? close(false) : openPicker())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); openPicker(); }
        }}
        onBlur={() => onBlur && nativeRef.current && onBlur({ target: nativeRef.current, type: "blur" } as never)}
        className={cn(
          FIELD_BASE,
          "flex min-h-11 cursor-pointer items-center gap-2.5 border-ink-border text-left",
          open && "border-foreground/40 bg-ink-soft ring-2 ring-primary-ring/50",
          className,
        )}
      >
        <CalendarDays className={cn("h-4 w-4 shrink-0", display ? "text-primary-readable" : "text-muted")} aria-hidden />
        <span className={cn("min-w-0 flex-1 truncate tabular", !display && "text-muted-foreground")}>
          {display ?? placeholder ?? (withTime ? "Pick a date & time" : "Pick a date")}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180 text-foreground")} aria-hidden />
      </button>
      <input
        {...rest}
        ref={(el) => {
          nativeRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        type={type}
        value={value}
        defaultValue={defaultValue}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (!controlled) setInner(e.target.value);
          onChange?.(e);
        }}
        onInvalid={() => triggerRef.current?.focus()}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      />

      <FloatingPanel anchorRef={triggerRef} open={open} onClose={close} title={title} minWidth={withTime ? 420 : 312} footer={footer}>
        <div className={cn("flex gap-3 p-1.5", withTime ? "max-sm:flex-col sm:items-stretch" : "flex-col")}>
          <div className="min-w-0 flex-1">
            {/* header */}
            <div className="mb-2 flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => setView(view === "days" ? "years" : "days")}
                aria-label={view === "days" ? "Choose month and year" : "Back to days"}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 font-display text-lg font-semibold uppercase tracking-wide transition-colors hover:bg-white/[0.06]"
              >
                {view === "days" ? FMT_MONTH.format(Date.UTC(cursor.y, cursor.m, 1)) : view === "months" ? cursor.y : "Year"}
                <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", view !== "days" && "rotate-180")} aria-hidden />
              </button>
              {view === "days" ? (
                <div className="flex gap-1">
                  <button type="button" disabled={!canPrev} onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Previous month"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-30">
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>
                  <button type="button" disabled={!canNext} onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-30">
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>

            {view === "days" ? (
              <div key={`${cursor.y}-${cursor.m}`} className="animate-[fz-backdrop-in_160ms_ease-out_both]">
                <div className="grid grid-cols-7 pb-1" aria-hidden>
                  {WEEKDAYS.map((w) => (
                    <span key={w} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{w}</span>
                  ))}
                </div>
                <div ref={gridRef} role="grid" data-picker aria-label={FMT_MONTH.format(Date.UTC(cursor.y, cursor.m, 1))} onKeyDown={onGridKey} className="grid grid-cols-7 gap-0.5">
                  {days.map((v) => {
                    const iso = toIso(v);
                    const inMonth = v.m === cursor.m;
                    const isSel = parsed.date ? iso === toIso(parsed.date) : false;
                    const isToday = iso === toIso(today);
                    const off = outOfRange(v);
                    return (
                      <button
                        key={iso}
                        type="button"
                        role="gridcell"
                        data-day={iso}
                        tabIndex={iso === toIso(cursor) ? 0 : -1}
                        disabled={off}
                        aria-selected={isSel}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={FMT_A11Y.format(utc(v))}
                        onClick={() => pickDay(v)}
                        className={cn(
                          "relative flex aspect-square min-h-10 items-center justify-center rounded-full text-[15px] tabular transition-[background-color,color,transform] duration-150 active:scale-90 sm:text-sm",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring",
                          isSel
                            ? "bg-primary font-bold text-white shadow-[var(--shadow-hit)]"
                            : off
                              ? "cursor-not-allowed text-muted-foreground/35 line-through decoration-white/20"
                              : cn("hover:bg-white/[0.08]", inMonth ? "text-foreground" : "text-muted-foreground/60"),
                          isToday && !isSel && "font-bold text-primary-readable",
                        )}
                      >
                        {v.d}
                        {isToday && !isSel ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : view === "years" ? (
              <div ref={yearsRef} className="grid max-h-[264px] grid-cols-4 gap-1 overflow-y-auto overscroll-contain pr-1">
                {years.map((y) => (
                  <button key={y} type="button" aria-pressed={y === cursor.y}
                    onClick={() => { setCursor({ ...cursor, y, d: Math.min(cursor.d, 28) }); setView("months"); }}
                    className={cn(chip, "h-11 tabular", y === cursor.y ? "bg-primary text-white" : "hover:bg-white/[0.07]")}>
                    {y}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 12 }, (_, m) => {
                  const last = { y: cursor.y, m, d: new Date(Date.UTC(cursor.y, m + 1, 0)).getUTCDate() };
                  const off = (minD ? utc(last) < utc(minD) : false) || (maxD ? Date.UTC(cursor.y, m, 1) > utc(maxD) : false);
                  return (
                    <button key={m} type="button" disabled={off} aria-pressed={m === cursor.m}
                      onClick={() => { setCursor({ y: cursor.y, m, d: Math.min(cursor.d, last.d) }); setView("days"); }}
                      className={cn(chip, "h-12 disabled:opacity-30", m === cursor.m ? "bg-primary text-white" : "hover:bg-white/[0.07]")}>
                      {FMT_MONTH_SHORT.format(Date.UTC(cursor.y, m, 1))}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {withTime ? (
            <div className="flex shrink-0 flex-col gap-2 border-white/[0.06] max-sm:border-t max-sm:pt-3 sm:w-[120px] sm:border-l sm:pl-3">
              <p className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-widest text-muted">
                <Clock className="h-3.5 w-3.5" aria-hidden /> Time
              </p>
              <div className="flex gap-1.5 max-sm:h-[148px] sm:h-[296px]">
                {([["h", HOURS, hh, hoursRef, "Hour"], ["m", minutes, mm, minsRef, "Minute"]] as const).map(([part, list, sel, boxRef, label]) => (
                  <div key={part} ref={boxRef} role="listbox" aria-label={label}
                    className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-xl bg-ink/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {list.map((v) => (
                      <button key={v} type="button" role="option" aria-selected={v === sel} onClick={() => pickTime(part, v)}
                        className={cn(chip, "h-10 shrink-0 tabular", v === sel ? "bg-primary text-white" : "text-foreground/80 hover:bg-white/[0.08]")}>
                        {v}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </FloatingPanel>
    </>
  );
});
