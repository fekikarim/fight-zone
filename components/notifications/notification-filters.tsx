"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "BOOKING", label: "Bookings" },
  { value: "MESSAGE", label: "Messages" },
  { value: "SYSTEM", label: "System" },
] as const;

interface NotificationFiltersProps {
  unreadCount: number;
}

export function NotificationFilters({ unreadCount }: NotificationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("filter") ?? "";

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("filter", value);
    } else {
      params.delete("filter");
    }
    params.delete("cursor");
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        const showBadge = f.value === "unread" && unreadCount > 0;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "relative inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-white"
                : "border-ink-border bg-transparent text-muted hover:border-primary/50 hover:text-foreground",
            )}
          >
            {f.label}
            {showBadge ? (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
                {unreadCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
