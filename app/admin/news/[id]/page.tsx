import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { getAdminNewsById } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";
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
      <PageHeader
        eyebrow="Publish"
        title="Edit article"
        description={`Last updated ${formatDate(article.updated_at, { year: "numeric", month: "short", day: "numeric" })}`}
        back={{ href: "/admin/news", label: "Back to articles" }}
      />

      <NewsEditForm article={article} />
    </div>
  );
}
