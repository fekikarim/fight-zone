import type { Metadata } from "next";
import { getAdminMedia } from "@/lib/supabase/queries";
import { MediaUploadZone } from "@/components/content/media-upload-zone";
import { MediaManager } from "@/components/content/media-manager";

export const metadata: Metadata = {
  title: "Media Library",
  description: "Upload and manage photos, videos, and documents.",
};

export default async function AdminMediaPage() {
  const media = await getAdminMedia();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
        <p className="mt-1 text-sm text-muted">
          {media.length} item{media.length !== 1 ? "s" : ""}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Upload new</h2>
        <MediaUploadZone />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Library</h2>
        <MediaManager items={media} />
      </section>
    </div>
  );
}
