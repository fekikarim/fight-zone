"use client";

import { RouteErrorView } from "@/components/route-error-view";

export default function CalendarErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      scope="ADMIN_CALENDAR"
      title="Calendar unavailable"
      fallbackMessage="Something went wrong loading the calendar."
      backHref="/admin"
      backLabel="Back to overview"
    />
  );
}
