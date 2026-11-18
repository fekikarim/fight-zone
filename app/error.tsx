"use client";

import { RouteErrorView } from "@/components/route-error-view";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      scope="public-page"
      title="Something went wrong"
      fallbackMessage="Something went wrong on this page."
      backHref="/"
      backLabel="Back to home"
      fullScreen
    />
  );
}
