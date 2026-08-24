import type { Metadata } from "next";
import Link from "next/link";
import { Plus, CreditCard, Users, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminBillingStats, getAdminMembershipPlans } from "@/lib/supabase/queries";
import { formatPrice } from "@/lib/utils";
import { billingIntervalLabel, planTierLabel } from "@/lib/types/memberships";

export const metadata: Metadata = {
  title: "Membership Plans",
  description: "Manage membership plans, subscriptions, and billing.",
};

export default async function AdminMembershipsPage() {
  await requireRole(["ADMIN"]);
  const [plans, stats] = await Promise.all([
    getAdminMembershipPlans(),
    getAdminBillingStats(),
  ]);

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Membership Plans
        </h1>
        <p className="text-sm text-muted">
          Manage your pricing catalog and view billing metrics.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-ink-border bg-ink-soft/50 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
            <Users className="h-4 w-4 text-primary" />
            Active subscriptions
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-primary">
            {stats.activeSubscriptions}
          </p>
        </div>
        <div className="rounded-xl border border-ink-border bg-ink-soft/50 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
            <TrendingUp className="h-4 w-4 text-primary" />
            Total revenue
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-primary">
            {formatPrice(stats.totalRevenue, "TND")}
          </p>
        </div>
        <div className="rounded-xl border border-ink-border bg-ink-soft/50 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
            <CreditCard className="h-4 w-4 text-primary" />
            Pending payments
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-primary">
            {stats.pendingPayments}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/memberships/subscriptions">Subscriptions</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/memberships/payments">Payments</Link>
        </Button>
        <Button asChild size="sm" className="gap-2">
          <Link href="/admin/memberships/new">
            <Plus className="h-4 w-4" />
            New plan
          </Link>
        </Button>
      </div>

      {/* Plans table */}
      <div className="[contain:layout] overflow-x-auto rounded-xl border border-ink-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-border bg-ink-soft/50">
              <th className="px-4 py-3 text-left font-semibold text-muted">Plan</th>
              <th className="px-4 py-3 text-left font-semibold text-muted">Tier</th>
              <th className="px-4 py-3 text-left font-semibold text-muted">Interval</th>
              <th className="px-4 py-3 text-left font-semibold text-muted">Price</th>
              <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-muted">Popular</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-ink-border/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-muted">/{plan.slug}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="neutral">{planTierLabel[plan.tier] ?? plan.tier}</Badge>
                </td>
                <td className="px-4 py-3 text-muted">
                  {billingIntervalLabel[plan.billing_interval]}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {formatPrice(Number(plan.price), plan.currency)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={plan.is_active ? "solid" : "neutral"}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {plan.is_popular ? (
                    <Badge variant="solid">Popular</Badge>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/memberships/${plan.id}`}>Edit</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plans.length === 0 ? (
        <p className="text-center text-sm text-muted">No plans created yet.</p>
      ) : null}
    </Container>
  );
}
