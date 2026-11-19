import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { BadgeForm, BadgeRow, RewardQueue, type BadgeDef, type RewardRow } from "@/components/badges/badge-admin";
import { formatTnd } from "@/lib/types/events";

export const metadata: Metadata = { title: "Badges & rewards" };

export default async function AdminBadgesPage() {
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const [defs, awards, liability, rewards] = await Promise.all([
    supabase.from("badge_definitions").select("id, name, description, threshold, tier, icon, accent, is_active, reward_type, reward_value_tnd, reward_max_value_tnd, reward_expiry_days, reward_requires_approval, reward_total_cap, reward_terms").order("threshold"),
    supabase.from("member_badges").select("badge_id").is("revoked_at", null),
    supabase.rpc("get_reward_liability"),
    supabase.from("member_rewards")
      .select("id, member_id, reward_type, value_tnd, status, expires_at, created_at, badge_definitions ( name ), member:profiles!member_rewards_member_id_fkey ( full_name )")
      .in("status", ["PENDING_APPROVAL", "AVAILABLE"]).order("created_at"),
  ]);
  const counts = new Map<string, number>();
  for (const a of awards.data ?? []) counts.set(a.badge_id, (counts.get(a.badge_id) ?? 0) + 1);
  const badges: BadgeDef[] = (defs.data ?? []).map((b) => ({ ...b, reward_value_tnd: b.reward_value_tnd == null ? null : Number(b.reward_value_tnd),
    reward_max_value_tnd: b.reward_max_value_tnd == null ? null : Number(b.reward_max_value_tnd), awarded: counts.get(b.id) ?? 0 }));

  type R = { id: string; member_id: string; reward_type: string; value_tnd: number; status: string; expires_at: string | null; created_at: string;
    badge_definitions: { name: string } | null; member: { full_name: string | null } | null };
  const rows = (rewards.data ?? []) as unknown as R[];
  const memberIds = [...new Set(rows.map((r) => r.member_id))];
  const { data: regs } = memberIds.length
    ? await supabase.from("event_participants").select("id, member_id, amount_due_tnd, events ( title, start_at )")
        .in("member_id", memberIds).in("registration_status", ["PENDING", "CONFIRMED"]).in("payment_status", ["UNPAID", "REJECTED"])
    : { data: [] };
  type Reg = { id: string; member_id: string; amount_due_tnd: number; events: { title: string; start_at: string } | null };
  const regRows = (regs ?? []) as unknown as Reg[];
  const rewardRows: RewardRow[] = rows.map((r) => ({
    id: r.id, member_name: r.member?.full_name ?? null, badge_name: r.badge_definitions?.name ?? null, reward_type: r.reward_type,
    value_tnd: Number(r.value_tnd), status: r.status, expires_at: r.expires_at, created_at: r.created_at,
    candidates: regRows.filter((g) => g.member_id === r.member_id).map((g) => ({ id: g.id, label: `${g.events?.title ?? "Event"} — owes ${formatTnd(g.amount_due_tnd)}` })),
  }));
  const l = liability.data?.[0];

  return (
    <div className="space-y-8">
      <PageHeader title="Badges & rewards" description="Badges are earned only from attendance you record. Rewards are optional, capped, single-use and never automatic unless you allow it." />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Outstanding liability", formatTnd(Number(l?.outstanding_value ?? 0)), `${Number(l?.outstanding_count ?? 0)} available reward(s)`],
          ["Awaiting approval", formatTnd(Number(l?.pending_approval_value ?? 0)), `${Number(l?.pending_approval_count ?? 0)} reward(s)`],
          ["Redeemed so far", formatTnd(Number(l?.redeemed_value ?? 0)), `${Number(l?.redeemed_count ?? 0)} reward(s)`],
          ["Badges defined", String(badges.length), `${badges.filter((b) => b.reward_type).length} with a reward`],
        ].map(([a, b, c]) => (
          <div key={a} className="rounded-xl border border-ink-border bg-ink-soft/40 p-4">
            <dt className="text-xs text-muted">{a}</dt><dd className="mt-1 font-display text-xl font-bold">{b}</dd><dd className="text-xs text-muted">{c}</dd>
          </div>
        ))}
      </dl>
      <section className="space-y-3" aria-labelledby="rw-h">
        <h2 id="rw-h" className="font-display text-xl font-semibold uppercase tracking-tight">Open rewards</h2>
        <RewardQueue rewards={rewardRows} />
      </section>
      <section className="space-y-3" aria-labelledby="bd-h">
        <h2 id="bd-h" className="font-display text-xl font-semibold uppercase tracking-tight">Milestone badges</h2>
        {badges.length ? <ul className="space-y-2">{badges.map((b) => <BadgeRow key={b.id} badge={b} />)}</ul>
          : <p className="text-sm text-muted">No badges yet. Create your first milestone below (e.g. 10 events).</p>}
      </section>
      <section className="space-y-3" aria-labelledby="new-h">
        <h2 id="new-h" className="font-display text-xl font-semibold uppercase tracking-tight">New badge</h2>
        <div className="rounded-xl border border-ink-border bg-ink-soft/40 p-4 sm:p-6"><BadgeForm /></div>
      </section>
    </div>
  );
}
