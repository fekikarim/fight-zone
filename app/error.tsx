"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AppError } from "@/lib/errors";
import { logBoundaryError } from "@/lib/boundary-log";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    logBoundaryError("public-page", error);
  }, [error]);
  const message =
    error instanceof AppError ? error.userMessage : "Something went wrong on this page.";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <p className="font-display text-6xl font-bold text-primary">Oops</p>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
          Something went wrong
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
          href="/"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink-border px-7 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
