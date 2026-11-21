import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FIELD_BASE } from "@/components/ui/field-styles";

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
  const isPast = values.when === "past";
  const tab = (active: boolean) =>
    cn(
      "inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition-colors",
      active ? "bg-foreground text-ink" : "text-muted hover:text-foreground",
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="When" className="inline-flex w-fit rounded-lg border border-ink-border bg-ink-soft p-1">
          <Link href={href(values, { when: undefined })} scroll={false} aria-current={!isPast ? "page" : undefined} className={tab(!isPast)}>
            Upcoming
          </Link>
          <Link href={href(values, { when: "past", open: undefined })} scroll={false} aria-current={isPast ? "page" : undefined} className={tab(isPast)}>
            Past
          </Link>
        </nav>

        <form role="search" action="/events" className="flex flex-col gap-2 sm:flex-row lg:max-w-2xl lg:flex-1 lg:justify-end">
          {values.type ? <input type="hidden" name="type" value={values.type} /> : null}
          {isPast ? <input type="hidden" name="when" value="past" /> : null}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="event-q" className="sr-only">Search events</label>
            <input id="event-q" name="q" type="search" defaultValue={values.q} placeholder="Search events" className={cn(FIELD_BASE, "h-11 border-ink-border pl-10")} />
          </div>
          {categories.length ? (
            <>
              <label htmlFor="event-cat" className="sr-only">Category</label>
              <select id="event-cat" name="category" defaultValue={values.category ?? ""} className={cn(FIELD_BASE, "h-11 border-ink-border sm:w-44")}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          ) : null}
          {!isPast ? (
            <label className="flex h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-md border border-ink-border bg-ink-softer px-3.5 text-sm transition-colors hover:border-ink-strong">
              <input type="checkbox" name="open" value="1" defaultChecked={values.open} className="h-4 w-4 accent-primary" />
              Places left
            </label>
          ) : null}
          <Button type="submit" className="h-11 shrink-0">Search</Button>
        </form>
      </div>

      <nav aria-label="Event type" className="-mx-4 flex gap-1 overflow-x-auto border-b border-ink-border px-4 sm:mx-0 sm:px-0">
        {TYPES.map((f) => {
          const active = (values.type ?? "") === f.value;
          return (
            <Link
              key={f.value}
              href={href(values, { type: f.value || undefined })}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-11 shrink-0 items-center px-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors",
                active ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              {f.label}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-3 -bottom-px h-[3px] origin-left -skew-x-12 bg-primary transition-transform duration-200",
                  active ? "scale-x-100" : "scale-x-0",
                )}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
