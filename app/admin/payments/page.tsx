import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { PaymentReviewList } from "@/components/payments/payment-review-list";
import { getPaymentSubmissions } from "@/lib/payments/queries";
import { requireRole } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import type { PaymentSubmissionStatus } from "@/lib/types/events";

export const metadata: Metadata = { title: "Payments" };

const TABS: Array<{ key: PaymentSubmissionStatus; label: string }> = [
  { key: "SUBMITTED", label: "To review" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "REJECTED", label: "Rejected" },
];

interface Props {
  searchParams: Promise<{ status?: string; submission?: string }>;
}

export default async function AdminPaymentsPage({ searchParams }: Props) {
  await requireRole(["ADMIN", "COACH"]);
  const sp = await searchParams;
  const status = TABS.some((t) => t.key === sp.status) ? (sp.status as PaymentSubmissionStatus) : "SUBMITTED";
  const items = await getPaymentSubmissions(status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Bank-transfer proofs sent by members. Uploading a proof never confirms a payment — only your review does."
        actions={
          <Link href="/admin/reports" className="text-sm text-primary hover:underline">Income report →</Link>
        }
      />
      <nav aria-label="Proof status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/payments?status=${t.key}`} aria-current={status === t.key ? "page" : undefined}
            className={cn("inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-xs font-medium",
              status === t.key ? "border-primary bg-primary text-white" : "border-ink-border text-muted hover:text-foreground")}>
            {t.label}{t.key === "SUBMITTED" && status === "SUBMITTED" && items.length ? ` · ${items.length}` : ""}
          </Link>
        ))}
      </nav>
      <PaymentReviewList items={items} highlight={sp.submission} reviewable={status === "SUBMITTED"} />
      <p className="text-xs text-muted">
        In-person payments are recorded from each event&apos;s registration list (&quot;Record payment&quot;) — no proof upload needed.
      </p>
    </div>
  );
}
