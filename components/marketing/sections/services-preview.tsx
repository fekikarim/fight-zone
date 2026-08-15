import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { SessionCard, SessionCardSkeleton, type SessionItem } from "@/components/marketing/session-card";
import { getActiveSessions } from "@/lib/supabase/queries";

export async function ServicesPreview() {
  const sessions = await getActiveSessions();

  return (
    <section className="relative border-y border-ink-border bg-ink-soft/30 py-20 lg:py-28">
      <Container>
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <SectionHeading
              eyebrow="Services"
              title="Programs built for fighters"
              description="From private one-on-one coaching to group conditioning — every program is tailored to your level and your goals."
            />
          </Reveal>
          <Reveal delay={100}>
            <Button variant="outline" asChild>
              <Link href="/services">
                View all programs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session, i) => (
            <Reveal key={session.id} delay={i * 80}>
              <SessionCard session={session as SessionItem} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function ServicesPreviewSkeleton() {
  return (
    <section className="border-y border-ink-border bg-ink-soft/30 py-20 lg:py-28">
      <Container>
        <div className="mb-12">
          <div className="h-12 w-2/3 skeleton rounded" />
          <div className="mt-3 h-4 w-1/2 skeleton rounded" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}
