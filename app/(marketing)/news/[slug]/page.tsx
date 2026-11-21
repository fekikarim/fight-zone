import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { RichText } from "@/lib/cms/rich-text";
import { isRemoteImage } from "@/lib/events/images";
import { DEFAULT_NEWS_IMAGE, NewsCard } from "@/components/marketing/news-card";
import { getNewsBySlug, getPublishedNews } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";
import { newsCategoryLabel } from "@/lib/types/content";
import { NotFoundError } from "@/lib/errors";

interface NewsArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: NewsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getNewsBySlug(slug);
    if (!article) return { title: "Article not found | Fight Zone" };
    return {
      title: article.title,
      description: article.excerpt ?? undefined,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { title: "Article not found" };
    }
    throw error;
  }
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);

  if (!article) notFound();

  const related = await getPublishedNews(3);

  const more = related.filter((a) => a.slug !== article.slug).slice(0, 2);
  const cover = article.cover_image_url || DEFAULT_NEWS_IMAGE;

  return (
    <>
      <header className="border-b border-ink-border pb-10 pt-28 sm:pt-36">
        <Container className="max-w-4xl">
          <Link
            href="/news"
            className="group inline-flex min-h-11 w-fit items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
            All news
          </Link>
          <p className="type-overline mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
            <span className="slant-bar h-1 w-4" aria-hidden />
            <span className="text-primary">{newsCategoryLabel[article.category] ?? article.category}</span>
            {article.published_at ? (
              <time dateTime={article.published_at}>
                {formatDate(article.published_at, { month: "long", day: "numeric", year: "numeric" })}
              </time>
            ) : null}
          </p>
          <h1 className="type-h1 mt-5 text-balance">{article.title}</h1>
          {article.excerpt ? (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-foreground/75 text-pretty sm:text-xl">{article.excerpt}</p>
          ) : null}
          {article.author_name ? (
            <p className="mt-6 text-sm text-muted">
              By <span className="font-semibold text-foreground">{article.author_name}</span>
            </p>
          ) : null}
        </Container>
      </header>

      <article className="pb-20 pt-10 lg:pb-28">
        <Container className="max-w-5xl">
          <div className={`${article.cover_image_url ? "" : "duotone "}relative mb-12 aspect-[16/8] overflow-hidden rounded-lg border border-ink-border`}>
            <Image
              src={cover}
              alt=""
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              unoptimized={isRemoteImage(cover)}
              className="object-cover"
              priority
            />
          </div>
        </Container>
        <Container className="max-w-[44rem]">
          {article.content ? (
            <RichText
              text={article.content}
              className="text-[17px] leading-[1.75] text-foreground/85 [&_h2]:mt-12 [&_h2]:text-2xl [&_p]:my-5 sm:text-lg"
            />
          ) : (
            <p className="text-muted">This article is being prepared.</p>
          )}
        </Container>

        {more.length > 0 ? (
          <Container className="mt-20 max-w-5xl border-t border-ink-border pt-12">
            <h2 className="type-h3 mb-6">More from the corner</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {more.map((item) => (
                <NewsCard key={item.id} article={item} variant="compact" />
              ))}
            </div>
          </Container>
        ) : null}
      </article>
    </>
  );
}
