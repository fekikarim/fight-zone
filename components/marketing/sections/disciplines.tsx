import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";

/**
 * The three disciplines Fight Zone coaches (brand definition, lib/site.ts).
 * Copy describes the discipline itself — no invented numbers or claims.
 */
const DISCIPLINES = [
  {
    name: "Boxing",
    line: "Footwork, guard and clean combinations — from your first jab to controlled sparring.",
    image: "/components/event/kickboxing.jpg",
    position: "object-[22%_50%]",
  },
  {
    name: "Kickboxing",
    line: "Punches, kicks and knees put together, with the conditioning to last every round.",
    image: "/components/event/gym-hero-4.jpg",
    position: "object-[70%_40%]",
  },
  {
    name: "Fitness",
    line: "Strength and conditioning that carries into the ring — or simply into a stronger week.",
    image: "/components/man-exercising-chest-on-the-gym-5626x3750.jpg",
    position: "object-[40%_50%]",
  },
] as const;

export function Disciplines() {
  return (
    <section aria-labelledby="disciplines-h" className="border-t border-ink-border py-20 lg:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            id="disciplines-h"
            index="01"
            eyebrow="Disciplines"
            title="Three ways to train"
            description="Every event at Fight Zone is built around one of these disciplines and run by Coach Seif."
          />
        </Reveal>

        <Reveal variant="stagger" className="mt-12 grid gap-4 md:grid-cols-3 lg:gap-6">
          {DISCIPLINES.map((d, i) => (
            <Link
              key={d.name}
              href="/events"
              className="group relative flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-lg border border-ink-border p-6 lg:min-h-[30rem]"
            >
              <div className="zoom-img duotone absolute inset-0">
                <Image src={d.image} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className={`object-cover ${d.position}`} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" aria-hidden />
              <span className="absolute left-6 top-6 font-display text-sm font-semibold tracking-[0.12em] text-foreground/70">
                0{i + 1}
              </span>
              <div className="relative">
                <h3 className="flex items-center justify-between gap-3 font-display text-4xl font-bold uppercase leading-none lg:text-5xl">
                  {d.name}
                  <ArrowUpRight
                    className="h-6 w-6 shrink-0 text-foreground/70 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden
                  />
                </h3>
                <span className="mt-4 block h-[3px] w-10 origin-left -skew-x-12 bg-primary transition-transform duration-300 group-hover:scale-x-150" aria-hidden />
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-foreground/80">{d.line}</p>
                <span className="sr-only">See {d.name} events</span>
              </div>
            </Link>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
