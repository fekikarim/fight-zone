import type { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const statusMeta: Record<
  BookingStatus,
  { label: string; dot: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    dot: "bg-amber-400",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  CONFIRMED: {
    label: "Confirmed",
    dot: "bg-emerald-400",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  COMPLETED: {
    label: "Completed",
    dot: "bg-sky-400",
    className: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  },
  CANCELLED: {
    label: "Cancelled",
    dot: "bg-zinc-400",
    className: "border-ink-border bg-ink-soft text-muted",
  },
  NO_SHOW: {
    label: "No show",
    dot: "bg-red-400",
    className: "border-red-400/30 bg-red-400/10 text-red-300",
  },
};

/**
 * Booking status badge, shared by the member and coach/admin areas. The status
 * is always conveyed as text, never by color alone — the dot is decorative
 * (aria-hidden).
 */
export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
        meta.className,
        className,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
