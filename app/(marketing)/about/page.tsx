import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { AchievementCard, type AchievementItem } from "@/components/marketing/achievement-card";
import { getAchievements, getPublicCoach, isPrerenderBailout } from "@/lib/supabase/queries";
import { TestimonialsSection } from "@/components/marketing/sections/testimonials-section";
import { BlockRenderer } from "@/components/cms/block-renderer";
import { parsePageContentSafe } from "@/lib/cms/blocks";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";

/** Seif's published About page (CMS). Null → default About content below. */
async function getPublishedAbout() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_published_page", { p_slug: "about" });
    if (error) {
      logError("Query failed: published about page", error);
      return null;
    }
    const row = data?.[0];
    if (!row) return null;
    const { blocks } = parsePageContentSafe(row.content);
    return blocks.length ? blocks : null;
  } catch (error) {
    if (isPrerenderBailout(error)) throw error;
    logError("Query failed: published about page", error);
    return null;
  }
}

export const metadata: Metadata = {
  title: "About Coach Seif Dridi",
  description:
    "Coach Seif Dridi, head coach and founder of Fight Zone — boxing, kickboxing and fitness coaching in Tunisia.",
};

export default async function AboutPage() {
  const [coach, achievements, cmsBlocks] = await Promise.all([
    getPublicCoach(),
    getAchievements(),
    getPublishedAbout(),
  ]);

  if (cmsBlocks) {
    return (
      <div className="pt-16">
        <BlockRenderer
          blocks={cmsBlocks}
          achievements={achievements.map((a) => ({ id: a.id, title: a.title, description: a.description, date: a.date, image_url: a.image_url }))}
        />
      </div>
    );
  }

  const name = coach?.full_name ?? "Seif Dridi";
  const disciplines =
    coach?.specialization
      ?.split(/[·,]/)
      .map((d) => d.trim())
      .filter(Boolean) ?? [];
  // Only facts Seif recorded — nothing is filled in with invented figures.
  const facts = [
    coach?.experience_years ? { value: String(coach.experience_years), label: "Years coaching" } : null,
    achievements.length ? { value: String(achievements.length), label: achievements.length === 1 ? "Honor on record" : "Honors on record" } : null,
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <>
      <section className="relative overflow-hidden border-b border-ink-border pb-16 pt-28 sm:pt-36">
        <Container>
          <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
            <div>
              <p className="type-overline flex items-center gap-3 text-muted">
                <span className="slant-bar sweep" aria-hidden />
                About · Head coach &amp; founder
              </p>
              <h1 className="type-display mt-6">
                <span className="rise-line"><span>Coach</span></span>
                <span className="rise-line"><span className="[animation-delay:90ms]">{name}</span></span>
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-foreground/80 text-pretty animate-fade-up [animation-delay:200ms] sm:text-xl">
                {coach?.biography ||
                  "Fight Zone is Coach Seif's gym and community for boxing, kickboxing and fitness. He runs every event, answers every message himself and confirms every payment by hand."}
              </p>
              {disciplines.length ? (
                <ul className="mt-8 flex flex-wrap gap-2 animate-fade-up [animation-delay:260ms]" aria-label="Specializations">
                  {disciplines.map((d) => (
                    <li key={d} className="rounded-sm border border-ink-strong px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]">
                      {d}
                    </li>
                  ))}
                </ul>
              ) : null}
              {facts.length ? (
                <dl className="mt-10 grid max-w-lg grid-cols-2 border-y border-ink-border animate-fade-up [animation-delay:320ms]">
                  {facts.map((f) => (
                    <div key={f.label} className="py-5 pr-4 [&+&]:border-l [&+&]:border-ink-border [&+&]:pl-5">
                      <dt className="type-overline text-[10px] text-muted-foreground">{f.label}</dt>
                      <dd className="mt-1 font-display text-4xl font-bold leading-none tabular">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
            <div className="duotone relative aspect-[4/5] overflow-hidden rounded-lg border border-ink-border lg:[clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]">
              <Image
                src="/components/coach-seif-dridi-illustration-pdp-1024x1024.jpeg"
                alt={`Coach ${name}`}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="palmares-h" className="py-20 lg:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              id="palmares-h"
              eyebrow="Palmares"
              title="Titles, trophies & medals"
              description="The honors on Coach Seif's record, newest first."
            />
          </Reveal>
          {achievements.length ? (
            <Reveal variant="stagger" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {achievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement as AchievementItem} />
              ))}
            </Reveal>
          ) : (
            <EmptyState
              className="mt-12"
              icon={<Trophy />}
              title="Palmares coming soon"
              description="Coach Seif's titles and honors will be listed here."
            />
          )}
        </Container>
      </section>

      <TestimonialsSection />

      <section className="border-t border-ink-border py-16 lg:py-20">
        <Container className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <p className="type-h3 max-w-xl text-balance">Train with Coach Seif — see what&apos;s on the calendar.</p>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/events">
              See upcoming events
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </Button>
        </Container>
      </section>
    </>
  );
}
