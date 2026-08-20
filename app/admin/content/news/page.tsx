import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminNews } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "News Management",
  description: "Create, edit, and manage news articles.",
};

export default async function AdminNewsPage() {
  const articles = await getAdminNews();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">News & Articles</h1>
          <p className="mt-1 text-sm text-muted">
            {articles.length} article{articles.length !== 1 ? "s" : ""}
          </p>
        </header>
        <Button asChild size="sm" className="gap-2">
          <Link href="/admin/content/news/new">
            <Plus className="h-4 w-4" />
            New article
          </Link>
        </Button>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-ink-border bg-ink-soft/20 p-8 text-center">
          <p className="text-sm text-muted">No articles yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/admin/content/news/${article.id}`}
              className="flex items-center gap-4 rounded-lg border border-ink-border bg-ink-soft/30 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{article.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  /{article.slug}
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
                <span>{new Date(article.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
