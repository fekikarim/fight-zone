"use client";

import { useState, useMemo } from "react";
import { PricingCard } from "@/components/memberships/pricing-card";
import { cn } from "@/lib/utils";
import { billingIntervalLabel } from "@/lib/types/memberships";
import type { MembershipPlan } from "@/lib/types/memberships";
import type { Database } from "@/types/database.types";

const intervals = ["MONTHLY", "QUARTERLY", "ANNUAL"] as const;

interface PricingToggleProps {
  plans: MembershipPlan[];
  isLoggedIn: boolean;
}

export function PricingToggle({ plans, isLoggedIn }: PricingToggleProps) {
  const [activeInterval, setActiveInterval] = useState<
    Database["public"]["Enums"]["billing_interval"]
  >("MONTHLY");

  const filteredPlans = useMemo(
    () => plans.filter((p) => p.billing_interval === activeInterval),
    [plans, activeInterval],
  );

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Interval toggle */}
      <div className="inline-flex rounded-xl border border-ink-border bg-ink-soft/50 p-1">
        {intervals.map((interval) => (
          <button
            key={interval}
            type="button"
            onClick={() => setActiveInterval(interval)}
            className={cn(
              "rounded-lg px-5 py-2 text-sm font-semibold transition-all",
              activeInterval === interval
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            {billingIntervalLabel[interval]}
            {interval === "QUARTERLY" ? (
              <span className="ml-1.5 text-[10px] uppercase text-primary">save 10%</span>
            ) : interval === "ANNUAL" ? (
              <span className="ml-1.5 text-[10px] uppercase text-primary">save 20%</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPlans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            billingInterval={activeInterval}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>

      {filteredPlans.length === 0 ? (
        <p className="text-sm text-muted">No plans available for this interval yet.</p>
      ) : null}
    </div>
  );
}
