import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, User } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { newsCategoryLabel } from "@/lib/types/content";
import type { NewsItemWithAuthor } from "@/lib/types/content";

/** Shown when the article has no custom cover. */
export const DEFAULT_NEWS_IMAGE = "/assets/default_news.jpg";

export function NewsCard({ article }: { article: NewsItemWithAuthor }) {
  return (
    <Card className="group h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-softer">
        <Image
          src={article.cover_image_url || DEFAULT_NEWS_IMAGE}
          alt={article.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full border border-primary/25 bg-ink-base/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary backdrop-blur-sm">
          {newsCategoryLabel[article.category] ?? article.category}
        </span>
      </div>
      <CardContent className="flex flex-col gap-3 p-5">
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-widest text-primary">
          {article.published_at ? (
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(article.published_at)}
            </span>
          ) : null}
          {article.author_name ? (
            <span className="inline-flex items-center gap-1.5 text-muted">
              <User className="h-3.5 w-3.5" />
              {article.author_name}
            </span>
          ) : null}
        </span>
        <CardTitle className="line-clamp-2 text-lg">{article.title}</CardTitle>
        {article.excerpt ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted">{article.excerpt}</p>
        ) : null}
        <Link
          href={`/news/${article.slug}`}
          className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          Read more
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
