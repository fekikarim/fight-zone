import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { NewsCreateForm } from "@/components/content/news-create-form";

export const metadata: Metadata = {
  title: "New Article",
  description: "Create a new news article.",
};

export default function AdminNewsNewPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Publish"
        title="New article"
        description="Write a news post or blog article."
        back={{ href: "/admin/news", label: "Back to articles" }}
      />

      <NewsCreateForm />
    </div>
  );
}
