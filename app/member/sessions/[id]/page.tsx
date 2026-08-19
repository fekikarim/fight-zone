import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Award, Clock, Dumbbell, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getSessionById } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { BookingRequestForm } from "@/components/member/booking-request-form";
import { formatPrice } from "@/lib/utils";
import {
  sessionTypeLabel,
  skillLevelLabel,
  disciplineLabel,
  type Discipline,
} from "@/lib/types/services";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const session = await getSessionById(id);
  return {
    title: session.title,
    description: session.description ?? `${session.title} at Fight Zone.`,
  };
}

export default async function SessionDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const rawSession = await getSessionById(id);
  if (!rawSession) notFound();
  const session = rawSession as typeof rawSession & { discipline?: string | null; level?: string | null };

  const coach = session.coach_profiles;

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/member/sessions">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All sessions
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="neutral">
                {sessionTypeLabel[session.type] ?? session.type}
              </Badge>
              {session.level ? (
                <Badge variant="default">{skillLevelLabel[session.level] ?? session.level}</Badge>
              ) : null}
              {session.discipline ? (
                <Badge variant="neutral">
                  {disciplineLabel[session.discipline as Discipline] ?? session.discipline}
                </Badge>
              ) : null}
              <span className="font-display text-3xl font-bold text-primary">
                {formatPrice(Number(session.price))}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
              {session.title}
            </h1>
            <p className="flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              {session.duration_min} minutes
            </p>
          </div>

          {session.description ? (
            <p className="max-w-prose text-sm leading-relaxed text-muted sm:text-base">
              {session.description}
            </p>
          ) : null}

          {coach ? (
            <Card>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {coach.profiles?.full_name?.[0] ?? "S"}
                </span>
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <UserRound className="h-4 w-4 text-primary" aria-hidden />
                    {coach.profiles?.full_name ?? "Coach"}
                  </p>
                  {coach.specialization ? (
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <Dumbbell className="h-4 w-4 text-primary" aria-hidden />
                      {coach.specialization}
                    </p>
                  ) : null}
                  {coach.experience_years != null ? (
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <Award className="h-4 w-4 text-primary" aria-hidden />
                      {coach.experience_years} years of experience
                    </p>
                  ) : null}
                  {coach.biography ? (
                    <p className="text-sm leading-relaxed text-muted">
                      {coach.biography}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-24">
            <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold uppercase tracking-wide">
                Request this session
              </h2>
              <BookingRequestForm
                sessionId={session.id}
                sessionTitle={session.title}
                price={Number(session.price)}
                durationMin={session.duration_min}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
