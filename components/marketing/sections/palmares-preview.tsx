import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { AchievementCard, type AchievementItem } from "@/components/marketing/achievement-card";
import { getAchievements } from "@/lib/supabase/queries";

export async function PalmaresPreview() {
  const achievements = await getAchievements(3);

  return (
    <section className="py-20 lg:py-28">
      <Container>
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <SectionHeading
              eyebrow="Palmares"
              title="A record that speaks"
              description="Titles, medals and honors earned through years of discipline inside the ring and beyond."
            />
          </Reveal>
          <Reveal delay={100}>
            <Button variant="outline" asChild>
              <Link href="/about">
                Full palmares
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement, i) => (
            <Reveal key={achievement.id} delay={i * 80}>
              <AchievementCard achievement={achievement as AchievementItem} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function PalmaresPreviewSkeleton() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <div className="mb-12">
          <div className="h-12 w-2/3 skeleton rounded" />
          <div className="mt-3 h-4 w-1/2 skeleton rounded" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-ink-border">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="p-5">
                <Skeleton className="h-5 w-3/4" />
                <div className="mt-2 h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
