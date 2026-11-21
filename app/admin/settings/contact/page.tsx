import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { getSiteSettings } from "@/lib/settings/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { SiteSettingsForm } from "@/components/settings/settings-forms";

export const metadata: Metadata = { title: "Contact settings" };

export default async function ContactSettingsPage() {
  await requireRole(["ADMIN", "COACH"]);
  const site = await getSiteSettings();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Insight" title="Contact & social" back={{ href: "/admin/settings", label: "Settings" }}
        description="Shown on the Contact page and in the website footer. Leave a field empty to hide it." />
      <div className="rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-6"><SiteSettingsForm settings={site} /></div>
    </div>
  );
}
