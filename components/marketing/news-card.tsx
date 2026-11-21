import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { newsCategoryLabel } from "@/lib/types/content";
import type { NewsItemWithAuthor } from "@/lib/types/content";
import { isRemoteImage } from "@/lib/events/images";

/** Shown when the article has no custom cover. */
export const DEFAULT_NEWS_IMAGE = "/assets/default_news.jpg";

interface NewsCardProps {
  article: NewsItemWithAuthor;
  /** "default" grid card · "feature" large lead · "compact" horizontal row. */
  variant?: "default" | "feature" | "compact";
}

/** One linked card per article: the whole card is the link (lift + zoom). */
export function NewsCard({ article, variant = "default" }: NewsCardProps) {
  const cover = article.cover_image_url || DEFAULT_NEWS_IMAGE;
  const custom = Boolean(article.cover_image_url);
  const meta = (
    <p className="type-overline flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
      <span className="text-primary">{newsCategoryLabel[article.category] ?? article.category}</span>
      {article.published_at ? (
        <>
          <span aria-hidden>·</span>
          <time dateTime={article.published_at} className="text-muted-foreground">
            {formatDate(article.published_at, { month: "short", day: "numeric", year: "numeric" })}
          </time>
        </>
      ) : null}
    </p>
  );
  const image = (sizes: string) => (
    <div className={cn("zoom-img relative overflow-hidden bg-ink-softer", !custom && "duotone")}>
      <Image src={cover} alt="" fill sizes={sizes} unoptimized={isRemoteImage(cover)} className="object-cover" />
    </div>
  );

  if (variant === "compact") {
    return (
      <Link
        href={`/news/${article.slug}`}
        className="group lift grid grid-cols-[7.5rem_1fr] overflow-hidden rounded-lg border border-ink-border bg-ink-soft sm:grid-cols-[11rem_1fr]"
      >
        <div className="relative [&>div]:absolute [&>div]:inset-0">{image("176px")}</div>
        <div className="flex min-w-0 flex-col gap-2 p-4 sm:p-5">
          {meta}
          <h3 className="line-clamp-2 font-display text-lg font-semibold uppercase leading-tight">{article.title}</h3>
          {article.excerpt ? <p className="line-clamp-2 hidden text-sm text-muted sm:block">{article.excerpt}</p> : null}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/news/${article.slug}`}
      className={cn(
        "group lift flex h-full flex-col overflow-hidden rounded-lg border border-ink-border bg-ink-soft",
        variant === "feature" && "lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]",
      )}
    >
      <div className={cn("relative aspect-[16/10] [&>div]:absolute [&>div]:inset-0", variant === "feature" && "lg:aspect-auto lg:min-h-[22rem]")}>
        {image(variant === "feature" ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw")}
      </div>
      <div className={cn("flex flex-1 flex-col gap-3 p-5 sm:p-6", variant === "feature" && "lg:justify-center lg:p-10")}>
        {meta}
        <h3
          className={cn(
            "flex items-start justify-between gap-3 font-display font-semibold uppercase leading-tight text-balance",
            variant === "feature" ? "text-2xl sm:text-3xl" : "text-xl",
          )}
        >
          <span className="line-clamp-3">{article.title}</span>
          <ArrowUpRight
            className="mt-1 h-5 w-5 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden
          />
        </h3>
        {article.excerpt ? (
          <p className={cn("text-sm leading-relaxed text-muted", variant === "feature" ? "line-clamp-3 sm:text-base" : "line-clamp-3")}>
            {article.excerpt}
          </p>
        ) : null}
        {article.author_name ? <p className="mt-auto pt-2 text-xs text-muted-foreground">By {article.author_name}</p> : null}
      </div>
    </Link>
  );
}
