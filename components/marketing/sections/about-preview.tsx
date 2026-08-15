import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, Dumbbell, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicCoach } from "@/lib/supabase/queries";

const highlights = [
  { icon: Award, label: "Champion athlete" },
  { icon: Dumbbell, label: "15+ years coaching" },
  { icon: ShieldCheck, label: "Pro-level discipline" },
];

export async function AboutPreview() {
  const coach = await getPublicCoach();

  return (
    <section className="py-20 lg:py-28">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-ink-border">
                <Image
                  src="/components/coach-seif-dridi-illustration-pdp-1024x1024.jpeg"
                  alt={`Coach ${coach?.full_name ?? "Seif Dridi"}`}
                  width={1024}
                  height={1024}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="aspect-square w-full object-cover"
                  priority
                />
              </div>
              <div className="absolute -bottom-5 -right-4 rounded-xl border border-primary/30 bg-ink px-5 py-3 shadow-lg shadow-primary/10 sm:-right-6">
                <p className="font-display text-2xl font-bold text-primary">
                  {coach?.experience_years ?? 15}+
                </p>
                <p className="text-xs uppercase tracking-widest text-muted">
                  Years in the ring
                </p>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-6">
            <Reveal>
              <SectionHeading
                eyebrow="The Coach"
                title={coach?.full_name ?? "Coach Seif Dridi"}
                description={coach?.specialization ?? "Boxing · Kickboxing · Fitness"}
              />
            </Reveal>

            <Reveal delay={100}>
              <p className="text-base leading-relaxed text-muted">
                {coach?.biography ??
                  "Professional boxing coach and athlete, dedicated to building champions — in the ring and in life."}
              </p>
            </Reveal>

            <Reveal delay={150}>
              <ul className="grid gap-3 sm:grid-cols-3">
                {highlights.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 rounded-lg border border-ink-border bg-ink-soft px-3 py-2.5 text-sm text-muted"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    {label}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={200}>
              <Button variant="outline" size="lg" className="w-fit" asChild>
                <Link href="/about">
                  Discover my story
                  <ArrowRight className="h-4 w-4" />
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
    <section className="py-20 lg:py-28">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
