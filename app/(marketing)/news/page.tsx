import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { NewsCard } from "@/components/marketing/news-card";
import { PageHero } from "@/components/marketing/page-hero";
import { getPublishedNews } from "@/lib/supabase/queries";
import { NEWS_CATEGORIES } from "@/lib/validations/content";
import { newsCategoryLabel } from "@/lib/types/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "News & Blog",
  description:
    "Training insights, event recaps and the fight philosophy of Coach Seif Dridi and the Fight Zone team.",
};

interface NewsPageProps {
  searchParams: Promise<{ category?: string | string[] }>;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const resolved = await searchParams;
  const raw = Array.isArray(resolved.category) ? resolved.category[0] : resolved.category;
  const active = (NEWS_CATEGORIES as readonly string[]).includes(raw ?? "")
    ? raw!
    : null;
  const articles = await getPublishedNews();
  const visible = active ? articles.filter((a) => a.category === active) : articles;

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
          <div className="mb-8 flex flex-wrap gap-2">
            <Link
              href="/news"
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors",
                !active
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-ink-border text-muted hover:border-primary/40 hover:text-white",
              )}
            >
              All
            </Link>
            {NEWS_CATEGORIES.map((c) => (
              <Link
                key={c}
                href={`/news?category=${c}`}
                aria-current={active === c ? "true" : undefined}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors",
                  active === c
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-ink-border text-muted hover:border-primary/40 hover:text-white",
                )}
              >
                {newsCategoryLabel[c]}
              </Link>
            ))}
          </div>

          {visible.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((article, i) => (
                <Reveal key={article.id} delay={(i % 3) * 80}>
                  <NewsCard article={article} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-14 text-center text-muted">
              {active
                ? `No ${newsCategoryLabel[active].toLowerCase()} articles yet — check back soon.`
                : "No articles published yet — the first one is coming soon."}
            </p>
          )}
        </Container>
      </section>
    </>
  );
}
