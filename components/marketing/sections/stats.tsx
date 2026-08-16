import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { getAchievements, getActiveSessions, getPublicCoach, getPublicEvents, resolveOrFallback } from "@/lib/supabase/queries";

async function StatsStrip() {
  const [coach, achievements, sessions, events] = await Promise.all([
    resolveOrFallback(() => getPublicCoach(), null),
    resolveOrFallback(() => getAchievements(), []),
    resolveOrFallback(() => getActiveSessions(), []),
    resolveOrFallback(() => getPublicEvents(), []),
  ]);

  const stats = [
    { value: String(coach?.experience_years ?? 15), label: "Years of experience" },
    { value: String(achievements.length), label: "Titles & honors" },
    { value: String(sessions.length), label: "Training programs" },
    { value: String(events.length), label: "Upcoming events" },
  ];

  return (
    <section className="relative border-y border-ink-border bg-ink-soft/40">
      <Container>
        <div className="grid grid-cols-2 gap-y-8 py-12 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80}>
              <div className="flex flex-col items-center gap-1 text-center">
                <span className="font-display text-4xl font-bold text-primary sm:text-5xl">
                  {stat.value}
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                  {stat.label}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export { StatsStrip };

export function StatsStripSkeleton() {
  return (
    <section className="border-y border-ink-border bg-ink-soft/40">
      <Container>
        <div className="grid grid-cols-2 gap-y-8 py-12 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-12 w-16 skeleton rounded" />
              <div className="h-3 w-28 skeleton rounded" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
