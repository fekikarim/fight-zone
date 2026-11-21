import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Newspaper } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState } from "@/components/empty-state";
import { NewsCard } from "@/components/marketing/news-card";
import { PageHero } from "@/components/marketing/page-hero";
import { PreviewModeBanner } from "@/components/preview/preview-mode-banner";
import { getPublishedNews } from "@/lib/supabase/queries";
import { NEWS_CATEGORIES } from "@/lib/validations/content";
import { newsCategoryLabel } from "@/lib/types/content";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "News & Blog",
  description:
    "Training advice, event recaps and announcements from Coach Seif Dridi and Fight Zone.",
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

  const [lead, ...rest] = visible;
  const tabCls = (on: boolean) =>
    cn(
      "relative inline-flex h-11 shrink-0 items-center px-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] transition-colors",
      on ? "text-foreground" : "text-muted hover:text-foreground",
    );
  const bar = (on: boolean) => (
    <span
      aria-hidden
      className={cn(
        "absolute inset-x-3 -bottom-px h-[3px] origin-left -skew-x-12 bg-primary transition-transform duration-200",
        on ? "scale-x-100" : "scale-x-0",
      )}
    />
  );

  return (
    <>
      <PageHero
        eyebrow="News"
        title="From the corner"
        description="Training advice, event recaps and announcements from Coach Seif and Fight Zone."
      />
      <PreviewModeBanner />

      <section className="py-12 lg:py-16">
        <Container>
          <nav aria-label="Categories" className="-mx-4 flex gap-1 overflow-x-auto border-b border-ink-border px-4 sm:mx-0 sm:px-0">
            <Link href="/news" aria-current={!active ? "page" : undefined} className={tabCls(!active)}>
              All{bar(!active)}
            </Link>
            {NEWS_CATEGORIES.map((c) => (
              <Link key={c} href={`/news?category=${c}`} aria-current={active === c ? "page" : undefined} className={tabCls(active === c)}>
                {newsCategoryLabel[c]}
                {bar(active === c)}
              </Link>
            ))}
          </nav>

          {lead ? (
            <div className="mt-10 flex flex-col gap-5 lg:gap-6">
              <Reveal>
                <NewsCard article={lead} variant="feature" />
              </Reveal>
              {rest.length ? (
                <Reveal variant="stagger" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {rest.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </Reveal>
              ) : null}
            </div>
          ) : (
            <EmptyState
              className="mt-10"
              icon={<Newspaper />}
              title={active ? `No ${newsCategoryLabel[active].toLowerCase()} articles yet` : "No articles yet"}
              description={active ? "Try another category — or come back soon." : "The first article is on its way."}
              actionLabel={active ? "Show all news" : undefined}
              actionHref={active ? "/news" : undefined}
            />
          )}
        </Container>
      </section>
    </>
  );
}
