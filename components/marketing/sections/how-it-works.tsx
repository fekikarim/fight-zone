import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

/**
 * How taking part actually works in V1 (registration RPC, manual payment
 * review, attendance-based badges) — set as four "rounds" on the light band.
 */
const ROUNDS = [
  {
    title: "Create your account",
    text: "Free, and it takes a minute. Your profile is only visible to you and Coach Seif.",
  },
  {
    title: "Register for an event",
    text: "Your place is held the moment you register. For paid events you choose to pay in person or by bank transfer.",
  },
  {
    title: "Coach Seif confirms",
    text: "Payments are checked by hand — never automatically. You see the status change and get a message.",
  },
  {
    title: "Train and earn badges",
    text: "Each event Coach Seif records you at counts toward milestone badges, some with rewards.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-h" className="bg-bone py-20 text-bone-ink lg:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              id="how-h"
              index="03"
              tone="light"
              eyebrow="How it works"
              title="Four rounds from sign-up to the ring"
              description="No online payment and no surprises: every step is visible in your member area."
            />
            <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
              <Link href="/sign-up">
                Start round one
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </Button>
          </Reveal>

          <Reveal variant="stagger" as="ol" className="flex flex-col">
            {ROUNDS.map((round, i) => (
              <li key={round.title} className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-bone-ink/15 py-7 last:border-b">
                <span className="font-display text-5xl font-bold leading-none text-bone-ink/20 tabular sm:text-6xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-2xl font-bold uppercase leading-tight">{round.title}</h3>
                  <p className="mt-2 max-w-md text-base leading-relaxed text-bone-muted">{round.text}</p>
                </div>
              </li>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
