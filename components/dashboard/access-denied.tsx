import Link from "next/link";

/**
 * Distinct "unauthorized" state for signed-in users who lack an admin role.
 * Intentionally different from the fatal error boundary: no retry affordance
 * (retrying cannot change authorization) and clear navigation out of the area.
 */
export function AccessDenied({ returnHref = "/", returnLabel = "Back home" }: {
  returnHref?: string;
  returnLabel?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-6xl font-bold text-primary">403</p>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
          Access restricted
        </h1>
        <p className="max-w-md text-sm text-muted">
          Your account doesn&apos;t have permission to view this area. If you
          believe this is a mistake, contact the gym and staff can upgrade your
          access.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={returnHref}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-7 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {returnLabel}
        </Link>
        <Link
          href="/contact"
          className="inline-flex h-11 items-center justify-center rounded-md border border-ink-border px-7 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Contact us
        </Link>
      </div>
    </div>
  );
}
