import type { Metadata } from "next";
import { Check, HelpCircle, Zap } from "lucide-react";
import { Container } from "@/components/ui/container";
import { getPublicMembershipPlans } from "@/lib/supabase/queries";
import { getCurrentUser } from "@/lib/auth/guards";
import { PricingToggle } from "@/components/memberships/pricing-toggle";

export const metadata: Metadata = {
  title: "Pricing — Membership Plans",
  description:
    "Choose your Fight Zone membership. Monthly, quarterly, and annual plans for adults, students, kids, and pro fighters.",
};

const faqItems = [
  {
    q: "Can I cancel my subscription?",
    a: "Yes. You can cancel at any time from your membership dashboard. Your access continues until the end of the current billing period.",
  },
  {
    q: "Do I need my own boxing gear?",
    a: "We provide gloves and wraps for your first sessions. After that, we recommend investing in your own equipment. Our pro plans include exclusive merchandise.",
  },
  {
    q: "Is there a trial session?",
    a: "Yes! Contact us to schedule a free trial session. No commitment required — come experience the Fight Zone atmosphere first.",
  },
  {
    q: "Can I switch plans?",
    a: "Absolutely. You can upgrade or downgrade your plan from the member dashboard. Changes take effect at your next billing cycle.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept cash, bank transfers, and card payments. Online payments are also available for added convenience.",
  },
];

const comparisonFeatures = [
  { label: "Group sessions", monthly: true, quarterly: true, annual: true, pro: true },
  { label: "Open gym access", monthly: true, quarterly: true, annual: true, pro: true },
  { label: "Locker room", monthly: true, quarterly: true, annual: true, pro: true },
  { label: "Priority booking", monthly: false, quarterly: true, annual: true, pro: true },
  { label: "1-on-1 with coach", monthly: false, quarterly: false, annual: true, pro: true },
  { label: "Guest passes", monthly: false, quarterly: false, annual: true, pro: true },
  { label: "Unlimited private sessions", monthly: false, quarterly: false, annual: false, pro: true },
  { label: "Competition prep", monthly: false, quarterly: false, annual: false, pro: true },
  { label: "Nutrition planning", monthly: false, quarterly: false, annual: false, pro: true },
];

export default async function PricingPage() {
  const [plans, user] = await Promise.all([
    getPublicMembershipPlans(),
    getCurrentUser(),
  ]);

  // Group plans by billing interval
  const monthlyPlans = plans.filter((p) => p.billing_interval === "MONTHLY");
  const quarterlyPlans = plans.filter((p) => p.billing_interval === "QUARTERLY");
  const annualPlans = plans.filter((p) => p.billing_interval === "ANNUAL");

  // For the comparison, pick one plan per interval
  const monthlyRef = monthlyPlans.find((p) => p.tier === "ADULT") ?? monthlyPlans[0];
  const quarterlyRef = quarterlyPlans.find((p) => p.tier === "ADULT") ?? quarterlyPlans[0];
  const annualRef = annualPlans.find((p) => p.tier === "ADULT") ?? annualPlans[0];
  const proRef = annualPlans.find((p) => p.tier === "PRO_FIGHTER");

  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink-border bg-ink-soft/40 pt-32 pb-16 sm:pt-40">
        <Container className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <h1 className="mt-6 font-display text-4xl font-bold uppercase tracking-tight text-foreground sm:text-6xl">
            Choose your arena pass
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            Flexible membership plans designed for every level — from your first
            jab to championship preparation.
          </p>
        </Container>
      </section>

      {/* Pricing cards */}
      <section className="py-16 sm:py-20">
        <Container>
          <PricingToggle plans={plans} isLoggedIn={!!user} />
        </Container>
      </section>

      {/* Comparison matrix */}
      {monthlyRef || quarterlyRef || annualRef ? (
        <section className="border-t border-ink-border bg-ink-soft/20 py-16 sm:py-20">
          <Container>
            <h2 className="mb-8 text-center font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
              Plan comparison
            </h2>
            <div
              tabIndex={0}
              aria-label="Plan comparison table, scrollable"
              className="mx-auto max-w-3xl overflow-x-auto"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-border">
                    <th className="py-3 pr-4 text-left font-semibold text-muted">Feature</th>
                    {monthlyRef ? (
                      <th className="px-4 py-3 text-center font-semibold">Monthly</th>
                    ) : null}
                    {quarterlyRef ? (
                      <th className="px-4 py-3 text-center font-semibold">Quarterly</th>
                    ) : null}
                    {annualRef ? (
                      <th className="px-4 py-3 text-center font-semibold">Annual</th>
                    ) : null}
                    {proRef ? (
                      <th className="px-4 py-3 text-center font-semibold text-primary">Pro</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature) => (
                    <tr key={feature.label} className="border-b border-ink-border/50">
                      <td className="py-3 pr-4 text-muted">{feature.label}</td>
                      {monthlyRef ? (
                        <td className="px-4 py-3 text-center">
                          {feature.monthly ? (
                            <Check className="mx-auto h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-muted/30">-</span>
                          )}
                        </td>
                      ) : null}
                      {quarterlyRef ? (
                        <td className="px-4 py-3 text-center">
                          {feature.quarterly ? (
                            <Check className="mx-auto h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-muted/30">-</span>
                          )}
                        </td>
                      ) : null}
                      {annualRef ? (
                        <td className="px-4 py-3 text-center">
                          {feature.annual ? (
                            <Check className="mx-auto h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-muted/30">-</span>
                          )}
                        </td>
                      ) : null}
                      {proRef ? (
                        <td className="px-4 py-3 text-center">
                          {feature.pro ? (
                            <Check className="mx-auto h-4 w-4 text-primary" />
                          ) : (
                            <span className="text-muted/30">-</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <Container className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-8">
            <HelpCircle className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-ink-border bg-ink-soft/50 p-5"
              >
                <summary className="cursor-pointer text-sm font-semibold text-foreground transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
