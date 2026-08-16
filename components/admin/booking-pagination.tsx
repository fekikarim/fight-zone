import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BookingPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Raw page searchParams so links preserve every active filter. */
  searchParams: Readonly<Record<string, string | string[] | undefined>>;
}

export function BookingPagination({ page, pageSize, total, searchParams }: BookingPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) continue;
      if (value) next.set(key, value);
    }
    next.set("page", String(target));
    return `/admin/bookings?${next.toString()}`;
  };

  const disabled = (disabled: boolean, children: React.ReactNode) =>
    disabled ? (
      <span
        aria-disabled="true"
        className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm opacity-50"
      >
        {children}
      </span>
    ) : (
      children
    );

  return (
    <nav
      aria-label="Booking pages"
      className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-border pt-5"
    >
      <p className="text-sm text-muted">
        {total} {total === 1 ? "booking" : "bookings"}
      </p>
      <div className="flex items-center gap-3">
        {disabled(
          page <= 1,
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page - 1)}>Previous</Link>
          </Button>,
        )}
        <span className={cn("text-sm", totalPages === 1 ? "text-muted" : "text-foreground")}>
          Page {page} of {totalPages}
        </span>
        {disabled(
          page >= totalPages,
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page + 1)}>Next</Link>
          </Button>,
        )}
      </div>
    </nav>
  );
}
