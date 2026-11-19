import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { getPaymentSettings } from "@/lib/settings/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { PaymentSettingsForm } from "@/components/settings/settings-forms";

export const metadata: Metadata = { title: "Payment settings" };

export default async function PaymentSettingsPage() {
  await requireRole(["ADMIN", "COACH"]);
  const payment = await getPaymentSettings();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Payments" back={{ href: "/admin/settings", label: "Settings" }}
        description="Members pay in person or by bank transfer — never online. What you write here is shown to members with a paid registration." />
      <div className="rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-6"><PaymentSettingsForm settings={payment} /></div>
    </div>
  );
}
