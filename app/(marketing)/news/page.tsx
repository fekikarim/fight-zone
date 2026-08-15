import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { NewsCard, type NewsItem } from "@/components/marketing/news-card";
import { PageHero } from "@/components/marketing/page-hero";
import { getPublishedNews } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "News & Blog",
  description:
    "Training insights, event recaps and the fight philosophy of Coach Seif Dridi and the Fight Zone team.",
};

export default async function NewsPage() {
  const articles = await getPublishedNews();

  return (
    <>
      <PageHero
        eyebrow="News & Blog"
        title="From the corner"
        description="Insights, recaps and the philosophy that drives Fight Zone athletes."
        image="/components/flat-sport-medals-illustration-2000x2000.jpg"
      />

      <section className="py-16 lg:py-24">
        <Container>
          {articles.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article, i) => (
                <Reveal key={article.id} delay={(i % 3) * 80}>
                  <NewsCard article={article as NewsItem} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-14 text-center text-muted">
              No articles published yet — the first one is coming soon.
            </p>
          )}
        </Container>
      </section>
    </>
  );
}
