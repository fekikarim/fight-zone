"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { NOTIFICATION_FILTERS } from "@/lib/validations/notifications";

interface NotificationFiltersProps {
  unreadCount: number;
}

/** Filter chips (scroll horizontally on small phones). Sets `?filter=`. */
export function NotificationFilters({ unreadCount }: NotificationFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const active = searchParams.get("filter") ?? "";

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("filter", value);
    else params.delete("filter");
    params.delete("cursor");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <div
      role="tablist"
      aria-label="Filter notifications"
      aria-busy={pending}
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden",
        pending && "opacity-70",
      )}
    >
      {NOTIFICATION_FILTERS.map((f) => {
        const isActive = active === f.value;
        const showBadge = f.value === "unread" && unreadCount > 0;
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setFilter(f.value)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-white"
                : "border-ink-border bg-transparent text-muted hover:border-primary/50 hover:text-foreground",
            )}
          >
            {f.label}
            {showBadge ? (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                  isActive ? "bg-white/25" : "bg-primary text-white",
                )}
              >
                {unreadCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
