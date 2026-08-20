import { Star, User } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { getFeaturedReviews, resolveOrFallback } from "@/lib/supabase/queries";
import { renderStars } from "@/lib/types/reviews";

export async function TestimonialsSection() {
  const reviews = await resolveOrFallback(() => getFeaturedReviews(), []);

  if (reviews.length === 0) return null;

  return (
    <section className="py-20 lg:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Testimonials"
            title="What our members say"
            description="Real stories from real fighters who transformed their lives at Fight Zone."
            align="center"
          />
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, i) => (
            <Reveal key={review.id} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl border border-ink-border bg-ink-soft/50 p-6 transition-colors hover:border-primary/30">
                <div className="flex items-center gap-1">
                  {renderStars(review.rating).map((type, idx) => (
                    <Star
                      key={idx}
                      className={`h-4 w-4 ${
                        type === "full"
                          ? "fill-primary text-primary"
                          : type === "half"
                            ? "fill-primary/50 text-primary"
                            : "text-ink-border"
                      }`}
                      aria-hidden
                    />
                  ))}
                  <span className="ml-1.5 text-xs text-muted">
                    {review.rating}/5
                  </span>
                </div>

                <h3 className="mt-3 font-display text-base font-bold uppercase tracking-wide">
                  {review.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {review.content}
                </p>

                <div className="mt-4 flex items-center gap-3 border-t border-ink-border/50 pt-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {review.member_profiles?.profiles?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() ?? (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {review.member_profiles?.profiles?.full_name ?? "Anonymous"}
                    </p>
                    <p className="text-xs text-muted">Verified Member</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function TestimonialsSectionSkeleton() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <div className="mb-12 text-center">
          <div className="mx-auto h-4 w-32 animate-pulse rounded bg-ink-soft" />
          <div className="mx-auto mt-3 h-8 w-64 animate-pulse rounded bg-ink-soft" />
          <div className="mx-auto mt-2 h-4 w-80 animate-pulse rounded bg-ink-soft" />
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-ink-border bg-ink-soft/50"
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
