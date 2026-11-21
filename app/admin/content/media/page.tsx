import type { Metadata } from "next";
import { getAdminMedia } from "@/lib/supabase/queries";
import { MediaUploadZone } from "@/components/content/media-upload-zone";
import { MediaManager } from "@/components/content/media-manager";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = {
  title: "Media Library",
  description: "Upload and manage photos, videos, and documents.",
};

export default async function AdminMediaPage() {
  const media = await getAdminMedia();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Publish"
        title="Media library"
        description={`${media.length} item${media.length !== 1 ? "s" : ""} · public items appear in the site gallery.`}
        back={{ href: "/admin/content", label: "Back to content" }}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Upload new</h2>
        <MediaUploadZone />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Library</h2>
        <MediaManager items={media} />
      </section>
    </div>
  );
}
