import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { getNewsBySlug, getPublishedNews } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";
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
    return {
      title: article.title,
      description: article.content?.slice(0, 160),
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

  return (
    <>
      <section className="border-b border-ink-border bg-ink-soft/40 pt-32 pb-10 sm:pt-40">
        <Container className="flex flex-col gap-6">
          <Link
            href="/news"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to news
          </Link>
          <div className="max-w-3xl">
            {article.published_at ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                <CalendarDays className="h-4 w-4" />
                {formatDate(article.published_at)}
              </span>
            ) : null}
            <h1 className="mt-4 font-display text-3xl font-bold uppercase leading-tight tracking-tight text-balance sm:text-5xl">
              {article.title}
            </h1>
          </div>
        </Container>
      </section>

      <article className="py-10 lg:py-14">
        <Container className="max-w-4xl">
          {article.cover_image_url ? (
            <div className="relative mb-10 aspect-[16/8] overflow-hidden rounded-2xl border border-ink-border">
              <Image
                src={article.cover_image_url}
                alt={article.title}
                fill
                sizes="(min-width: 1024px) 896px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <PlaceholderImage label="Article image" className="mb-10 aspect-[16/8]" />
          )}

          {article.content ? (
            <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:uppercase prose-headings:tracking-wide prose-p:text-muted prose-p:leading-relaxed prose-a:text-primary">
              {article.content.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted">This article is being prepared.</p>
          )}

          <Separator className="my-12" />

          {related.length > 0 ? (
            <div>
              <h2 className="mb-6 font-display text-2xl font-bold uppercase tracking-wide">
                More from the corner
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {related
                  .filter((a) => a.slug !== article.slug)
                  .slice(0, 3)
                  .map((item) => (
                    <Link
                      key={item.id}
                      href={`/news/${item.slug}`}
                      className="group rounded-lg border border-ink-border bg-ink-soft/50 p-4 transition-colors hover:border-primary/40"
                    >
                      <p className="font-display text-base font-semibold uppercase leading-snug group-hover:text-primary">
                        {item.title}
                      </p>
                      {item.published_at ? (
                        <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                          {formatDate(item.published_at)}
                        </p>
                      ) : null}
                    </Link>
                  ))}
              </div>
            </div>
          ) : null}
        </Container>
      </article>
    </>
  );
}
