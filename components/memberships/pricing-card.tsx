"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";
import { billingIntervalLabel, planTierLabel } from "@/lib/types/memberships";
import type { MembershipPlan } from "@/lib/types/memberships";
import type { Database } from "@/types/database.types";

interface PricingCardProps {
  plan: MembershipPlan;
  billingInterval: Database["public"]["Enums"]["billing_interval"];
  isLoggedIn: boolean;
}

export function PricingCard({ plan, billingInterval, isLoggedIn }: PricingCardProps) {
  const intervalLabel = billingIntervalLabel[billingInterval] ?? plan.billing_interval;
  const tierLabel = planTierLabel[plan.tier] ?? plan.tier;

  const actionHref = isLoggedIn ? "/member/subscription" : "/sign-up";
  const actionLabel = isLoggedIn ? "Manage membership" : "Join the club";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition-all duration-300 sm:p-8",
        plan.is_popular
          ? "border-primary bg-gradient-to-b from-primary/10 to-ink-soft/50 shadow-lg shadow-primary/10"
          : "border-ink-border bg-ink-soft/50 hover:border-primary/30",
      )}
    >
      {plan.is_popular ? (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">
          Most popular
        </Badge>
      ) : null}

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {tierLabel}
          </span>
        </div>
        <h3 className="mt-2 font-display text-xl font-bold uppercase tracking-wide">
          {plan.name}
        </h3>
        {plan.description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {plan.description}
          </p>
        ) : null}
      </div>

      <div className="mb-6">
        <span className="font-display text-4xl font-bold text-foreground">
          {formatPrice(Number(plan.price), plan.currency)}
        </span>
        <span className="ml-1 text-sm text-muted">/{intervalLabel.toLowerCase()}</span>
      </div>

      {plan.session_credits !== null ? (
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          {plan.session_credits} sessions included
        </p>
      ) : null}

      <ul className="mb-8 flex flex-1 flex-col gap-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-muted">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={plan.is_popular ? "primary" : "outline"}
        className="w-full"
      >
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
