import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminPayments } from "@/lib/supabase/queries";
import { formatDate, formatPrice } from "@/lib/utils";
import { paymentStatusLabel, paymentMethodLabel } from "@/lib/types/memberships";
import type { Database } from "@/types/database.types";

export const metadata: Metadata = {
  title: "Payments",
  description: "View and manage payment transactions.",
};

interface PageProps {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status as Database["public"]["Enums"]["payment_status"] | undefined;

  const { items, nextCursor, hasMore } = await getAdminPayments({
    status,
    cursor: params.cursor,
    pageSize: 20,
  });

  const statusFilters: Array<{ label: string; value?: Database["public"]["Enums"]["payment_status"] }> = [
    { label: "All" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Pending", value: "PENDING" },
    { label: "Failed", value: "FAILED" },
    { label: "Refunded", value: "REFUNDED" },
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
          Payments
        </h1>
        <p className="mt-1 text-sm text-muted">
          {items.length} transaction{items.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.value ? `/admin/memberships/payments?status=${filter.value}` : "/admin/memberships/payments"}
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
          <p className="text-sm text-muted">No payments found.</p>
        </div>
      ) : (
        <div className="[contain:inline-size] overflow-x-auto rounded-xl border border-ink-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-border bg-ink-soft/50">
                <th className="px-4 py-3 text-left font-semibold text-muted">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Member</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Method</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Reference</th>
              </tr>
            </thead>
            <tbody>
              {items.map((payment) => {
                const memberName = (payment as unknown as { member_profiles?: { profiles?: { full_name?: string | null } | null } | null }).member_profiles?.profiles?.full_name ?? "Member";
                return (
                  <tr key={payment.id} className="border-b border-ink-border/50">
                    <td className="px-4 py-3 text-muted">
                      {formatDate(payment.paid_at ?? payment.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium">{memberName}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPrice(Number(payment.amount), payment.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {payment.payment_method
                        ? paymentMethodLabel[payment.payment_method] ?? payment.payment_method
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          payment.status === "COMPLETED" || payment.status === "PAID"
                            ? "solid"
                            : payment.status === "PENDING"
                              ? "default"
                              : "outline"
                        }
                      >
                        {paymentStatusLabel[payment.status] ?? payment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {payment.transaction_ref ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between">
        <div />
        {hasMore && nextCursor ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/admin/memberships/payments?${new URLSearchParams({
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
