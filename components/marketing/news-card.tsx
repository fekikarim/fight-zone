import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/types/database.types";

export type NewsItem = Pick<
  Database["public"]["Tables"]["news"]["Row"],
  "id" | "title" | "slug" | "content" | "cover_image_url" | "published_at"
>;

export function NewsCard({ article }: { article: NewsItem }) {
  return (
    <Card className="group h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-softer">
        {article.cover_image_url ? (
          <Image
            src={article.cover_image_url}
            alt={article.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <PlaceholderImage label="Article image" className="h-full rounded-none border-0" />
        )}
      </div>
      <CardContent className="flex flex-col gap-3 p-5">
        {article.published_at ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(article.published_at)}
          </span>
        ) : null}
        <CardTitle className="line-clamp-2 text-lg">{article.title}</CardTitle>
        {article.content ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted">{article.content}</p>
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
