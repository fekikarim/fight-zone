import type { Metadata } from "next";
import Link from "next/link";
import { Gift, Lock, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getMyProgress } from "@/lib/members/progress";
import { PageHeader } from "@/components/dashboard/page-header";
import { BadgeMedal } from "@/components/badges/badge-medal";
import { formatTnd } from "@/lib/types/events";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Achievements" };

const TIER_LABEL: Record<string, string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", PLATINUM: "Platinum", LEGEND: "Legend" };
const REWARD_STATUS: Record<string, string> = {
  PENDING_APPROVAL: "Waiting for Coach Seif's approval",
  AVAILABLE: "Ready to use — Coach Seif applies it to an eligible event",
  REDEEMED: "Used",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
};

export default async function AchievementsPage() {
  await requireUser();
  const p = await getMyProgress();
  const all = [...p.earned, ...p.locked].sort((a, b) => a.threshold - b.threshold);
  const pct = p.next ? Math.min(100, Math.round((p.attended / p.next.threshold) * 100)) : 100;

  return (
    <div className="space-y-8">
      <PageHeader title="Achievements" description="Badges you unlock by showing up. Every event Coach Seif records as attended counts." />

      <section className="grid gap-4 rounded-2xl border border-ink-border bg-gradient-to-br from-primary/15 via-ink-soft/40 to-transparent p-5 sm:grid-cols-3 sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Events attended</p>
          <p className="font-display text-4xl font-bold">{p.attended}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Badges unlocked</p>
          <p className="font-display text-4xl font-bold">{p.earned.length}<span className="text-xl text-muted"> / {all.length}</span></p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">{p.next ? "Next unlock" : "Status"}</p>
          {p.next ? (
            <>
              <p className="mt-1 text-sm">{p.next.threshold - p.attended} more event{p.next.threshold - p.attended === 1 ? "" : "s"}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-soft" role="progressbar" aria-valuemin={0} aria-valuemax={p.next.threshold} aria-valuenow={p.attended} aria-label="Progress to the next badge">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </>
          ) : <p className="mt-1 text-sm">{all.length ? "Every badge unlocked. Legend." : "Badges are coming soon."}</p>}
        </div>
      </section>

      {all.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {all.map((b) => {
            const earned = !!b.earned_at;
            return (
              <li key={b.id} className={cn("relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-colors",
                earned ? "border-primary/40 bg-gradient-to-b from-primary/10 to-transparent" : "border-ink-border bg-ink-soft/30")}>
                <div className="relative">
                  <BadgeMedal icon={b.icon} accent={b.accent} size="lg" earned={earned} />
                  {!earned ? (
                    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-ink-border bg-ink">
                      <Lock className="h-3.5 w-3.5 text-muted" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className={cn("font-semibold", !earned && "text-muted")}>{earned ? b.name : "Locked badge"}</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted">{TIER_LABEL[b.tier] ?? b.tier}</p>
                </div>
                <p className="text-xs text-muted">
                  {earned
                    ? `Unlocked ${formatDate(b.earned_at!, { day: "numeric", month: "short", year: "numeric" })}`
                    : `Attend ${b.threshold} event${b.threshold === 1 ? "" : "s"} to reveal it`}
                </p>
                {earned && b.description ? <p className="text-xs text-foreground/80">{b.description}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-border px-6 py-14 text-center">
          <Trophy className="h-10 w-10 text-primary" aria-hidden />
          <p className="text-sm text-muted">Coach Seif hasn&apos;t set up badges yet — your attended events already count toward them.</p>
          <Link href="/member/events?tab=discover" className="text-sm font-medium text-primary hover:underline">Find your next event</Link>
        </div>
      )}

      {p.rewards.length ? (
        <section className="space-y-3" aria-labelledby="rewards-h">
          <h2 id="rewards-h" className="font-display text-xl font-bold uppercase tracking-tight">Rewards</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {p.rewards.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-xl border border-ink-border bg-ink-soft/30 p-4">
                <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{r.reward_type === "FREE_ENTRY" ? `Free entry (up to ${formatTnd(r.value_tnd)})` : `${formatTnd(r.value_tnd)} off one event`}</p>
                  <p className="text-xs text-muted">{REWARD_STATUS[r.status] ?? r.status}{r.expires_at && r.status === "AVAILABLE" ? ` · expires ${formatDate(r.expires_at, { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
                  <p className="mt-1 text-xs text-muted">{r.terms ?? "Personal, single use, not transferable, no cash value."}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
