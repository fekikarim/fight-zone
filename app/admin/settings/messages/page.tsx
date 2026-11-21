import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { MessageTemplateForm, type TemplateRow } from "@/components/settings/settings-forms";

export const metadata: Metadata = { title: "Automatic messages" };

const ORDER = ["welcome", "registration_pending", "registration_confirmed", "registration_waitlisted", "registration_rejected",
  "registration_cancelled", "payment_instructions", "payment_proof_received", "payment_confirmed", "payment_rejected",
  "event_updated", "event_cancelled", "badge_earned", "reward_available", "reward_redeemed"];

export default async function MessageSettingsPage() {
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data } = await supabase.from("message_templates").select("key, label, body, is_enabled, is_essential");
  const rows = ((data ?? []) as TemplateRow[]).sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Insight" title="Automatic messages" back={{ href: "/admin/settings", label: "Settings" }}
        description="Fight Zone sends these to members by itself, labelled “Fight Zone · automatic message” in their conversation with you. Click a button like “+ Event name” to insert the member's real details — they are filled in automatically." />
      <div className="space-y-4">{rows.map((t) => <MessageTemplateForm key={t.key} template={t} />)}</div>
    </div>
  );
}
