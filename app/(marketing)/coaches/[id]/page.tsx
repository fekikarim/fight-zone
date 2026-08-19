import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { User, Award, ArrowLeft, Calendar, Clock } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { PageHero } from "@/components/marketing/page-hero";
import { getPublicCoachById } from "@/lib/supabase/queries";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  sessionTypeLabel,
  skillLevelLabel,
  disciplineLabel,
  type Discipline,
} from "@/lib/types/services";

interface CoachDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CoachDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const coach = await getPublicCoachById(id);
  if (!coach) return { title: "Coach not found" };
  return {
    title: coach.profiles?.full_name ?? "Coach",
    description: coach.biography?.slice(0, 160) ?? `Meet our coach at Fight Zone`,
  };
}

export default async function CoachDetailPage({ params }: CoachDetailPageProps) {
  const { id } = await params;
  const coach = await getPublicCoachById(id);
  if (!coach) notFound();

  const profile = coach.profiles;

  return (
    <>
      <PageHero
        eyebrow="Coach"
        title={profile?.full_name ?? "Coach"}
        description={coach.biography ?? undefined}
        image="/components/coach-seif-dridi-illustration-at-the-gym-1024x1037.jpeg"
      />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="mb-8">
            <Button variant="outline" size="sm" asChild>
              <Link href="/coaches">
                <ArrowLeft className="h-4 w-4" />
                Back to coaches
              </Link>
            </Button>
          </div>

          <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
            {/* Main */}
            <div className="flex flex-col gap-10">
              {/* Profile */}
              <Reveal>
                <div className="flex items-start gap-6">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name ?? "Coach"}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-ink-soft text-muted">
                      <User className="h-12 w-12" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <h2 className="font-display text-2xl font-bold uppercase">
                      {profile?.full_name ?? "Coach"}
                    </h2>
                    {coach.specialization ? (
                      <p className="text-muted">{coach.specialization}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {coach.experience_years ? (
                        <Badge variant="neutral">
                          <Award className="h-3 w-3" />
                          {coach.experience_years} years experience
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Achievements */}
              {coach.achievements.length > 0 ? (
                <Reveal delay={80}>
                  <SectionHeading eyebrow="Palmares" title="Achievements" />
                  <div className="mt-4 space-y-3">
                    {coach.achievements.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 rounded-xl border border-ink-border bg-ink-soft/30 p-4"
                      >
                        <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div className="flex-1">
                          <p className="font-semibold">{a.title}</p>
                          {a.description ? (
                            <p className="mt-1 text-sm text-muted">{a.description}</p>
                          ) : null}
                          {a.date ? (
                            <p className="mt-1 text-xs text-muted">
                              {formatDate(a.date)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              ) : null}

              {/* Sessions */}
              {coach.sessions.length > 0 ? (
                <Reveal delay={160}>
                  <SectionHeading
                    eyebrow="Programs"
                    title="Available sessions"
                    description="Programs offered by this coach."
                  />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {coach.sessions.map((s) => (
                      <Link key={s.id} href={`/services/${s.id}`}>
                        <Card className="group h-full border-ink-border transition-all hover:border-primary/40 hover:shadow-md">
                          <CardContent className="flex flex-col gap-2 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-display text-sm font-semibold uppercase">
                                {s.title}
                              </h4>
                              <span className="shrink-0 font-display text-sm font-bold text-primary">
                                {formatPrice(Number(s.price))}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="neutral" className="text-[10px]">
                                {sessionTypeLabel[s.type] ?? s.type}
                              </Badge>
                              {s.level ? (
                                <Badge variant="default" className="text-[10px]">
                                  {skillLevelLabel[s.level] ?? s.level}
                                </Badge>
                              ) : null}
                              {s.discipline ? (
                                <Badge variant="outline" className="text-[10px]">
                                  {disciplineLabel[s.discipline as Discipline] ?? s.discipline}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="flex items-center gap-1.5 text-xs text-muted">
                              <Clock className="h-3 w-3" />
                              {s.duration_min} min
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </Reveal>
              ) : null}
            </div>

            {/* Sidebar CTA */}
            <Reveal delay={160}>
              <div className="sticky top-28">
                <Card className="overflow-hidden border-primary/30 bg-primary/5">
                  <CardContent className="flex flex-col gap-5 p-6">
                    <h3 className="font-display text-xl font-bold uppercase">
                      Train with {profile?.full_name?.split(" ")[0] ?? "this coach"}
                    </h3>
                    <p className="text-sm text-muted">
                      Browse available sessions or get in touch to discuss a personalized training plan.
                    </p>
                    <Button asChild size="lg" className="w-full">
                      <Link href="/services">
                        <Calendar className="h-4 w-4" />
                        View all sessions
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="w-full">
                      <Link href="/contact">Contact us</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
