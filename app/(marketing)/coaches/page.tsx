import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { User, ArrowRight, Award } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPublicCoaches } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Your Coach",
  description:
    "Meet Coach Seif Dridi — the head coach and founder of Fight Zone, bringing years of professional boxing and fitness expertise.",
};

export default async function CoachesPage() {
  const coaches = await getPublicCoaches();

  return (
    <>
      <PageHero
        eyebrow="Head Coach"
        title="Meet Seif Dridi"
        description="Professional boxing coach and founder of Fight Zone, dedicated to helping you achieve your fighting and fitness goals."
        image="/components/coach-seif-dridi-illustration-at-the-gym-1024x1037.jpeg"
      />

      <section className="py-16 lg:py-24">
        <Container>
          <SectionHeading
            eyebrow="Coaching"
            title="Your personal coach"
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((coach, i) => {
              const profile = coach.profiles;
              return (
                <Reveal key={coach.id} delay={(i % 3) * 80}>
                  <Card className="group flex h-full flex-col overflow-hidden border-ink-border transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                    <div className="relative h-48 overflow-hidden bg-ink-soft">
                      {profile?.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.full_name ?? "Coach"}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted">
                          <User className="h-16 w-16" />
                        </div>
                      )}
                    </div>
                    <CardContent className="flex flex-1 flex-col gap-3 p-5">
                      <h3 className="font-display text-lg font-semibold uppercase tracking-wide">
                        {profile?.full_name ?? "Coach"}
                      </h3>
                      {coach.specialization ? (
                        <p className="text-sm text-muted">{coach.specialization}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {coach.experience_years ? (
                          <Badge variant="neutral">
                            <Award className="h-3 w-3" />
                            {coach.experience_years} years
                          </Badge>
                        ) : null}
                      </div>
                      {coach.biography ? (
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted">
                          {coach.biography}
                        </p>
                      ) : null}
                      <div className="mt-auto pt-4">
                        <Link
                          href={`/coaches/${coach.id}`}
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          View profile
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </Reveal>
              );
            })}
          </div>

          {coaches.length === 0 ? (
            <p className="rounded-xl border border-ink-border bg-ink-soft/40 px-6 py-14 text-center text-muted">
              Coach profile is being prepared — check back soon.
            </p>
          ) : null}
        </Container>
      </section>
    </>
  );
}
