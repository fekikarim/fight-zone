import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberStatusToggle } from "@/components/members/member-status-toggle";
import {
  attendanceStatusLabel,
  eventPaymentStatusLabel,
  formatTnd,
  registrationStatusLabel,
  type AttendanceStatus,
  type EventPaymentStatus,
  type RegistrationStatus,
} from "@/lib/types/events";
import { formatDate } from "@/lib/utils";
import { z } from "zod";

export const metadata: Metadata = { title: "Member" };

export default async function AdminMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "COACH"]);
  const { id } = await params;
  if (!z.guid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const [profile, regs, badges, rewards, conv] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, is_active, created_at").eq("id", id).maybeSingle(),
    supabase.from("event_participants")
      .select("id, registration_status, payment_status, attendance_status, amount_due_tnd, created_at, events ( id, title, start_at )")
      .eq("member_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("member_badges").select("id, awarded_at, revoked_at, badge_definitions ( name, threshold )").eq("member_id", id),
    supabase.from("member_rewards").select("id, reward_type, value_tnd, status, expires_at").eq("member_id", id),
    supabase.from("conversations").select("id").eq("member_id", id).maybeSingle(),
  ]);
  if (!profile.data) notFound();
  const p = profile.data;
  type Reg = { id: string; registration_status: RegistrationStatus; payment_status: EventPaymentStatus; attendance_status: AttendanceStatus;
    amount_due_tnd: number; created_at: string; events: { id: string; title: string; start_at: string } | null };
  const registrations = (regs.data ?? []) as unknown as Reg[];
  const attended = registrations.filter((r) => r.attendance_status === "ATTENDED").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={p.full_name ?? "Member"}
        back={{ href: "/admin/members", label: "All members" }}
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="h-3.5 w-3.5" aria-hidden />{p.email}</a>
            {p.phone ? <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="h-3.5 w-3.5" aria-hidden />{p.phone}</a> : null}
            <span>Joined {formatDate(p.created_at, { month: "long", year: "numeric" })}</span>
          </span>
        }
        actions={
          <>
            <Button asChild className="gap-2">
              <Link href={conv.data ? `/admin/messages/${conv.data.id}` : `/admin/messages`}><MessageSquare className="h-4 w-4" aria-hidden /> Message</Link>
            </Button>
            <MemberStatusToggle memberId={p.id} active={p.is_active} />
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Registrations", registrations.length],
          ["Events attended", attended],
          ["Badges", (badges.data ?? []).filter((b) => !b.revoked_at).length],
          ["Rewards available", (rewards.data ?? []).filter((r) => r.status === "AVAILABLE").length],
        ].map(([l, v]) => (
          <div key={String(l)} className="rounded-xl border border-ink-border bg-ink-soft/40 p-4">
            <dt className="text-xs text-muted">{l}</dt><dd className="mt-1 font-display text-2xl font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3" aria-labelledby="hist-h">
        <h2 id="hist-h" className="font-display text-xl font-semibold uppercase tracking-tight">Event history</h2>
        {registrations.length ? (
          <ul className="divide-y divide-ink-border rounded-xl border border-ink-border">
            {registrations.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  {r.events ? <Link href={`/admin/events/${r.events.id}`} className="block truncate text-sm font-medium hover:text-primary">{r.events.title}</Link> : null}
                  <span className="text-xs text-muted">{r.events ? formatDate(r.events.start_at, { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{registrationStatusLabel[r.registration_status]}</Badge>
                  {r.payment_status !== "NOT_REQUIRED" ? <Badge variant="neutral">{eventPaymentStatusLabel[r.payment_status]} · {formatTnd(r.amount_due_tnd)}</Badge> : null}
                  {r.attendance_status !== "UNMARKED" ? <Badge variant="neutral">{attendanceStatusLabel[r.attendance_status]}</Badge> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No registrations yet.</p>}
      </section>

      <section className="space-y-3" aria-labelledby="badge-h">
        <h2 id="badge-h" className="font-display text-xl font-semibold uppercase tracking-tight">Badges &amp; rewards</h2>
        {(badges.data ?? []).length || (rewards.data ?? []).length ? (
          <ul className="flex flex-wrap gap-2">
            {(badges.data ?? []).map((b) => {
              const def = b.badge_definitions as unknown as { name: string; threshold: number } | null;
              return <li key={b.id}><Badge variant={b.revoked_at ? "outline" : "default"}>{def?.name ?? "Badge"}{b.revoked_at ? " (revoked)" : ""}</Badge></li>;
            })}
            {(rewards.data ?? []).map((r) => (
              <li key={r.id}><Badge variant="neutral">{r.reward_type === "FREE_ENTRY" ? "Free entry" : `${formatTnd(r.value_tnd)} off`} · {r.status.toLowerCase().replace("_", " ")}</Badge></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No badges yet — they&apos;re earned from recorded attendance.</p>}
        <Link href="/admin/badges" className="text-sm text-primary hover:underline">Manage badges &amp; rewards →</Link>
      </section>
    </div>
  );
}
