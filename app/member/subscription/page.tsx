import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Calendar, CreditCard, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentMemberSubscription, getMemberSubscriptionHistory } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";
import {
  subscriptionStatusLabel,
  billingIntervalLabel,
  daysUntilExpiry,
} from "@/lib/types/memberships";

export const metadata: Metadata = {
  title: "My Membership",
  description: "View and manage your Fight Zone membership.",
};

export default async function MemberSubscriptionPage() {
  await requireUser();
  const [subscription, history] = await Promise.all([
    getCurrentMemberSubscription(),
    getMemberSubscriptionHistory(),
  ]);

  const isActive = subscription?.status === "ACTIVE";
  const daysLeft = subscription ? daysUntilExpiry(subscription.ends_at) : 0;
  const isExpiringSoon = isActive && daysLeft <= 7;

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          My Membership
        </h1>
        <p className="text-sm text-muted">
          View your current plan, status, and subscription history.
        </p>
      </div>

      {/* Expiring soon banner */}
      {isExpiringSoon ? (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" aria-hidden />
          <p className="text-sm text-yellow-200">
            Your membership expires in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>.
            Renew now to keep your access uninterrupted.
          </p>
          <Button asChild size="sm" className="ml-auto shrink-0">
            <Link href="/pricing">
              Renew
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Active subscription card */}
      {subscription && isActive ? (
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-ink-soft/50 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-display text-xl font-bold uppercase tracking-wide">
                  {subscription.membership_plans?.name ?? "Membership"}
                </h2>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="solid">{subscriptionStatusLabel[subscription.status]}</Badge>
                <span className="text-xs text-muted">
                  {billingIntervalLabel[subscription.membership_plans?.billing_interval ?? "MONTHLY"]}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted">Expires</p>
                <p className="text-sm font-semibold">
                  {formatDate(subscription.ends_at)}
                </p>
                <p className="text-xs text-primary">{daysLeft} days left</p>
              </div>
            </div>
            {subscription.membership_plans?.session_credits !== null && subscription.membership_plans?.session_credits !== undefined ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted">Session credits</p>
                  <p className="text-sm font-semibold">
                    {subscription.remaining_credits} remaining
                  </p>
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted">Started</p>
                <p className="text-sm font-semibold">
                  {formatDate(subscription.starts_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Perks */}
          {subscription.membership_plans?.features && subscription.membership_plans.features.length > 0 ? (
            <div className="mt-6 border-t border-primary/20 pt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
                Included perks
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {subscription.membership_plans.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/pricing">Change plan</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/member/payments">
                View payments
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-ink-border bg-ink-soft/50 p-8 text-center">
          <Crown className="mx-auto h-10 w-10 text-muted" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold uppercase tracking-wide">
            No active membership
          </p>
          <p className="mt-2 text-sm text-muted">
            Join Fight Zone to access coaching sessions, open gym, and more.
          </p>
          <Button asChild className="mt-6">
            <Link href="/pricing">
              Browse plans
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      )}

      {/* Subscription history */}
      {history.length > 1 ? (
        <section>
          <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">
            Subscription history
          </h2>
          <div className="[contain:inline-size] overflow-x-auto rounded-xl border border-ink-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-border bg-ink-soft/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted">Plan</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">Start</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted">End</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sub) => (
                  <tr key={sub.id} className="border-b border-ink-border/50">
                    <td className="px-4 py-3 font-medium">
                      {sub.membership_plans?.name ?? "Plan"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={sub.status === "ACTIVE" ? "solid" : "neutral"}>
                        {subscriptionStatusLabel[sub.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(sub.starts_at)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(sub.ends_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </Container>
  );
}
