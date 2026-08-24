"use client";

import Link from "next/link";
import { useEffect } from "react";
import { logBoundaryError } from "@/lib/boundary-log";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logBoundaryError("global", error);
  }, [error]);
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#0a0a0a] px-6 text-center text-[#fafafa]">
          <p className="font-display text-6xl font-bold text-[#e11d48]">Oops</p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
            Critical error
          </h1>
          <p className="max-w-md text-sm text-[#a1a1aa]">
            Something went very wrong. Try reloading the page.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#e11d48] px-7 text-sm font-medium text-white transition-colors hover:bg-[#be123c]"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#26262b] px-7 text-sm font-medium transition-colors hover:border-[#e11d48] hover:text-[#e11d48]"
            >
              Back home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
