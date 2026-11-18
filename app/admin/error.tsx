"use client";

import { RouteErrorView } from "@/components/route-error-view";

export default function AdminErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      scope="ADMIN_PAGE"
      title="Admin area unavailable"
      fallbackMessage="Something went wrong loading this page."
      backHref="/admin"
      backLabel="Back to overview"
    />
  );
}
