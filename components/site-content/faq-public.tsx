"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RichText } from "@/lib/cms/rich-text";
import { cn } from "@/lib/utils";
import { FIELD_BASE } from "@/components/ui/field-styles";

export function FaqPublic({ items }: { items: Array<{ id: string; category: string; question: string; answer: string }> }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? items.filter((i) => `${i.question} ${i.answer}`.toLowerCase().includes(t)) : items;
  }, [q, items]);
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const i of filtered) map.set(i.category, [...(map.get(i.category) ?? []), i]);
    return [...map.entries()];
  }, [filtered]);
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <label htmlFor="faq-search" className="sr-only">Search questions</label>
          <input
            id="faq-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search questions"
            className={cn(FIELD_BASE, "h-12 border-ink-border pl-10")}
          />
        </div>
        <p className="mt-3 text-xs text-muted" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "question" : "questions"}
          {q.trim() ? ` matching “${q.trim()}”` : ""}
        </p>
        {groups.length > 1 ? (
          <nav aria-label="FAQ topics" className="mt-6 hidden flex-col gap-0.5 border-l border-ink-border lg:flex">
            {groups.map(([cat]) => (
              <a
                key={cat}
                href={`#faq-${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="-ml-px border-l-2 border-transparent py-1.5 pl-4 text-sm text-muted transition-colors hover:border-primary hover:text-foreground"
              >
                {cat}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="mt-8 rounded-lg border border-ink-border p-5">
          <p className="font-display text-lg font-semibold uppercase leading-tight">Still have a question?</p>
          <p className="mt-1.5 text-sm text-muted">Coach Seif answers every message himself.</p>
          <a href="/contact" className="link-draw mt-3 inline-block text-sm font-semibold text-foreground">Send a message</a>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {groups.length ? (
          groups.map(([cat, list]) => (
            <section
              key={cat}
              id={`faq-${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              aria-labelledby={`faq-h-${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="scroll-mt-28"
            >
              <h2
                id={`faq-h-${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="type-overline mb-2 flex items-center gap-2.5 text-muted"
              >
                <span className="slant-bar h-1 w-4" aria-hidden />
                {cat}
              </h2>
              <div className="border-t border-ink-border">
                {list.map((i) => (
                  <details key={i.id} className="group border-b border-ink-border">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden sm:text-lg">
                      <span>{i.question}</span>
                      <span
                        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-ink-strong transition-colors group-open:border-primary group-open:bg-primary"
                        aria-hidden
                      >
                        <span className="absolute h-0.5 w-3 bg-current" />
                        <span className="absolute h-3 w-0.5 bg-current transition-transform duration-200 group-open:scale-y-0" />
                      </span>
                    </summary>
                    <RichText text={i.answer} className="max-w-2xl pb-6 pr-12 text-[15px] leading-relaxed text-muted" />
                  </details>
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="text-sm text-muted">
            No question matches “{q}”.{" "}
            <a href="/contact" className="link-draw font-semibold text-foreground">Ask Coach Seif directly</a>.
          </p>
        )}
      </div>
    </div>
  );
}
