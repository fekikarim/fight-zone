import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, ChevronRight, MessageSquareText, Phone } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Settings" };

const SECTIONS = [
  { href: "/admin/settings/payments", icon: Banknote, title: "Payments", text: "Your bank-transfer details and in-person payment instructions — what members see when they pay." },
  { href: "/admin/settings/contact", icon: Phone, title: "Contact & social", text: "Phone, email, WhatsApp, address, hours and social links shown on the website." },
  { href: "/admin/settings/messages", icon: MessageSquareText, title: "Automatic messages", text: "The messages Fight Zone sends members automatically (registration, payment, badges…)." },
];

export default async function AdminSettingsPage() {
  await requireRole(["ADMIN", "COACH"]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Choose what you want to set up." />
      <ul className="space-y-3">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex items-center gap-4 rounded-xl border border-ink-border bg-ink-soft/40 p-4 transition-colors hover:border-primary/40 sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><s.icon className="h-5 w-5" aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.title}</span>
                <span className="block text-sm text-muted">{s.text}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
