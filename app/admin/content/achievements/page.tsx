import type { Metadata } from "next";
import { getAdminAchievements } from "@/lib/supabase/queries";
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
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Achievements & Palmares</h1>
        <p className="mt-1 text-sm text-muted">
          {achievements.length} record{achievements.length !== 1 ? "s" : ""}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Add new</h2>
        <AchievementCreateForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">All achievements</h2>
        <AchievementManager items={achievements} />
      </section>
    </div>
  );
}
