import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function CtaBanner() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-ink" aria-hidden />
      <div className="absolute inset-0 grid-pattern opacity-10" aria-hidden />

      <Container className="relative">
        <Reveal>
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur">
              <Flame className="h-7 w-7 text-white" />
            </span>
            <h2 className="font-display text-4xl font-bold uppercase leading-tight tracking-tight text-white sm:text-5xl">
              Ready to step into the ring?
            </h2>
            <p className="text-base leading-relaxed text-white/80 sm:text-lg">
              Join Fight Zone and start training with Coach Seif Dridi. Your first
              session could change everything.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="white" asChild>
                <Link href="/sign-up">
                  Join the gym
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                className="border border-white/30 bg-transparent text-white hover:bg-white/10"
                asChild
              >
                <Link href="/contact">Book a session</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
