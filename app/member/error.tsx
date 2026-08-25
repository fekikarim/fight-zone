"use client";

import Link from "next/link";
import { AppError } from "@/lib/errors";
import { logBoundaryError } from "@/lib/boundary-log";
import { useEffect } from "react";

interface MemberErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MemberErrorPage({ error, reset }: MemberErrorPageProps) {
  useEffect(() => {
    logBoundaryError("MEMBER_PAGE", error);
  }, [error]);
  const message =
    error instanceof AppError
      ? error.userMessage
      : "Something went wrong loading your dashboard.";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="relative">
        <p className="font-display text-8xl font-bold text-ink-soft">404</p>
        <p className="absolute inset-0 flex items-center justify-center font-display text-4xl font-bold text-primary uppercase">Off the mat</p>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-white">
          Something went wrong
        </h1>
        <p className="max-w-md text-sm text-zinc-400">
          Even the best fighters need to pause. {message} Take a breather and try again.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row mt-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-7 text-sm font-medium uppercase tracking-wide text-ink-base transition-colors hover:bg-primary-hover"
        >
          Try again
        </button>
        <Link
          href="/member"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink-border px-7 text-sm font-medium uppercase tracking-wide text-white transition-colors hover:border-primary hover:text-primary"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
