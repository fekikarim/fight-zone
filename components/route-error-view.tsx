"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { AppError } from "@/lib/errors";
import { logBoundaryError } from "@/lib/boundary-log";

interface RouteErrorViewProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Log scope (e.g. "ADMIN_CALENDAR"). */
  scope: string;
  title: string;
  fallbackMessage: string;
  backHref: string;
  backLabel: string;
  /** Fill the viewport (top-level boundary) instead of the content area. */
  fullScreen?: boolean;
}

const RELOAD_FLAG = "fz:chunk-reload";

/** Stale JS after a new deploy: the cure is a full reload, not a retry. */
function isChunkError(error: Error): boolean {
  const text = `${error.name} ${error.message}`;
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    text,
  );
}

/**
 * Shared route error boundary UI. "Try again" re-fetches server data
 * (router.refresh) before resetting — a plain reset() re-renders the same
 * failed server payload. Stale-chunk errors after a deploy reload once
 * automatically. The digest is shown so a failure can be traced in logs.
 */
export function RouteErrorView({
  error,
  reset,
  scope,
  title,
  fallbackMessage,
  backHref,
  backLabel,
  fullScreen,
}: RouteErrorViewProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const chunkError = isChunkError(error);

  useEffect(() => {
    logBoundaryError(scope, error);
    if (!chunkError) return;
    try {
      if (sessionStorage.getItem(RELOAD_FLAG) !== "1") {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        return;
      }
    } catch {
      // Storage unavailable: fall through to the manual reload button.
    }
  }, [error, scope, chunkError]);

  useEffect(() => {
    // A successful render elsewhere clears the one-shot reload guard.
    const timer = setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        // ignore
      }
    }, 10_000);
    return () => clearTimeout(timer);
  }, []);

  const message = chunkError
    ? "A new version of Fight Zone was just released. Reload the page to continue."
    : error instanceof AppError
      ? error.userMessage
      : typeof navigator !== "undefined" && navigator.onLine === false
        ? "You appear to be offline. Check your connection and try again."
        : fallbackMessage;

  const retry = () => {
    if (chunkError) {
      window.location.reload();
      return;
    }
    setRetrying(true);
    startTransition(() => {
      router.refresh();
      reset();
    });
    setTimeout(() => setRetrying(false), 1500);
  };

  return (
    <div
      role="alert"
      className={`flex ${fullScreen ? "min-h-dvh" : "min-h-[60vh]"} flex-col items-center justify-center gap-6 bg-background px-6 text-center`}
    >
      <p className="font-display text-6xl font-bold text-primary">Oops</p>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">{title}</h1>
        <p className="max-w-md text-sm text-muted">{message}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-7 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-70"
        >
          <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
          {chunkError ? "Reload page" : retrying ? "Retrying…" : "Try again"}
        </button>
        <Link
          href={backHref}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink-border px-7 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {backLabel}
        </Link>
      </div>
      {error.digest ? (
        <p className="text-[11px] text-muted/70">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </div>
  );
}
