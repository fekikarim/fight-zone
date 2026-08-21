"use client";

import Link from "next/link";
import { AppError } from "@/lib/errors";

interface MemberErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MemberErrorPage({ error, reset }: MemberErrorPageProps) {
  const message =
    error instanceof AppError
      ? error.userMessage
      : "Something went wrong loading your dashboard.";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <p className="font-display text-6xl font-bold text-primary">Oops</p>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
          Member area unavailable
        </h1>
        <p className="max-w-md text-sm text-muted">{message}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-7 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Try again
        </button>
        <Link
          href="/member"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink-border px-7 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
