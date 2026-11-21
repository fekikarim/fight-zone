import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsCard } from "@/components/marketing/news-card";
import { getPublishedNews, resolveOrFallback } from "@/lib/supabase/queries";

/** Editorial block: the latest article large, the next two stacked. Hidden when there is no news. */
export async function NewsPreview() {
  const articles = await resolveOrFallback(() => getPublishedNews(3), []);
  if (articles.length === 0) return null;
  const [lead, ...rest] = articles;

  return (
    <section aria-labelledby="news-h" className="border-t border-ink-border py-20 lg:py-28">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <SectionHeading id="news-h" index="05" eyebrow="News" title="From the corner" />
          </Reveal>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/news">
              All articles
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <Reveal variant="stagger" className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-6">
          <NewsCard article={lead} />
          {rest.length ? (
            <div className="grid gap-5 lg:gap-6">
              {rest.map((article) => (
                <NewsCard key={article.id} article={article} variant="compact" />
              ))}
            </div>
          ) : null}
        </Reveal>
      </Container>
    </section>
  );
}

export function NewsPreviewSkeleton() {
  return (
    <section className="border-t border-ink-border py-20 lg:py-28">
      <Container>
        <Skeleton className="h-14 w-1/2" />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Skeleton className="aspect-[16/11] w-full rounded-lg" />
          <div className="grid gap-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </Container>
    </section>
  );
}
