import Link from "next/link";
import { ArrowRight, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getPublicMembershipPlans, resolveOrFallback } from "@/lib/supabase/queries";
import { formatPrice } from "@/lib/utils";

export async function PricingPreview() {
  const plans = await resolveOrFallback(() => getPublicMembershipPlans(), []);
  const monthlyPlans = plans.filter((p) => p.billing_interval === "MONTHLY");

  if (monthlyPlans.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="mb-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Membership plans
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Simple, transparent pricing. Choose the plan that fits your training goals.
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-primary">
            <Clock className="h-4 w-4" />
            <span>Online subscription coming soon</span>
          </div>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {monthlyPlans.slice(0, 3).map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-2xl border border-ink-border bg-ink-soft/50 p-6 transition-colors hover:border-primary/30"
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                {plan.tier}
              </span>
              <h3 className="mt-2 font-display text-lg font-bold uppercase tracking-wide">
                {plan.name}
              </h3>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-foreground">
                  {formatPrice(Number(plan.price), plan.currency)}
                </span>
                <span className="text-sm text-muted">/mo</span>
              </p>
              {plan.description ? (
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                  {plan.description}
                </p>
              ) : (
                <div className="flex-1" />
              )}
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link href="/contact">
                  Ask about this plan
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">
              View all plans &amp; pricing
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}

export function PricingPreviewSkeleton() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-ink-soft" />
          <div className="mx-auto mt-4 h-8 w-64 animate-pulse rounded bg-ink-soft" />
          <div className="mx-auto mt-3 h-4 w-80 animate-pulse rounded bg-ink-soft" />
        </div>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-ink-border bg-ink-soft/50" />
          ))}
        </div>
      </div>
    </section>
  );
}
