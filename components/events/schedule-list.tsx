import Link from "next/link";
import { CalendarDays, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ScheduleItem } from "@/lib/types/events";

interface ScheduleListProps {
  items: ScheduleItem[];
  basePath: string;
}

export function ScheduleList({ items, basePath }: ScheduleListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-5 py-10 text-center text-sm text-muted">
        No upcoming activities. Book a session or register for an event to see your schedule.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const href =
          item.kind === "booking"
            ? `${basePath}/bookings/${item.id}`
            : `${basePath}/events/${item.id}`;
        return (
          <li key={`${item.kind}-${item.id}`}>
            <Link
              href={href}
              className="flex items-start gap-3 rounded-lg border border-ink-border bg-ink-soft/60 px-4 py-3 transition-colors hover:border-primary/40"
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs",
                  item.kind === "booking"
                    ? "bg-blue-500/10 text-blue-500"
                    : "bg-primary-soft text-primary",
                )}
              >
                {item.kind === "booking" ? (
                  <Dumbbell className="h-4 w-4" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <Badge variant={item.kind === "booking" ? "outline" : "neutral"} className="shrink-0">
                    {item.kind === "booking" ? "Booking" : "Event"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDate(item.start_at, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {item.end_at
                    ? ` – ${formatDate(item.end_at, { hour: "numeric", minute: "2-digit" })}`
                    : ""}
                </p>
                {item.location ? (
                  <p className="text-xs text-muted">{item.location}</p>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
