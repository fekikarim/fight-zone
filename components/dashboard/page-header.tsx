import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Small overline above the title (section of the portal). */
  eyebrow?: string;
  /** Back link shown above the title (e.g. to the list page). */
  back?: { href: string; label: string };
  /** Primary actions (e.g. "New event"). Full-width on phones. */
  actions?: ReactNode;
}

/**
 * Dashboard page header (member + admin). Title in the display face with
 * the brand's slanted bar; actions stack full-width on phones.
 */
export function PageHeader({ title, description, eyebrow, back, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 pb-2">
      {back ? (
        <Link
          href={back.href}
          className="-ml-1 inline-flex min-h-9 w-fit items-center gap-1.5 rounded-md px-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? (
            <p className="type-overline flex items-center gap-2.5 text-muted">
              <span className="slant-bar h-1 w-4" aria-hidden />
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          {description ? <p className="max-w-2xl text-sm leading-relaxed text-muted">{description}</p> : null}
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
