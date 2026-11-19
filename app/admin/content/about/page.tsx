import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getAchievements } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageEditor } from "@/components/cms/page-editor";

export const metadata: Metadata = { title: "About page editor" };

export default async function AdminAboutEditorPage() {
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const [page, revisions, achievements] = await Promise.all([
    supabase.from("cms_pages").select("draft, published_revision_id, published_at").eq("slug", "about").maybeSingle(),
    supabase.from("cms_page_revisions").select("id, created_at, note").eq("slug", "about").order("created_at", { ascending: false }).limit(20),
    getAchievements(),
  ]);
  const draft = (page.data?.draft ?? { blocks: [] }) as { blocks: unknown[] };

  return (
    <div className="space-y-6">
      <PageHeader
        title="About page"
        back={{ href: "/admin/content", label: "Back to content" }}
        description="Build your About page from blocks. Save drafts freely — visitors only see what you publish."
      />
      <PageEditor
        slug="about"
        initialDraft={draft}
        publishedAt={page.data?.published_at ?? null}
        achievements={achievements.map((a) => ({ id: a.id, title: a.title, description: a.description, date: a.date, image_url: a.image_url }))}
        revisions={(revisions.data ?? []).map((r) => ({ ...r, is_published: r.id === page.data?.published_revision_id }))}
      />
    </div>
  );
}
