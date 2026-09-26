import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NewsCreateForm } from "@/components/content/news-create-form";

export const metadata: Metadata = {
  title: "New Article",
  description: "Create a new news article.",
};

export default function AdminNewsNewPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">New Article</h1>
      </div>

      <NewsCreateForm />
    </div>
  );
}
