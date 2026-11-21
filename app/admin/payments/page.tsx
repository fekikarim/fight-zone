import type { Metadata } from "next";
import Link from "next/link";
import { AppTabs } from "@/components/ui/app-tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import { PaymentReviewList } from "@/components/payments/payment-review-list";
import { getPaymentSubmissions } from "@/lib/payments/queries";
import { requireRole } from "@/lib/auth/guards";
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
        eyebrow="Operate"
        title="Payments"
        description="Bank-transfer proofs sent by members. Uploading a proof never confirms a payment — only your review does."
        actions={
          <Link href="/admin/reports" className="text-sm text-primary hover:underline">Income report →</Link>
        }
      />
      <AppTabs
        label="Proof status"
        tabs={TABS.map((t) => ({
          href: `/admin/payments?status=${t.key}`,
          label: t.label,
          active: status === t.key,
          count: t.key === "SUBMITTED" && status === "SUBMITTED" ? items.length : undefined,
        }))}
      />
      <PaymentReviewList items={items} highlight={sp.submission} reviewable={status === "SUBMITTED"} />
      <p className="text-xs text-muted">
        In-person payments are recorded from each event&apos;s registration list (&quot;Record payment&quot;) — no proof upload needed.
      </p>
    </div>
  );
}
