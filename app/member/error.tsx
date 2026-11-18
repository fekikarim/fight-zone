"use client";

import { RouteErrorView } from "@/components/route-error-view";

export default function MemberErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      scope="MEMBER_PAGE"
      title="Something went wrong"
      fallbackMessage="Something went wrong loading your dashboard."
      backHref="/member"
      backLabel="Back to dashboard"
    />
  );
}
