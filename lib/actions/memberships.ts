"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import {
  createPlanSchema,
  updatePlanSchema,
  subscribePlanSchema,
  cancelSubscriptionSchema,
  recordPaymentSchema,
  grantSubscriptionSchema,
} from "@/lib/validations/memberships";
import { computeEndsAt } from "@/lib/types/memberships";
import { logError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Action state
// ---------------------------------------------------------------------------

export interface MembershipActionState {
  ok: boolean;
  message?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Revalidation helpers
// ---------------------------------------------------------------------------

function revalidatePlans() {
  revalidatePath("/pricing");
  revalidatePath("/admin/memberships");
}

function revalidateSubscriptions() {
  revalidatePath("/member/subscription");
  revalidatePath("/member");
  revalidatePath("/admin/memberships/subscriptions");
}

function revalidatePayments() {
  revalidatePath("/member/payments");
  revalidatePath("/admin/memberships/payments");
}

// ---------------------------------------------------------------------------
// Member: Subscribe to plan
// ---------------------------------------------------------------------------

export async function subscribeToPlan(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const parsed = subscribePlanSchema.safeParse({ planId: formData.get("planId") });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  const user = await requireRole(["MEMBER", "ADMIN"]);
  const supabase = await createClient();

  // Fetch the plan to compute ends_at
  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("id, billing_interval, session_credits, price")
    .eq("id", parsed.data.planId)
    .eq("is_active", true)
    .maybeSingle();

  if (planError || !plan) {
    return { ok: false, message: "Plan not found or unavailable." };
  }

  const startsAt = new Date();
  const endsAt = computeEndsAt(plan.billing_interval, startsAt);

  // Create subscription
  const { data: subscription, error: subError } = await supabase
    .from("member_subscriptions")
    .insert({
      member_id: user.id,
      plan_id: plan.id,
      status: "ACTIVE",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      remaining_credits: plan.session_credits ?? 0,
    })
    .select("id")
    .single();

  if (subError) {
    logError("Failed to create subscription", subError, { userId: user.id, planId: plan.id });
    return { ok: false, message: "Could not create subscription. Please try again." };
  }

  // Create payment record
  const { error: paymentError } = await supabase.from("payments").insert({
    member_id: user.id,
    subscription_id: subscription.id,
    amount: plan.price,
    currency: "TND",
    status: "COMPLETED",
    payment_method: "ONLINE",
    paid_at: startsAt.toISOString(),
  });

  if (paymentError) {
    logError("Failed to create payment record", paymentError, {
      userId: user.id,
      subscriptionId: subscription.id,
    });
    // Subscription was created but payment failed — still return success since
    // the subscription is the primary entity. Admin can reconcile payment.
  }

  revalidateSubscriptions();
  revalidatePayments();
  return { ok: true, id: subscription.id, message: "Subscription activated!" };
}

// ---------------------------------------------------------------------------
// Member/Admin: Cancel subscription
// ---------------------------------------------------------------------------

export async function cancelSubscription(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const parsed = cancelSubscriptionSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
  });
  if (!parsed.success) return { ok: false, message: "Invalid data." };

  const user = await requireRole(["MEMBER", "ADMIN"]);
  const supabase = await createClient();

  // Members can only cancel their own; admins can cancel any
  let query = supabase
    .from("member_subscriptions")
    .update({ status: "CANCELLED", auto_renew: false })
    .eq("id", parsed.data.subscriptionId)
    .eq("status", "ACTIVE");

  // If member (not admin), restrict to own subscription
  if (!user.roles.includes("ADMIN")) {
    query = query.eq("member_id", user.id);
  }

  const { error } = await query;

  if (error) {
    logError("Failed to cancel subscription", error, {
      subscriptionId: parsed.data.subscriptionId,
    });
    return { ok: false, message: "Could not cancel subscription." };
  }

  revalidateSubscriptions();
  return { ok: true, message: "Subscription cancelled." };
}

// ---------------------------------------------------------------------------
// Admin: Plan CRUD
// ---------------------------------------------------------------------------

export async function createMembershipPlan(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const featuresRaw = formData.get("features") as string | null;
  const features = featuresRaw
    ? featuresRaw.split("\n").map((f) => f.trim()).filter(Boolean)
    : [];

  const parsed = createPlanSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    tier: formData.get("tier"),
    billing_interval: formData.get("billing_interval"),
    price: formData.get("price"),
    currency: formData.get("currency") || undefined,
    session_credits: formData.get("session_credits") || undefined,
    features: featuresRaw || undefined,
    is_popular: formData.get("is_popular") === "true",
    is_active: formData.get("is_active") !== "false",
    sort_order: formData.get("sort_order") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("membership_plans")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description ?? null,
      tier: parsed.data.tier,
      billing_interval: parsed.data.billing_interval,
      price: parsed.data.price,
      currency: parsed.data.currency,
      session_credits: parsed.data.session_credits ?? null,
      features,
      is_popular: parsed.data.is_popular,
      is_active: parsed.data.is_active,
      sort_order: parsed.data.sort_order,
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to create membership plan", error, { name: parsed.data.name });
    if (error.code === "23505") {
      return { ok: false, message: "A plan with this slug already exists." };
    }
    return { ok: false, message: "Could not create plan." };
  }

  revalidatePlans();
  return { ok: true, id: data.id, message: "Plan created." };
}

export async function updateMembershipPlan(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const featuresRaw = formData.get("features") as string | null;

  const parsed = updatePlanSchema.safeParse({
    planId: formData.get("planId"),
    name: formData.get("name") || undefined,
    slug: formData.get("slug") || undefined,
    description: formData.get("description") || undefined,
    tier: formData.get("tier") || undefined,
    billing_interval: formData.get("billing_interval") || undefined,
    price: formData.get("price") || undefined,
    currency: formData.get("currency") || undefined,
    session_credits: formData.get("session_credits") || undefined,
    features: featuresRaw || undefined,
    is_popular: formData.get("is_popular") === "true" ? true : formData.get("is_popular") === "false" ? false : undefined,
    is_active: formData.get("is_active") === "true" ? true : formData.get("is_active") === "false" ? false : undefined,
    sort_order: formData.get("sort_order") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { planId, name, slug, description, tier, billing_interval, price, currency, session_credits, is_popular, is_active, sort_order } = parsed.data;

  const { error } = await supabase
    .from("membership_plans")
    .update({
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(tier !== undefined && { tier }),
      ...(billing_interval !== undefined && { billing_interval }),
      ...(price !== undefined && { price }),
      ...(currency !== undefined && { currency }),
      ...(session_credits !== undefined && { session_credits }),
      ...(featuresRaw !== undefined && {
        features: featuresRaw
          ? featuresRaw.split("\n").map((f) => f.trim()).filter(Boolean)
          : [],
      }),
      ...(is_popular !== undefined && { is_popular }),
      ...(is_active !== undefined && { is_active }),
      ...(sort_order !== undefined && { sort_order }),
    })
    .eq("id", planId);

  if (error) {
    logError("Failed to update membership plan", error, { planId });
    if (error.code === "23505") {
      return { ok: false, message: "A plan with this slug already exists." };
    }
    return { ok: false, message: "Could not update plan." };
  }

  revalidatePlans();
  return { ok: true, id: planId, message: "Plan updated." };
}

export async function toggleMembershipPlanActive(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const planId = formData.get("planId") as string;
  const isActive = formData.get("is_active") === "true";

  if (!planId) return { ok: false, message: "Missing plan ID." };

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("membership_plans")
    .update({ is_active: isActive })
    .eq("id", planId);

  if (error) {
    logError("Failed to toggle plan active", error, { planId });
    return { ok: false, message: "Could not update plan status." };
  }

  revalidatePlans();
  return { ok: true, message: isActive ? "Plan activated." : "Plan deactivated." };
}

// ---------------------------------------------------------------------------
// Admin: Record payment
// ---------------------------------------------------------------------------

export async function recordPayment(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const parsed = recordPaymentSchema.safeParse({
    memberId: formData.get("memberId"),
    subscriptionId: formData.get("subscriptionId") || null,
    amount: formData.get("amount"),
    currency: formData.get("currency") || undefined,
    status: formData.get("status") || undefined,
    payment_method: formData.get("payment_method"),
    transaction_reference: formData.get("transaction_reference") || undefined,
    paid_at: formData.get("paid_at") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .insert({
      member_id: parsed.data.memberId,
      subscription_id: parsed.data.subscriptionId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      status: parsed.data.status,
      payment_method: parsed.data.payment_method,
      transaction_ref: parsed.data.transaction_reference ?? null,
      paid_at: parsed.data.paid_at ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to record payment", error, { memberId: parsed.data.memberId });
    return { ok: false, message: "Could not record payment." };
  }

  revalidatePayments();
  return { ok: true, id: data.id, message: "Payment recorded." };
}

// ---------------------------------------------------------------------------
// Admin: Grant subscription
// ---------------------------------------------------------------------------

export async function grantMemberSubscription(
  _prev: MembershipActionState,
  formData: FormData,
): Promise<MembershipActionState> {
  const parsed = grantSubscriptionSchema.safeParse({
    memberId: formData.get("memberId"),
    planId: formData.get("planId"),
    startsAt: formData.get("startsAt") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  // Fetch the plan to compute ends_at
  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("id, billing_interval, session_credits")
    .eq("id", parsed.data.planId)
    .maybeSingle();

  if (planError || !plan) {
    return { ok: false, message: "Plan not found." };
  }

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date();
  const endsAt = computeEndsAt(plan.billing_interval, startsAt);

  const { data: subscription, error: subError } = await supabase
    .from("member_subscriptions")
    .insert({
      member_id: parsed.data.memberId,
      plan_id: plan.id,
      status: "ACTIVE",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      remaining_credits: plan.session_credits ?? 0,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (subError) {
    logError("Failed to grant subscription", subError, {
      memberId: parsed.data.memberId,
      planId: plan.id,
    });
    return { ok: false, message: "Could not grant subscription." };
  }

  revalidateSubscriptions();
  return { ok: true, id: subscription.id, message: "Subscription granted." };
}
