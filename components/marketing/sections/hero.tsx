import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { getPublicEvents } from "@/lib/supabase/queries";
import { resolveOrFallback } from "@/lib/supabase/queries";
import { eventTypeLabel, priceLabel } from "@/lib/types/events";
import { formatDate } from "@/lib/utils";

/** Real next public event (or nothing) — the hero's one hard fact. */
async function NextEventTicket() {
  const [next] = await resolveOrFallback(() => getPublicEvents({ limit: 1 }), []);
  if (!next) return null;
  return (
    <Link
      href={`/events/${next.id}`}
      className="group lift relative flex w-full max-w-sm items-stretch overflow-hidden rounded-lg border border-ink-strong bg-ink/80 backdrop-blur-md"
    >
      <span className="flex w-20 shrink-0 flex-col items-center justify-center bg-primary text-white">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85">
          {formatDate(next.start_at, { month: "short" })}
        </span>
        <span className="font-display text-4xl font-bold leading-none">{formatDate(next.start_at, { day: "numeric" })}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3">
        <span className="type-overline text-[10px] text-muted">Next event · {eventTypeLabel[next.event_type] ?? "Event"}</span>
        <span className="truncate font-display text-lg font-semibold uppercase leading-tight">{next.title}</span>
        <span className="flex items-center gap-1.5 truncate text-xs text-muted">
          {next.location ? (
            <>
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{next.location}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          {priceLabel(next)}
        </span>
      </span>
      <ArrowRight
        className="mr-4 h-4 w-4 shrink-0 self-center text-muted transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden
      />
    </Link>
  );
}

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[min(100svh,960px)] items-end overflow-hidden pb-14 pt-28 sm:items-center sm:pb-20">
      {/* Poster art, cut on the logo's 12° shear (desktop) / full-bleed (mobile). */}
      <div className="absolute inset-0 -z-10 lg:left-auto lg:w-[52%]">
        <div className="duotone absolute inset-0 lg:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]">
          <Image
            src="/components/event/strength.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover object-[50%_30%]"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/20 lg:bg-gradient-to-r lg:from-background lg:via-transparent lg:to-transparent" aria-hidden />
      </div>

      <Container className="relative">
        <div className="max-w-3xl">
          <p className="type-overline flex items-center gap-3 text-foreground/80 animate-fade-up">
            <span className="slant-bar sweep" aria-hidden />
            Coach Seif Dridi · Tunisia
          </p>

          <h1 className="type-display mt-6">
            <span className="rise-line"><span>Boxing,</span></span>
            <span className="rise-line"><span className="[animation-delay:90ms]">kickboxing</span></span>
            <span className="rise-line">
              <span className="[animation-delay:180ms]">
                <span className="text-primary">&amp;</span> fitness.
              </span>
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-foreground/80 text-pretty animate-fade-up [animation-delay:260ms] sm:text-xl">
            Coaching, sparring nights and competitions with Coach Seif. Register for an event,
            choose how you pay and track every round you attend.
          </p>

          <div className="mt-9 flex flex-col gap-3 animate-fade-up [animation-delay:340ms] sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/events">
                See upcoming events
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-up">Create a free account</Link>
            </Button>
          </div>

          <div className="mt-10 animate-fade-up [animation-delay:420ms]">
            <Suspense fallback={<div className="h-[84px] w-full max-w-sm skeleton rounded-lg" />}>
              <NextEventTicket />
            </Suspense>
          </div>
        </div>
      </Container>
    </section>
  );
}
