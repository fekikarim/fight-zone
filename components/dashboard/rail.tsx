import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Horizontal, snap-scrolling rail with a title row (swipe on phones). */
export function Rail({ title, href, linkLabel = "See all", children, id }: { title: string; href?: string; linkLabel?: string; children: ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <h2 id={id} className="font-display text-2xl font-bold uppercase leading-none tracking-tight sm:text-3xl">{title}</h2>
        {href ? (
          <Link href={href} className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground">
            {linkLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}
