import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getAdminNewsById } from "@/lib/supabase/queries";
import { NewsEditForm } from "@/components/content/news-edit-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const article = await getAdminNewsById(id);
  return {
    title: article ? `Edit: ${article.title}` : "Article not found",
    description: "Edit a news article.",
  };
}

export default async function AdminNewsEditPage({ params }: PageProps) {
  const { id } = await params;
  const article = await getAdminNewsById(id);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/admin/content/news"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to articles
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit article</h1>
        <p className="mt-1 text-sm text-muted">
          Last updated {new Date(article.updated_at).toLocaleDateString()}
        </p>
      </div>

      <NewsEditForm article={article} />
    </div>
  );
}
