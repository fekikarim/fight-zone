import type { Metadata } from "next";
import Image from "next/image";
import { Award, Dumbbell, Medal, ShieldCheck, Trophy } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { AchievementCard, type AchievementItem } from "@/components/marketing/achievement-card";
import { PageHero } from "@/components/marketing/page-hero";
import { getAchievements, getPublicCoach } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About Coach Seif Dridi",
  description:
    "Coach Seif Dridi — professional boxing coach and athlete. Career, palmares and the philosophy behind Fight Zone.",
};

const disciplineIcons = [ShieldCheck, Dumbbell, Trophy, Medal, Award];

export default async function AboutPage() {
  const [coach, achievements] = await Promise.all([
    getPublicCoach(),
    getAchievements(),
  ]);

  const disciplines =
    coach?.specialization
      ?.split(/[·,]/)
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  return (
    <>
      <PageHero
        eyebrow="About"
        title={`Meet ${coach?.full_name ?? "Coach Seif Dridi"}`}
        description={
          coach?.biography ??
          "Professional boxing coach and athlete dedicated to building champions."
        }
        image="/components/coach-seif-dridi-illustration-at-the-gym-1024x1037.jpeg"
      />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
            <div className="flex flex-col gap-8">
              <Reveal>
                <SectionHeading
                  eyebrow="Career"
                  title="A life in the ring"
                  description={
                    coach?.biography ??
                    "From amateur rings to professional ranks, Seif has forged a career built on technique, discipline and heart."
                  }
                />
              </Reveal>

              <Reveal delay={100}>
                <div className="flex flex-col gap-6 rounded-xl border border-ink-border bg-ink-soft/50 p-6 sm:p-8">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border border-ink-border bg-ink p-4 text-center">
                      <p className="font-display text-3xl font-bold text-primary">
                        {coach?.experience_years ?? 15}+
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-widest text-muted">
                        Years coaching
                      </p>
                    </div>
                    <div className="rounded-lg border border-ink-border bg-ink p-4 text-center">
                      <p className="font-display text-3xl font-bold text-primary">
                        {achievements.length}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-widest text-muted">
                        Honors
                      </p>
                    </div>
                    <div className="rounded-lg border border-ink-border bg-ink p-4 text-center">
                      <p className="font-display text-3xl font-bold text-primary">100+</p>
                      <p className="mt-1 text-[11px] uppercase tracking-widest text-muted">
                        Athletes trained
                      </p>
                    </div>
                    <div className="rounded-lg border border-ink-border bg-ink p-4 text-center">
                      <p className="font-display text-3xl font-bold text-primary">∞</p>
                      <p className="mt-1 text-[11px] uppercase tracking-widest text-muted">
                        Dedication
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                      Specializes in:
                    </span>
                    {disciplines.length > 0
                      ? disciplines.map((d, i) => {
                          const Icon = disciplineIcons[i % disciplineIcons.length];
                          return (
                            <Badge key={d} variant="neutral" className="gap-1.5">
                              <Icon className="h-3 w-3 text-primary" />
                              {d}
                            </Badge>
                          );
                        })
                      : null}
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal delay={150}>
              <div className="relative lg:sticky lg:top-28">
                <div className="overflow-hidden rounded-2xl border border-ink-border">
                  <Image
                    src="/components/coach-seif-dridi-illustration-pdp-1024x1024.jpeg"
                    alt={`Coach ${coach?.full_name ?? "Seif Dridi"} portrait`}
                    width={1024}
                    height={1024}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="aspect-[4/5] w-full object-cover"
                    priority
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="border-t border-ink-border bg-ink-soft/30 py-16 lg:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Palmares"
              title="Titles, trophies & medals"
              description="Every award is a chapter of the journey — the product of years of sacrifice and training."
              className="mb-12"
            />
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement, i) => (
              <Reveal key={achievement.id} delay={(i % 3) * 80}>
                <AchievementCard achievement={achievement as AchievementItem} />
              </Reveal>
            ))}
          </div>

          {achievements.length === 0 ? (
            <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-10 text-center text-muted">
              The palmares is being updated — check back soon.
            </p>
          ) : null}
        </Container>
      </section>

      <section className="py-16 lg:py-20">
        <Container>
          <Reveal>
            <div className="flex flex-col gap-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Latest honor
              </p>
              {achievements[0] ? (
                <>
                  <p className="font-display text-3xl font-bold uppercase sm:text-4xl">
                    {achievements[0].title}
                  </p>
                  {achievements[0].date ? (
                    <p className="text-muted">{formatDate(achievements[0].date)}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
