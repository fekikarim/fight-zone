import { Quote, Trophy } from "lucide-react";
import Link from "next/link";
import { RichText } from "@/lib/cms/rich-text";
import { toEmbedUrl, type CmsBlock } from "@/lib/cms/blocks";
import { cn } from "@/lib/utils";

export interface AchievementLite {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  image_url: string | null;
}

const bg: Record<string, string> = {
  default: "",
  muted: "bg-ink-soft",
  accent: "bg-bone text-bone-ink",
};

/**
 * Renders validated CMS blocks. Pure (no data fetching) so the editor can
 * reuse it for live preview. Every block is width-safe: long words wrap,
 * media keep their ratio, grids collapse on narrow screens.
 */
export function BlockRenderer({ blocks, achievements = [] }: { blocks: CmsBlock[]; achievements?: AchievementLite[] }) {
  return (
    <div className="flex flex-col">
      {blocks.map((b) => (
        <section key={b.id} className={cn("px-4 py-12 sm:px-6 sm:py-16 lg:px-8", bg[b.background] ?? "")}>
          <div className="mx-auto w-full max-w-7xl break-words">{renderBlock(b, achievements)}</div>
        </section>
      ))}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="type-h2 mb-8 text-balance">{children}</h2>;
}

function renderBlock(b: CmsBlock, achievements: AchievementLite[]) {
  switch (b.type) {
    case "hero":
      return (
        <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            {b.eyebrow ? <p className="type-overline flex items-center gap-3 text-muted"><span className="slant-bar" aria-hidden />{b.eyebrow}</p> : null}
            <h1 className="type-h1 mt-5 text-balance">{b.title}</h1>
            {b.subtitle ? <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">{b.subtitle}</p> : null}
          </div>
          {b.image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.image.url} alt={b.image.alt} className="aspect-[4/5] w-full rounded-2xl object-cover md:aspect-square" loading="eager" />
          ) : null}
        </div>
      );
    case "richText":
      return (
        <div className="max-w-3xl">
          {b.heading ? <Heading>{b.heading}</Heading> : null}
          <RichText text={b.text} className="text-base leading-relaxed text-foreground/85" />
        </div>
      );
    case "image":
      return (
        <figure className={cn(b.align === "full" ? "" : "mx-auto max-w-3xl", b.align === "left" && "md:mr-auto md:ml-0", b.align === "right" && "md:ml-auto md:mr-0")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.image.url} alt={b.image.alt} loading="lazy" className="max-h-[70vh] w-full rounded-2xl object-cover" />
          {b.caption ? <figcaption className="mt-2 text-center text-sm text-muted">{b.caption}</figcaption> : null}
        </figure>
      );
    case "gallery":
      return (
        <div>
          {b.heading ? <Heading>{b.heading}</Heading> : null}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {b.images.map((img, i) => (
              <li key={`${img.url}-${i}`} className="overflow-hidden rounded-xl bg-ink-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} loading="lazy" className="aspect-square h-full w-full object-cover" />
              </li>
            ))}
          </ul>
        </div>
      );
    case "video": {
      const src = toEmbedUrl(b.url);
      if (!src) return null;
      return (
        <div className="mx-auto max-w-4xl">
          {b.heading ? <Heading>{b.heading}</Heading> : null}
          <div className="aspect-video overflow-hidden rounded-2xl bg-black">
            <iframe src={src} title={b.heading || b.caption || "Video"} className="h-full w-full" loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
          </div>
          {b.caption ? <p className="mt-2 text-center text-sm text-muted">{b.caption}</p> : null}
        </div>
      );
    }
    case "stats":
      return (
        <div>
          {b.heading ? <Heading>{b.heading}</Heading> : null}
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {b.items.map((s, i) => (
              <div key={i} className="rounded-xl border border-ink-border bg-ink-soft/40 p-4 text-center">
                <dd className="font-display text-3xl font-bold text-primary">{s.value}</dd>
                <dt className="mt-1 text-xs uppercase tracking-wide text-muted">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      );
    case "timeline":
      return (
        <div className="max-w-3xl">
          {b.heading ? <Heading>{b.heading}</Heading> : null}
          <ol className="relative space-y-6 border-l border-ink-border pl-6">
            {b.items.map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t.when}</p>
                <p className="font-display text-lg font-semibold uppercase">{t.title}</p>
                {t.text ? <p className="mt-1 text-sm text-muted">{t.text}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      );
    case "values":
      return (
        <div>
          {b.heading ? <Heading>{b.heading}</Heading> : null}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {b.items.map((v, i) => (
              <li key={i} className="rounded-xl border border-ink-border bg-ink-soft/40 p-5">
                <p className="font-display text-lg font-semibold uppercase tracking-tight">{v.title}</p>
                {v.text ? <p className="mt-2 text-sm text-muted">{v.text}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      );
    case "achievements": {
      const list = achievements.slice(0, b.limit);
      if (!list.length) return null;
      return (
        <div>
          {b.heading ? <Heading>{b.heading}</Heading> : null}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <li key={a.id} className="flex gap-3 rounded-xl border border-ink-border bg-ink-soft/40 p-4">
                <Trophy className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold">{a.title}</p>
                  {a.date ? <p className="text-xs text-muted">{new Date(a.date).getFullYear()}</p> : null}
                  {a.description ? <p className="mt-1 text-sm text-muted">{a.description}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "quote":
      return (
        <figure className="mx-auto max-w-3xl text-center">
          <Quote className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <blockquote className="mt-4 font-display text-xl leading-snug sm:text-2xl">“{b.text}”</blockquote>
          {b.author ? <figcaption className="mt-3 text-sm text-muted">— {b.author}</figcaption> : null}
        </figure>
      );
    case "cta":
      return (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-primary/30 bg-primary-soft/30 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="font-display text-2xl font-bold uppercase tracking-tight">{b.title}</p>
            {b.text ? <p className="mt-1 text-sm text-muted">{b.text}</p> : null}
          </div>
          <Link href={b.href} className="inline-flex h-11 shrink-0 items-center rounded-md bg-primary px-6 text-sm font-medium text-white hover:bg-primary-hover">
            {b.label}
          </Link>
        </div>
      );
    case "divider":
      return <div className={cn(b.size === "sm" ? "py-1" : b.size === "lg" ? "py-8" : "py-4")}>{b.line ? <hr className="border-ink-border" /> : null}</div>;
  }
}
