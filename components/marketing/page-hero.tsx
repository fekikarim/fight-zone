import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  /** Kept for API compatibility; inner pages are type-led (no mood image). */
  image?: string;
  /** Optional content under the description (filters, meta, actions). */
  children?: ReactNode;
}

/**
 * Inner-page hero: oversized display title that rises line by line once on
 * load, the brand's slanted bar, and a hairline closing the band. No
 * background photograph — the page's own content is the picture.
 */
export function PageHero({ eyebrow, title, description, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-ink-border">
      <div
        className="pointer-events-none absolute -right-24 top-0 h-full w-[46%] -skew-x-12 bg-gradient-to-b from-primary/[0.09] to-transparent"
        aria-hidden
      />
      <Container className="relative pb-12 pt-28 sm:pb-16 sm:pt-36">
        <p className="type-overline flex items-center gap-3 text-muted">
          <span className="slant-bar sweep" aria-hidden />
          {eyebrow}
        </p>
        <h1 className="type-h1 mt-5 max-w-4xl text-balance">
          <span className="rise-line"><span>{title}</span></span>
        </h1>
        {description ? (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted text-pretty animate-fade-up [animation-delay:120ms] sm:text-lg">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-8 animate-fade-up [animation-delay:200ms]">{children}</div> : null}
      </Container>
    </section>
  );
}
