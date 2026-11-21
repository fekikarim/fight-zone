import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  /** "panel" (default) is a bordered block; "inline" sits inside a card. */
  variant?: "panel" | "inline";
  className?: string;
}

/** Explains why nothing is shown and, where useful, the next action. */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  variant = "panel",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 text-center",
        variant === "panel" ? "rounded-lg border border-dashed border-ink-strong py-14" : "py-10",
        className,
      )}
    >
      {icon ? (
        <span className="relative flex h-12 w-12 items-center justify-center text-primary [&_svg]:h-5 [&_svg]:w-5">
          <span className="absolute inset-0 -skew-x-12 rounded-sm bg-primary-soft" aria-hidden />
          <span className="relative">{icon}</span>
        </span>
      ) : null}
      <h2 className="font-display text-lg font-semibold uppercase tracking-[0.02em]">{title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted text-pretty">{description}</p>
      {actionLabel && actionHref ? (
        <Button asChild size="sm" className="mt-2">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
