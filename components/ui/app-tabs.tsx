import Link from "next/link";
import { cn } from "@/lib/utils";

export interface AppTab {
  href: string;
  label: string;
  active: boolean;
  count?: number;
}

/** App-style filter pills (horizontal scroll on phones, links = shareable URLs). */
export function AppTabs({ tabs, label }: { tabs: AppTab[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex gap-1 rounded-full border border-white/[0.08] bg-ink-soft p-1">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            scroll={false}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors",
              t.active ? "bg-foreground text-ink" : "text-muted hover:text-foreground",
            )}
          >
            {t.label}
            {t.count ? (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular",
                  t.active ? "bg-ink text-foreground" : "bg-white/10 text-foreground",
                )}
              >
                {t.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
