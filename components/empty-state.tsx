import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
      {icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          {icon}
        </span>
      ) : null}
      <h2 className="font-display text-lg font-semibold uppercase tracking-wide">
        {title}
      </h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {actionLabel && actionHref ? (
        <Button asChild size="sm" className="mt-2">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
