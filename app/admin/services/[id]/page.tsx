import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SessionEditForm } from "@/components/services/session-edit-form";
import { getAdminSessionById } from "@/lib/supabase/queries";
import { formatPrice, formatDate } from "@/lib/utils";
import { sessionTypeLabel, disciplineLabel, skillLevelLabel } from "@/lib/types/services";
import type { Discipline } from "@/lib/types/services";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await getAdminSessionById(id);
  if (!session) return { title: "Session not found" };
  return { title: session.title };
}

export default async function AdminSessionDetailPage({ params }: Props) {
  const { id } = await params;
  const rawSession = await getAdminSessionById(id);
  if (!rawSession) notFound();
  const session = rawSession as typeof rawSession & { discipline?: string | null; level?: string | null };

  const coach = session.coach_profiles;
  const coachProfile = coach?.profiles;

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" asChild className="w-fit">
            <Link href="/admin/services">
              <ArrowLeft className="h-4 w-4" />
              Back to services
            </Link>
          </Button>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
            {session.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant={session.is_active ? "default" : "outline"}>
              {session.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="neutral">{sessionTypeLabel[session.type] ?? session.type}</Badge>
            {session.level ? (
              <Badge variant="default">{skillLevelLabel[session.level] ?? session.level}</Badge>
            ) : null}
            {session.discipline ? (
              <Badge variant="neutral">
                {disciplineLabel[session.discipline as Discipline] ?? session.discipline}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="mb-4 font-display text-xl font-semibold uppercase tracking-tight">
            Edit session
          </h2>
          <SessionEditForm session={session} />
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden border-ink-border">
            <CardContent className="flex flex-col gap-3 p-5">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
                Session info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Duration</span>
                  <span className="font-medium">{session.duration_min} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Price</span>
                  <span className="font-medium text-primary">{formatPrice(Number(session.price))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Created</span>
                  <span className="font-medium">{formatDate(session.created_at, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                {session.updated_at !== session.created_at ? (
                  <div className="flex justify-between">
                    <span className="text-muted">Updated</span>
                    <span className="font-medium">{formatDate(session.updated_at, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {coachProfile ? (
            <Card className="overflow-hidden border-ink-border">
              <CardContent className="flex flex-col gap-3 p-5">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted">
                  Coach
                </h3>
                <p className="text-sm font-medium">{coachProfile.full_name ?? "Unknown"}</p>
                {coach?.specialization ? (
                  <p className="text-xs text-muted">{coach.specialization}</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
