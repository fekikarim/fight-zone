import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Database row types (derived from generated types)
// ---------------------------------------------------------------------------

type PlanRow = Database["public"]["Tables"]["membership_plans"]["Row"];
type SubscriptionRow = Database["public"]["Tables"]["member_subscriptions"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export interface MembershipPlan extends PlanRow {
  features: string[];
}

export interface MemberSubscriptionWithPlan extends SubscriptionRow {
  membership_plans: MembershipPlan;
}

export interface PaymentRecord extends PaymentRow {
  membership_plans?: { name: string; tier: string } | null;
  member_subscriptions?: { id: string } | null;
  member_profiles?: {
    profiles: { full_name: string | null; email: string } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

export const billingIntervalLabel: Record<Database["public"]["Enums"]["billing_interval"], string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
  CUSTOM: "Custom",
};

export const planTierLabel: Record<Database["public"]["Enums"]["plan_tier"], string> = {
  STUDENT: "Student",
  ADULT: "Adult",
  KIDS: "Kids",
  FAMILY: "Family",
  PRO_FIGHTER: "Pro Fighter",
  UNLIMITED: "Unlimited",
};

export const subscriptionStatusLabel: Record<
  Database["public"]["Enums"]["subscription_status"],
  string
> = {
  ACTIVE: "Active",
  PAST_DUE: "Past Due",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  TRIAL: "Trial",
};

export const paymentStatusLabel: Record<Database["public"]["Enums"]["payment_status"], string> = {
  PENDING: "Pending",
  PAID: "Paid",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const paymentMethodLabel: Record<Database["public"]["Enums"]["payment_method"], string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  ONLINE: "Online",
  OTHER: "Other",
  CARD: "Card",
};

// ---------------------------------------------------------------------------
// Helper: compute ends_at from interval
// ---------------------------------------------------------------------------

export function computeEndsAt(
  interval: Database["public"]["Enums"]["billing_interval"],
  startsAt: Date = new Date(),
): Date {
  const ends = new Date(startsAt);
  switch (interval) {
    case "MONTHLY":
      ends.setMonth(ends.getMonth() + 1);
      break;
    case "QUARTERLY":
      ends.setMonth(ends.getMonth() + 3);
      break;
    case "ANNUAL":
      ends.setFullYear(ends.getFullYear() + 1);
      break;
    case "CUSTOM":
      ends.setMonth(ends.getMonth() + 1);
      break;
  }
  return ends;
}

// ---------------------------------------------------------------------------
// Helper: compute savings percentage vs monthly
// ---------------------------------------------------------------------------

export function computeSavings(monthlyPrice: number, price: number, interval: string): number | null {
  if (monthlyPrice <= 0) return null;
  const equivalent = monthlyPrice * (interval === "QUARTERLY" ? 3 : interval === "ANNUAL" ? 12 : 1);
  if (equivalent <= price) return null;
  return Math.round(((equivalent - price) / equivalent) * 100);
}

// ---------------------------------------------------------------------------
// Helper: days remaining until ends_at
// ---------------------------------------------------------------------------

export function daysUntilExpiry(endsAt: string | Date): number {
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
