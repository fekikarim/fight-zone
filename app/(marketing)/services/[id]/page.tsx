import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Clock, DollarSign, User, ArrowLeft, Dumbbell, Star } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { PageHero } from "@/components/marketing/page-hero";
import { getPublicSessionById, getApprovedReviews, resolveOrFallback } from "@/lib/supabase/queries";
import { formatPrice } from "@/lib/utils";
import {
  sessionTypeLabel,
  skillLevelLabel,
  disciplineLabel,
  type Discipline,
} from "@/lib/types/services";
import Link from "next/link";

interface SessionDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SessionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await getPublicSessionById(id);
  if (!session) return { title: "Session not found" };
  return {
    title: session.title,
    description: session.description?.slice(0, 160) ?? `Book ${session.title} at Fight Zone`,
  };
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id } = await params;
  const [session, reviews] = await Promise.all([
    getPublicSessionById(id),
    resolveOrFallback(() => getApprovedReviews({ sessionId: id, limit: 6 }), []),
  ]);
  if (!session) notFound();

  const coach = session.coach_profiles;
  const coachProfile = coach?.profiles;

  return (
    <>
      <PageHero
        eyebrow={disciplineLabel[session.discipline as Discipline] ?? session.discipline ?? "Program"}
        title={session.title}
        description={session.description ?? undefined}
        image="/components/man-exercising-chest-on-the-gym-5626x3750.jpg"
      />

      <section className="py-16 lg:py-24">
        <Container>
          <div className="mb-8">
            <Button variant="outline" size="sm" asChild>
              <Link href="/services">
                <ArrowLeft className="h-4 w-4" />
                Back to services
              </Link>
            </Button>
          </div>

          <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
            {/* Main content */}
            <div className="flex flex-col gap-8">
              {/* Key info */}
              <Reveal>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1 rounded-xl border border-ink-border bg-ink-soft/30 p-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted">Type</span>
                    <span className="font-display text-lg font-bold">
                      {sessionTypeLabel[session.type] ?? session.type}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-ink-border bg-ink-soft/30 p-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted">Duration</span>
                    <span className="font-display text-lg font-bold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      {session.duration_min} min
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-ink-border bg-ink-soft/30 p-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted">Price</span>
                    <span className="font-display text-lg font-bold text-primary flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {formatPrice(Number(session.price))}
                    </span>
                  </div>
                </div>
              </Reveal>

              {/* Badges row */}
              <Reveal delay={80}>
                <div className="flex flex-wrap gap-2">
                  {session.level ? (
                    <Badge variant="default">{skillLevelLabel[session.level] ?? session.level}</Badge>
                  ) : null}
                  {session.discipline ? (
                    <Badge variant="neutral">
                      <Dumbbell className="h-3 w-3" />
                      {disciplineLabel[session.discipline as Discipline] ?? session.discipline}
                    </Badge>
                  ) : null}
                </div>
              </Reveal>

              {/* Description */}
              {session.description ? (
                <Reveal delay={160}>
                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-line text-muted leading-relaxed">
                      {session.description}
                    </p>
                  </div>
                </Reveal>
              ) : null}

              {/* Coach card */}
              {coach ? (
                <Reveal delay={240}>
                  <SectionHeading eyebrow="Coach" title="Your instructor" />
                  <Card className="mt-4 overflow-hidden border-ink-border">
                    <CardContent className="flex items-start gap-4 p-5">
                      {coachProfile?.avatar_url ? (
                        <Image
                          src={coachProfile.avatar_url}
                          alt={coachProfile.full_name ?? "Coach"}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-soft text-muted">
                          <User className="h-8 w-8" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-1">
                        <p className="font-display text-lg font-semibold">
                          {coachProfile?.full_name ?? "Coach Seif Dridi"}
                        </p>
                        {coach.specialization ? (
                          <p className="text-sm text-muted">{coach.specialization}</p>
                        ) : null}
                        {coach.experience_years ? (
                          <p className="text-xs text-muted">
                            {coach.experience_years} years experience
                          </p>
                        ) : null}
                        {coach.biography ? (
                          <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-3">
                            {coach.biography}
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </Reveal>
              ) : null}

              {/* Reviews for this session */}
              {reviews.length > 0 ? (
                <Reveal delay={280}>
                  <SectionHeading
                    eyebrow="Testimonials"
                    title="Member reviews"
                    description="What athletes say about this session."
                  />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-xl border border-ink-border bg-ink-soft/50 p-4"
                      >
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < review.rating
                                  ? "fill-primary text-primary"
                                  : "text-ink-border"
                              }`}
                              aria-hidden
                            />
                          ))}
                        </div>
                        <h4 className="mt-2 text-sm font-semibold">{review.title}</h4>
                        <p className="mt-1 line-clamp-2 text-xs text-muted">
                          {review.content}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          — {review.member_profiles?.profiles?.full_name ?? "Member"}
                        </p>
                      </div>
                    ))}
                  </div>
                </Reveal>
              ) : null}
            </div>

            {/* Sidebar — booking CTA */}
            <Reveal delay={160}>
              <div className="sticky top-28">
                <Card className="overflow-hidden border-primary/30 bg-primary/5">
                  <CardContent className="flex flex-col gap-5 p-6">
                    <h3 className="font-display text-xl font-bold uppercase">Ready to train?</h3>
                    <p className="text-sm text-muted">
                      Request a booking for this session. Our team will confirm your slot within 24 hours.
                    </p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">Session fee</span>
                      <span className="font-display text-2xl font-bold text-primary">
                        {formatPrice(Number(session.price))}
                      </span>
                    </div>
                    <Button asChild size="lg" className="w-full">
                      <Link href={`/member/sessions/${session.id}`}>
                        Book this session
                      </Link>
                    </Button>
                    <p className="text-center text-xs text-muted">
                      {session.duration_min} minute{session.duration_min !== 1 ? "s" : ""}
                    </p>
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
