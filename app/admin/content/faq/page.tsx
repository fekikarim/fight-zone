import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { FaqForm, FaqList, type FaqItem } from "@/components/site-content/faq-admin";

export const metadata: Metadata = { title: "FAQ" };

export default async function AdminFaqPage() {
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data } = await supabase.from("faq_items").select("id, category, question, answer, is_published").order("position").order("created_at");
  const items = (data ?? []) as FaqItem[];
  const categories = [...new Set(["General", "Events", "Payments", ...items.map((i) => i.category)])];
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="FAQ" back={{ href: "/admin/content", label: "Back to content" }} description="Questions shown on the public FAQ page, in this order." />
      <FaqList items={items} categories={categories} />
      <section className="space-y-3" aria-labelledby="new-faq">
        <h2 id="new-faq" className="font-display text-xl font-semibold uppercase tracking-tight">Add a question</h2>
        <div className="rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-6"><FaqForm categories={categories} /></div>
      </section>
    </div>
  );
}
