import type { Metadata } from "next";
import { CreditCard, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { getMemberPayments } from "@/lib/supabase/queries";
import { formatDate, formatPrice } from "@/lib/utils";
import { paymentStatusLabel, paymentMethodLabel } from "@/lib/types/memberships";

export const metadata: Metadata = {
  title: "Payment History",
  description: "View your Fight Zone payment and invoice history.",
};

export default async function MemberPaymentsPage() {
  await requireUser();
  const payments = await getMemberPayments();

  return (
    <Container className="flex max-w-none flex-col gap-8 px-0">
      <div className="flex flex-col gap-2">
        <Link
          href="/member/subscription"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to membership
        </Link>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight">
          Payment History
        </h1>
        <p className="text-sm text-muted">
          Your invoices and transaction receipts.
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-2xl border border-ink-border bg-ink-soft/50 p-8 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-muted" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold uppercase tracking-wide">
            No payments recorded
          </p>
          <p className="mt-2 text-sm text-muted">
            Your payment history will appear here once you subscribe to a plan.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-border bg-ink-soft/50">
                <th className="px-4 py-3 text-left font-semibold text-muted">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Method</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-muted">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-ink-border/50">
                  <td className="px-4 py-3 text-muted">
                    {formatDate(payment.paid_at ?? payment.created_at)}
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
