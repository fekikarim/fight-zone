import type { Metadata } from "next";
import { getAdminAchievements } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  AchievementCreateForm,
  AchievementManager,
} from "@/components/content/achievement-manager";

export const metadata: Metadata = {
  title: "Achievements & Palmares",
  description: "Track championships, certifications, and awards.",
};

export default async function AdminAchievementsPage() {
  const achievements = await getAdminAchievements();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Publish"
        title="Achievements"
        description={`${achievements.length} record${achievements.length !== 1 ? "s" : ""} · shown on the About page palmares.`}
        back={{ href: "/admin/content", label: "Back to content" }}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Add new</h2>
        <AchievementCreateForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">All achievements</h2>
        <AchievementManager items={achievements} />
      </section>
    </div>
  );
}
