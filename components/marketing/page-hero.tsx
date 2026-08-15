import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
  /** Optional background image. */
  image?: string;
}

export function PageHero({ eyebrow, title, description, image }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-ink-border bg-ink-soft/40">
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover opacity-25"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/70 to-background" aria-hidden />
      <div className="absolute inset-0 grid-pattern opacity-10" aria-hidden />

      <Container className="relative pb-16 pt-32 sm:pb-20 sm:pt-40">
        <Reveal>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="h-px w-6 bg-primary" aria-hidden />
            {eyebrow}
          </span>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold uppercase leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
        </Reveal>
        {description ? (
          <Reveal delay={160}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              {description}
            </p>
          </Reveal>
        ) : null}
      </Container>
    </section>
  );
}
