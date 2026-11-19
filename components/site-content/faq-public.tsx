"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RichText } from "@/lib/cms/rich-text";

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
    <div className="space-y-8">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="faq-search" className="sr-only">Search questions</label>
        <input id="faq-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions…"
          className="h-12 w-full rounded-xl border border-ink-border bg-ink-soft/40 pl-9 pr-3 text-base" />
      </div>
      {groups.length ? groups.map(([cat, list]) => (
        <section key={cat} aria-label={cat} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{cat}</h2>
          {list.map((i) => (
            <details key={i.id} className="group rounded-xl border border-ink-border bg-ink-soft/30 open:border-primary/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-medium focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                {i.question}
                <span className="shrink-0 text-primary transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <RichText text={i.answer} className="px-4 pb-4 text-sm leading-relaxed text-muted" />
            </details>
          ))}
        </section>
      )) : <p className="text-center text-sm text-muted">No question matches “{q}”. <a href="/contact" className="text-primary hover:underline">Ask us directly</a>.</p>}
    </div>
  );
}
