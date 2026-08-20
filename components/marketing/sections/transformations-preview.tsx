import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import {
  getFeaturedTransformations,
  resolveOrFallback,
} from "@/lib/supabase/queries";
import { computeWeightChange } from "@/lib/types/reviews";

export async function TransformationsPreview() {
  const transformations = await resolveOrFallback(
    () => getFeaturedTransformations(),
    [],
  );

  if (transformations.length === 0) return null;

  return (
    <section className="border-t border-ink-border bg-ink-soft/30 py-20 lg:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Transformations"
            title="Before & after"
            description="Real results from real members. Every transformation tells a story of discipline, dedication, and coaching excellence."
            align="center"
          />
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-2">
          {transformations.map((t, i) => {
            const weightChange = computeWeightChange(
              t.starting_weight,
              t.current_weight,
            );
            return (
              <Reveal key={t.id} delay={i * 100}>
                <div className="overflow-hidden rounded-2xl border border-ink-border bg-ink-soft/50 transition-colors hover:border-primary/30">
                  <div className="grid grid-cols-2 gap-px bg-ink-border">
                    <div className="flex flex-col items-center bg-ink p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                        Before
                      </span>
                      {t.starting_weight != null && (
                        <span className="mt-1 font-display text-2xl font-bold">
                          {t.starting_weight} kg
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-center bg-ink p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                        After
                      </span>
                      {t.current_weight != null && (
                        <span className="mt-1 font-display text-2xl font-bold text-primary">
                          {t.current_weight} kg
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-display text-lg font-bold uppercase tracking-wide">
                      {t.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                      {t.story}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {weightChange != null && (
                        <Badge variant="default">
                          {weightChange > 0 ? "+" : ""}
                          {weightChange} kg
                        </Badge>
                      )}
                      {t.timeframe_months != null && (
                        <Badge variant="neutral">
                          {t.timeframe_months} months
                        </Badge>
                      )}
                      {t.discipline && (
                        <Badge variant="outline">{t.discipline}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export function TransformationsPreviewSkeleton() {
  return (
    <section className="border-t border-ink-border bg-ink-soft/30 py-20 lg:py-28">
      <Container>
        <div className="mb-12 text-center">
          <div className="mx-auto h-4 w-36 animate-pulse rounded bg-ink-soft" />
          <div className="mx-auto mt-3 h-8 w-56 animate-pulse rounded bg-ink-soft" />
          <div className="mx-auto mt-2 h-4 w-96 animate-pulse rounded bg-ink-soft" />
        </div>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-ink-border bg-ink-soft/30"
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
