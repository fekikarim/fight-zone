import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { logError } from "@/lib/errors";

export interface BadgeView {
  id: string;
  name: string;
  description: string | null;
  threshold: number;
  tier: string;
  icon: string;
  accent: string;
  earned_at: string | null;
}

export interface RewardView {
  id: string;
  reward_type: "FREE_ENTRY" | "DISCOUNT_TND";
  value_tnd: number;
  status: string;
  terms: string | null;
  expires_at: string | null;
  badge_name: string | null;
}

export interface MemberProgress {
  attended: number;
  earned: BadgeView[];
  locked: BadgeView[];
  next: BadgeView | null;
  rewards: RewardView[];
}

/** The signed-in member's attendance-based progress (RLS: own rows only). */
export const getMyProgress = cache(async (): Promise<MemberProgress> => {
  const user = await getCurrentUser();
  const empty = { attended: 0, earned: [], locked: [], next: null, rewards: [] };
  if (!user) return empty;
  try {
    const supabase = await createClient();
    const [att, defs, mine, rewards] = await Promise.all([
      supabase.from("event_participants").select("id", { count: "exact", head: true }).eq("member_id", user.id).eq("attendance_status", "ATTENDED"),
      supabase.from("badge_definitions").select("id, name, description, threshold, tier, icon, accent").eq("is_active", true).order("threshold"),
      supabase.from("member_badges").select("badge_id, awarded_at").eq("member_id", user.id).is("revoked_at", null),
      supabase.from("member_rewards").select("id, reward_type, value_tnd, status, terms, expires_at, badge_definitions ( name )")
        .eq("member_id", user.id).order("created_at", { ascending: false }),
    ]);
    const earnedAt = new Map((mine.data ?? []).map((m) => [m.badge_id, m.awarded_at]));
    const all = (defs.data ?? []).map((d) => ({ ...d, earned_at: earnedAt.get(d.id) ?? null }));
    const earned = all.filter((b) => b.earned_at);
    const locked = all.filter((b) => !b.earned_at);
    type R = Omit<RewardView, "badge_name" | "value_tnd"> & { value_tnd: number; badge_definitions: { name: string } | null };
    return {
      attended: att.count ?? 0,
      earned,
      locked,
      next: locked[0] ?? null,
      rewards: ((rewards.data ?? []) as unknown as R[]).map((r) => ({ ...r, value_tnd: Number(r.value_tnd), badge_name: r.badge_definitions?.name ?? null })),
    };
  } catch (error) {
    logError("Query failed: member progress", error);
    return empty;
  }
});
