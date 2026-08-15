import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { siteConfig } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative flex min-h-[94svh] items-center overflow-hidden">
      <Image
        src="/components/bodybuilding-three-man-workouting-gym-flat-3556x2000.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/55 to-background" aria-hidden />
      <div className="absolute inset-0 grid-pattern opacity-20" aria-hidden />

      <Container className="relative pt-32 pb-24">
        <div className="max-w-3xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              {siteConfig.coach.role}
            </span>
          </Reveal>

          <Reveal delay={100}>
            <h1 className="mt-6 font-display text-6xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
              Train.
              <br />
              <span className="text-primary">Fight.</span>
              <br />
              Win.
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              Professional boxing, kickboxing and fitness coaching. Build your
              discipline, sharpen your technique and step into the ring with
              confidence.
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/services">
                  Explore programs
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="white" asChild>
                <Link href="/about">Meet the coach</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </Container>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2" aria-hidden>
        <div className="h-10 w-6 rounded-full border border-muted-foreground/40 p-1.5">
          <div className="mx-auto h-2.5 w-1 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </section>
  );
}
