import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { ContactInbox, type ContactRow } from "@/components/site-content/contact-inbox";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contact inbox" };

const TABS = [{ k: "UNREAD", l: "New" }, { k: "READ", l: "Read" }, { k: "REPLIED", l: "Replied" }] as const;

export default async function AdminInboxPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole(["ADMIN", "COACH"]);
  const { status: raw } = await searchParams;
  const status = TABS.some((t) => t.k === raw) ? (raw as ContactRow["status"]) : "UNREAD";
  const supabase = await createClient();
  const { data } = await supabase.from("contact_messages").select("id, name, email, subject, message, category, status, created_at")
    .eq("status", status).order("created_at", { ascending: false }).limit(200);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Engage" title="Contact inbox" description="Messages sent from the public contact form." />
      <nav aria-label="Status" className="flex gap-2">
        {TABS.map((t) => (
          <Link key={t.k} href={`/admin/inbox?status=${t.k}`} aria-current={status === t.k ? "page" : undefined}
            className={cn("inline-flex h-9 items-center rounded-md border px-3.5 text-[13px] font-semibold transition-colors", status === t.k ? "border-foreground bg-foreground text-ink" : "border-ink-border text-muted hover:text-foreground")}>{t.l}</Link>
        ))}
      </nav>
      <ContactInbox rows={(data ?? []) as ContactRow[]} />
    </div>
  );
}
