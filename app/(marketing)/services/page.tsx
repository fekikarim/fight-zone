import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SessionCard, type SessionItem } from "@/components/marketing/session-card";
import { SessionCardSkeleton } from "@/components/marketing/session-card";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { SessionFilters } from "@/components/services/session-filters";
import { getFilteredSessions } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Services & Programs",
  description:
    "Private boxing coaching, group training, kickboxing, fitness and conditioning programs with Coach Seif Dridi at Fight Zone.",
};

interface ServicesPageProps {
  searchParams: Promise<{ discipline?: string; level?: string; type?: string }>;
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const { discipline, level, type } = await searchParams;
  const sessions = await getFilteredSessions({ discipline, level, type });

  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Choose your fight"
        description="Every program is built around your level and your goals — from your first lesson to competition-ready preparation."
        image="/components/man-exercising-chest-on-the-gym-5626x3750.jpg"
      />

      <section className="py-16 lg:py-24">
        <Container>
          <SectionHeading
            eyebrow="Programs"
            title="Browse all programs"
            description="Filter by discipline, level or session type to find the right fit."
          />

          <Suspense fallback={<div className="mt-8 flex flex-wrap gap-2"><SessionCardSkeleton /><SessionCardSkeleton /><SessionCardSkeleton /></div>}>
            <SessionFilters className="mt-8" />
          </Suspense>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session, i) => (
              <Reveal key={session.id} delay={(i % 3) * 80}>
                <SessionCard session={session as SessionItem} />
              </Reveal>
            ))}
          </div>

          {sessions.length === 0 ? (
            <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-14 text-center text-muted">
              No programs match your filters — try adjusting your selection.
            </p>
          ) : null}
        </Container>
      </section>
    </>
  );
}
