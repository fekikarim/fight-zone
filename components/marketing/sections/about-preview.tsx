import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicCoach, resolveOrFallback } from "@/lib/supabase/queries";

/**
 * The coach. Shows only what Seif recorded in his profile — years of
 * experience, specialization and biography appear when they exist and are
 * never filled in with invented figures.
 */
export async function AboutPreview() {
  const coach = await resolveOrFallback(() => getPublicCoach(), null);
  const name = coach?.full_name ?? "Seif Dridi";
  const facts = [
    coach?.experience_years ? { value: `${coach.experience_years}`, label: "Years coaching" } : null,
    coach?.specialization ? { value: coach.specialization, label: "Specialization" } : null,
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <section aria-labelledby="coach-h" className="border-t border-ink-border py-20 lg:py-28">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
          <Reveal>
            <div className="duotone relative aspect-[4/5] overflow-hidden rounded-lg border border-ink-border lg:[clip-path:polygon(0_0,100%_0,100%_100%,12%_100%)]">
              <Image
                src="/components/coach-seif-dridi-illustration-at-the-gym-1024x1037.jpeg"
                alt={`Coach ${name}`}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>

          <div className="flex flex-col gap-7">
            <Reveal>
              <SectionHeading id="coach-h" index="04" eyebrow="Your coach" title={`Coach ${name}`} />
            </Reveal>
            <Reveal delay={80}>
              <p className="max-w-xl text-lg leading-relaxed text-foreground/80 text-pretty">
                {coach?.biography ||
                  "Fight Zone is Coach Seif's own gym and community. He runs every event, answers your messages himself and confirms every payment by hand."}
              </p>
            </Reveal>
            {facts.length ? (
              <Reveal delay={120}>
                <dl className="grid max-w-xl grid-cols-2 border-y border-ink-border">
                  {facts.map((f) => (
                    <div key={f.label} className="py-5 pr-4 [&+&]:border-l [&+&]:border-ink-border [&+&]:pl-5">
                      <dt className="type-overline text-[10px] text-muted-foreground">{f.label}</dt>
                      <dd className="mt-1 font-display text-2xl font-bold uppercase leading-tight">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            ) : null}
            <Reveal delay={160}>
              <Button variant="outline" size="lg" className="w-full sm:w-fit" asChild>
                <Link href="/about">
                  Read Coach Seif&apos;s story
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function AboutPreviewSkeleton() {
  return (
    <section className="border-t border-ink-border py-20 lg:py-28">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Skeleton className="aspect-[4/5] w-full rounded-lg" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-48" />
          </div>
        </div>
      </Container>
    </section>
  );
}
