import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreviewEntryBar } from "@/components/preview/preview-entry-bar";
import { PageHeader } from "@/components/dashboard/page-header";
import { getAdminNews } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";
import { newsCategoryLabel } from "@/lib/types/content";

export const metadata: Metadata = {
  title: "News Management",
  description: "Create, edit, and manage news articles.",
};

export default async function AdminNewsPage() {
  const articles = await getAdminNews();

  return (
    <div className="space-y-8">
      <PreviewEntryBar returnTo="/news" subject="articles" />
      <PageHeader
        eyebrow="Publish"
        title="News & Articles"
        description={`${articles.length} article${articles.length !== 1 ? "s" : ""}`}
        actions={
          <Button asChild className="gap-2">
            <Link href="/admin/news/new">
              <Plus className="h-4 w-4" />
              New article
            </Link>
          </Button>
        }
      />

      {articles.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-ink-border bg-ink-soft/40 px-6 py-14 text-center">
          <p className="text-muted">No articles yet — write your first one to get started.</p>
          <Button asChild className="gap-2">
            <Link href="/admin/news/new">
              <Plus className="h-4 w-4" />
              New article
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/admin/news/${article.id}`}
              className="flex flex-col gap-2 rounded-lg border border-ink-border bg-ink-soft/30 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5 active:bg-primary/10 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{article.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  /{article.slug} · {newsCategoryLabel[article.category] ?? article.category}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    article.is_published
                      ? "bg-primary/10 text-primary"
                      : "bg-ink-soft text-muted"
                  }`}
                >
                  {article.is_published ? "Published" : "Draft"}
                </span>
                <span>{formatDate(article.created_at, { year: "numeric", month: "short", day: "numeric" })}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
