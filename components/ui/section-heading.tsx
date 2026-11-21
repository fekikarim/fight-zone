import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  /** Optional "round" number shown before the eyebrow (01, 02…). */
  index?: string;
  /** Render on the light bone band. */
  tone?: "dark" | "light";
}

/** Public section heading: slanted bar + overline, display H2, short lead. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  index,
  tone = "dark",
  className,
  id,
  ...props
}: SectionHeadingProps) {
  return (
    <div
      className={cn("flex flex-col gap-4", align === "center" && "items-center text-center", className)}
      {...props}
    >
      {eyebrow ? (
        <p className={cn("type-overline flex items-center gap-3", tone === "light" ? "text-bone-muted" : "text-muted")}>
          {index ? <span className="font-display text-sm tracking-[0.1em] text-primary">{index}</span> : null}
          <span className="slant-bar" aria-hidden />
          {eyebrow}
        </p>
      ) : null}
      <h2 id={id} className={cn("type-h2 max-w-3xl text-balance", tone === "light" && "text-bone-ink")}>{title}</h2>
      {description ? (
        <p
          className={cn(
            "max-w-2xl text-base leading-relaxed text-pretty sm:text-lg",
            tone === "light" ? "text-bone-muted" : "text-muted",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
