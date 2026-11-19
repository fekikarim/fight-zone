import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "", label: "All" },
  { value: "TRAINING", label: "Training" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "COMPETITION", label: "Competition" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "OTHER", label: "Other" },
] as const;

export interface EventFilterValues {
  type?: string;
  category?: string;
  q?: string;
  when?: "upcoming" | "past";
  open?: boolean;
}

function href(base: EventFilterValues, patch: Partial<EventFilterValues>) {
  const v = { ...base, ...patch };
  const p = new URLSearchParams();
  if (v.type) p.set("type", v.type);
  if (v.category) p.set("category", v.category);
  if (v.q) p.set("q", v.q);
  if (v.when === "past") p.set("when", "past");
  if (v.open) p.set("open", "1");
  const s = p.toString();
  return s ? `/events?${s}` : "/events";
}

/** Server-rendered filters (work without JS; shareable URLs). */
export function EventFilters({ values, categories }: { values: EventFilterValues; categories: string[] }) {
  return (
    <div className="space-y-4">
      <form role="search" action="/events" className="flex flex-col gap-2 sm:flex-row">
        {values.type ? <input type="hidden" name="type" value={values.type} /> : null}
        {values.when === "past" ? <input type="hidden" name="when" value="past" /> : null}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <label htmlFor="event-q" className="sr-only">Search events</label>
          <input id="event-q" name="q" defaultValue={values.q} placeholder="Search events…" className="h-11 w-full rounded-lg border border-ink-border bg-ink-soft/40 pl-9 pr-3 text-base sm:text-sm" />
        </div>
        {categories.length ? (
          <>
            <label htmlFor="event-cat" className="sr-only">Category</label>
            <select id="event-cat" name="category" defaultValue={values.category ?? ""} className="h-11 rounded-lg border border-ink-border bg-ink-soft/40 px-3 text-base sm:text-sm">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        ) : null}
        <label className="flex h-11 items-center gap-2 rounded-lg border border-ink-border px-3 text-sm">
          <input type="checkbox" name="open" value="1" defaultChecked={values.open} className="h-4 w-4 accent-primary" /> Places available
        </label>
        <button type="submit" className="h-11 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover">Search</button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((f) => (
          <Link key={f.value} href={href(values, { type: f.value || undefined })} scroll={false}
            aria-current={(values.type ?? "") === f.value ? "true" : undefined}
            className={cn("inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
              (values.type ?? "") === f.value ? "border-primary bg-primary text-white" : "border-ink-border text-muted hover:border-primary/50 hover:text-foreground")}>
            {f.label}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-ink-border" aria-hidden />
        <Link href={href(values, { when: values.when === "past" ? undefined : "past", open: undefined })} scroll={false}
          className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
          {values.when === "past" ? "Show upcoming events" : "Show past events"}
        </Link>
      </div>
    </div>
  );
}
