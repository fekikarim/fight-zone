import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsCard, type NewsItem } from "@/components/marketing/news-card";
import { getPublishedNews, resolveOrFallback } from "@/lib/supabase/queries";

export async function NewsPreview() {
  const articles = await resolveOrFallback(() => getPublishedNews(3), []);

  return (
    <section className="border-t border-ink-border bg-ink-soft/30 py-20 lg:py-28">
      <Container>
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <SectionHeading
              eyebrow="News & Blog"
              title="From the corner"
              description="Training insights, event recaps and the fight philosophy of Coach Seif Dridi."
            />
          </Reveal>
          <Reveal delay={100}>
            <Button variant="outline" asChild>
              <Link href="/news">
                All articles
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>

        {articles.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, i) => (
              <Reveal key={article.id} delay={i * 80}>
                <NewsCard article={article as NewsItem} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
            <Newspaper className="h-10 w-10 text-primary" />
            <p className="text-muted">No articles published yet — the first one is coming soon.</p>
          </div>
        )}
      </Container>
    </section>
  );
}

export function NewsPreviewSkeleton() {
  return (
    <section className="border-t border-ink-border bg-ink-soft/30 py-20 lg:py-28">
      <Container>
        <div className="mb-12">
          <div className="h-12 w-2/3 skeleton rounded" />
          <div className="mt-3 h-4 w-1/2 skeleton rounded" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-ink-border">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="p-5">
                <Skeleton className="h-4 w-28" />
                <div className="mt-2 h-5 w-3/4" />
                <div className="mt-3 h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
