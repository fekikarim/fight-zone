import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { getAdminBookings } from "@/lib/supabase/queries";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/empty-state";
import { BookingFilters } from "@/components/admin/booking-filters";
import { BookingsTable } from "@/components/admin/bookings-table";
import { BookingPagination } from "@/components/admin/booking-pagination";
import type { Database } from "@/types/database.types";

type SearchParams = Promise<Readonly<Record<string, string | string[] | undefined>>>;

export const metadata: Metadata = {
  title: "Bookings",
  description: "Manage Fight Zone session bookings.",
};

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const bookingStatuses: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

function toIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Admin/coach booking management. Server-side filters (status, date range,
 * member search) come from the URL, so results stay shareable and stable;
 * pagination and every action revalidate this page.
 */
export default async function AdminBookingsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const read = (key: string) => {
    const value = sp[key];
    return typeof value === "string" ? value : undefined;
  };

  const page = Math.max(1, Number(read("page")) || 1);
  const status = read("status");
  const validatedStatus = bookingStatuses.includes(status as BookingStatus)
    ? (status as BookingStatus)
    : undefined;

  const { rows, total, page: currentPage, pageSize } = await getAdminBookings({
    page,
    status: validatedStatus,
    from: toIso(read("from")),
    to: toIso(read("to")),
    query: read("q"),
  });

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Bookings
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Review, confirm and manage every session request. Filters and
          pagination are reflected in the URL so you can bookmark or share the
          exact view you are looking at.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-3 lg:grid-cols-[auto_auto_auto_1fr_auto]">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-11 animate-pulse rounded-md bg-ink-soft" />
            ))}
          </div>
        }
      >
        <BookingFilters />
      </Suspense>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-5">
          <BookingsTable rows={rows} />
          <BookingPagination
            page={currentPage}
            pageSize={pageSize}
            total={total}
            searchParams={sp}
          />
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          title="No bookings found"
          description="Try widening the date range, clearing the search, or switching status."
        />
      )}
    </Container>
  );
}
