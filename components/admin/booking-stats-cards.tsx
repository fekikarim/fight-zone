import type { BookingManagementStats } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

interface BookingStatsCardsProps {
  stats: BookingManagementStats;
}

const cards: { key: keyof BookingManagementStats; label: string; valueClass: string }[] = [
  { key: "pending", label: "Pending requests", valueClass: "text-amber-300" },
  { key: "confirmedUpcoming", label: "Confirmed upcoming", valueClass: "text-emerald-300" },
  { key: "today", label: "Today's sessions", valueClass: "text-sky-300" },
  { key: "completed", label: "Completed", valueClass: "text-sky-300" },
  { key: "cancelled", label: "Cancelled", valueClass: "text-muted" },
  { key: "noShow", label: "No shows", valueClass: "text-red-300" },
];

export function BookingStatsCards({ stats }: BookingStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-ink-border bg-ink-soft/50 p-5"
        >
          <p className={cn("font-display text-3xl font-bold sm:text-4xl", card.valueClass)}>
            {stats[card.key]}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">
            {card.label}
          </p>
        </div>
      ))}
    </div>
  );
}
