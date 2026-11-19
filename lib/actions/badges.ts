"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { logError } from "@/lib/errors";
import { issuesToFieldErrors, type FieldErrors } from "@/lib/validations/form-errors";
import { badgeSchema } from "@/lib/validations/badges";

export interface BadgeActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
}

const SAFE = new Set(["42501", "P0002", "23505", "22023"]);

function revalidate() {
  revalidatePath("/admin/badges");
  revalidatePath("/member", "layout");
}

export async function saveBadge(_prev: BadgeActionState, formData: FormData): Promise<BadgeActionState> {
  const get = (k: string) => formData.get(k) ?? undefined;
  const parsed = badgeSchema.safeParse({
    id: get("id") || undefined,
    name: get("name"),
    description: get("description"),
    threshold: get("threshold"),
    tier: get("tier"),
    icon: get("icon"),
    accent: get("accent"),
    is_active: get("is_active") === "true",
    reward_type: get("reward_type"),
    reward_value_tnd: get("reward_value_tnd"),
    reward_expiry_days: get("reward_expiry_days"),
    reward_total_cap: get("reward_total_cap"),
    reward_requires_approval: get("reward_requires_approval") !== "false",
    reward_terms: get("reward_terms"),
  });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  await requireRole(["ADMIN", "COACH"]);
  const { id, reward_value_tnd, ...d } = parsed.data;
  const row = {
    ...d,
    reward_value_tnd: d.reward_type === "DISCOUNT_TND" ? reward_value_tnd ?? null : null,
    reward_max_value_tnd: d.reward_type === "FREE_ENTRY" ? reward_value_tnd ?? null : null,
    reward_expiry_days: d.reward_type ? d.reward_expiry_days ?? null : null,
    reward_total_cap: d.reward_type ? d.reward_total_cap ?? null : null,
    reward_terms: d.reward_type ? d.reward_terms : null,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("badge_definitions").update(row).eq("id", id)
    : await supabase.from("badge_definitions").insert(row);
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Another badge already uses this threshold.", fieldErrors: { threshold: "Another badge already uses this number of events." } };
    logError("Failed to save badge", error);
    return { ok: false, message: "We could not save the badge." };
  }
  // Apply the (possibly new) thresholds to everyone, idempotently.
  await supabase.rpc("reconcile_all_progress");
  revalidate();
  return { ok: true, message: id ? "Badge updated" : "Badge created" };
}

export async function deleteBadge(badgeId: string): Promise<BadgeActionState> {
  if (!z.guid().safeParse(badgeId).success) return { ok: false, message: "Invalid badge." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.from("badge_definitions").delete().eq("id", badgeId);
  if (error) {
    if (error.code === "23503") return { ok: false, message: "Members already earned this badge — deactivate it instead to keep their history." };
    logError("Failed to delete badge", error);
    return { ok: false, message: "We could not delete the badge." };
  }
  revalidate();
  return { ok: true, message: "Badge deleted" };
}

export async function setRewardStatus(rewardId: string, action: "APPROVE" | "REVOKE", reason?: string): Promise<BadgeActionState> {
  if (!z.guid().safeParse(rewardId).success) return { ok: false, message: "Invalid reward." };
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_reward_status", { p_reward_id: rewardId, p_action: action, p_reason: reason });
  if (error) {
    if (!SAFE.has(error.code ?? "")) logError("Failed to update reward", error);
    return { ok: false, message: SAFE.has(error.code ?? "") ? error.message : "We could not update the reward." };
  }
  revalidate();
  return { ok: true, message: action === "APPROVE" ? "Reward approved — the member was notified" : "Reward revoked" };
}

export async function redeemReward(rewardId: string, registrationId: string): Promise<BadgeActionState> {
  if (!z.guid().safeParse(rewardId).success || !z.guid().safeParse(registrationId).success) {
    return { ok: false, message: "Choose a registration." };
  }
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_reward", { p_reward_id: rewardId, p_registration_id: registrationId });
  if (error) {
    if (!SAFE.has(error.code ?? "")) logError("Failed to redeem reward", error);
    return { ok: false, message: SAFE.has(error.code ?? "") ? error.message : "We could not apply the reward." };
  }
  revalidate();
  revalidatePath("/admin/events", "layout");
  return { ok: true, message: `Reward applied (${Number(data).toFixed(3)} TND)` };
}

/** How many members already qualify for a threshold (impact preview). */
export async function previewBadgeImpact(threshold: number): Promise<number | null> {
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 10000) return null;
  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_badge_impact", { p_threshold: threshold });
  return error ? null : Number(data);
}
