import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Back link shown above the title (e.g. to the list page). */
  back?: { href: string; label: string };
  /** Primary actions (e.g. "New event"). Full-width on phones. */
  actions?: ReactNode;
}

/**
 * Consistent header for dashboard pages: back link, title, subtitle and
 * actions. Stacks on phones (actions become a full-width row under the
 * title) and sits side by side from `sm` up.
 */
export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      {back ? (
        <Link
          href={back.href}
          className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">{title}</h1>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
