import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminSubscriptions } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";
import { subscriptionStatusLabel, billingIntervalLabel } from "@/lib/types/memberships";
import type { Database } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Subscriptions",
  description: "View and manage member subscriptions.",
};

interface PageProps {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status as Database["public"]["Enums"]["subscription_status"] | undefined;

  const { items, nextCursor, hasMore } = await getAdminSubscriptions({
    status,
    cursor: params.cursor,
    pageSize: 20,
  });

  const statusFilters: Array<{ label: string; value?: Database["public"]["Enums"]["subscription_status"] }> = [
    { label: "All" },
    { label: "Active", value: "ACTIVE" },
    { label: "Past Due", value: "PAST_DUE" },
    { label: "Expired", value: "EXPIRED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div>
        <Link
          href="/admin/memberships"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to memberships
        </Link>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Subscriptions
        </h1>
        <p className="mt-1 text-sm text-muted">
          {items.length} subscription{items.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.value ? `/admin/memberships/subscriptions?status=${filter.value}` : "/admin/memberships/subscriptions"}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              (status ?? "") === (filter.value ?? "")
                ? "bg-primary text-white"
                : "border border-ink-border bg-ink-soft/50 text-muted hover:text-foreground"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-ink-border bg-ink-soft/20 p-8 text-center">
          <p className="text-sm text-muted">No subscriptions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-border bg-ink-soft/50">
                <th className="px-4 py-3 text-left font-semibold text-muted">Member</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Plan</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Interval</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Start</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">End</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Credits</th>
              </tr>
            </thead>
            <tbody>
              {items.map((sub) => {
                const memberName = (sub as unknown as { member_profiles?: { profiles?: { full_name?: string | null } | null } | null }).member_profiles?.profiles?.full_name ?? "Member";
                return (
                  <tr key={sub.id} className="border-b border-ink-border/50">
                    <td className="px-4 py-3 font-medium">{memberName}</td>
                    <td className="px-4 py-3">
                      {sub.membership_plans?.name ?? "Plan"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {sub.membership_plans?.billing_interval
                        ? billingIntervalLabel[sub.membership_plans.billing_interval]
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={sub.status === "ACTIVE" ? "solid" : "neutral"}>
                        {subscriptionStatusLabel[sub.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(sub.starts_at)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(sub.ends_at)}</td>
                    <td className="px-4 py-3 text-muted">{sub.remaining_credits}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between">
        <div />
        {hasMore && nextCursor ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/admin/memberships/subscriptions?${new URLSearchParams({
                ...(status ? { status } : {}),
                cursor: nextCursor,
              }).toString()}`}
            >
              Next page
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </Container>
  );
}
