import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

/** Closing statement: one oversized line in the display face, two actions. */
export function CtaBanner() {
  return (
    <section aria-labelledby="cta-h" className="relative overflow-hidden bg-primary py-20 text-white lg:py-28">
      <div
        className="pointer-events-none absolute -right-20 top-0 h-full w-1/2 -skew-x-12 bg-black/15"
        aria-hidden
      />
      <Container className="relative">
        <Reveal>
          <h2 id="cta-h" className="type-display max-w-5xl text-balance">
            Your next round starts here.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" variant="white" asChild>
              <Link href="/sign-up">
                Create a free account
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" asChild>
              <Link href="/contact">Ask Coach Seif a question</Link>
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
