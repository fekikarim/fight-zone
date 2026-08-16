"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database.types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const statusOptions: { value: BookingStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
];

const selectClass =
  "h-11 rounded-md border border-ink-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-ring disabled:opacity-50";

/**
 * URL-driven booking filters (status, date range, free-text search). Every
 * change rewrites `searchParams` so the list stays shareable and server-side
 * filtered; the search input is debounced to avoid spamming the router.
 */
export function BookingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(
    (next: URLSearchParams) => {
      const queryString = next.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const update = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams);
      next.delete("page");
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      push(next);
    },
    [push, searchParams],
  );

  const onSearchChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => update({ q: value.trim() || undefined }), 350);
  };

  const reset = () => push(new URLSearchParams());

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="booking-status" className="text-xs font-semibold uppercase tracking-widest text-muted">
          Status
        </label>
        <select
          id="booking-status"
          className={selectClass}
          value={searchParams.get("status") ?? ""}
          onChange={(event) => update({ status: event.target.value || undefined })}
        >
          {statusOptions.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="booking-from" className="text-xs font-semibold uppercase tracking-widest text-muted">
          From
        </label>
        <Input
          id="booking-from"
          type="datetime-local"
          value={searchParams.get("from") ?? ""}
          onChange={(event) => update({ from: event.target.value || undefined })}
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="booking-to" className="text-xs font-semibold uppercase tracking-widest text-muted">
          To
        </label>
        <Input
          id="booking-to"
          type="datetime-local"
          value={searchParams.get("to") ?? ""}
          onChange={(event) => update({ to: event.target.value || undefined })}
          className="h-11"
        />
      </div>

      <div className="flex flex-col gap-1.5 lg:flex-1">
        <label htmlFor="booking-search" className="text-xs font-semibold uppercase tracking-widest text-muted">
          Search member
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            id="booking-search"
            type="search"
            placeholder="Name or email…"
            value={query}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 pl-9"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={reset}
        className="h-11 self-start lg:self-auto"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Reset filters
      </Button>
    </div>
  );
}
