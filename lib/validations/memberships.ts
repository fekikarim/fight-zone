import { z } from "zod";

// ---------------------------------------------------------------------------
// Membership Plans CRUD
// ---------------------------------------------------------------------------

export const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens."),
  description: z.string().trim().max(2000).optional(),
  tier: z.enum(["STUDENT", "ADULT", "KIDS", "FAMILY", "PRO_FIGHTER", "UNLIMITED"]),
  billing_interval: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"]),
  price: z.coerce.number().min(0, "Price must be non-negative."),
  currency: z.string().trim().min(1).max(10).default("TND"),
  session_credits: z.coerce.number().int().min(0).nullable().optional(),
  features: z.string().optional(),
  is_popular: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const updatePlanSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(2000).optional(),
  tier: z.enum(["STUDENT", "ADULT", "KIDS", "FAMILY", "PRO_FIGHTER", "UNLIMITED"]).optional(),
  billing_interval: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"]).optional(),
  price: z.coerce.number().min(0).optional(),
  currency: z.string().trim().max(10).optional(),
  session_credits: z.coerce.number().int().min(0).nullable().optional(),
  features: z.string().optional(),
  is_popular: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

export const subscribePlanSchema = z.object({
  planId: z.string().uuid(),
});

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Admin: grant subscription / record payment
// ---------------------------------------------------------------------------

export const grantSubscriptionSchema = z.object({
  memberId: z.string().uuid(),
  planId: z.string().uuid(),
  startsAt: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const recordPaymentSchema = z.object({
  memberId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than zero."),
  currency: z.string().trim().min(1).max(10).default("TND"),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).default("COMPLETED"),
  payment_method: z.enum(["CASH", "BANK_TRANSFER", "ONLINE", "CARD", "OTHER"]),
  transaction_reference: z.string().trim().max(200).optional(),
  paid_at: z.string().optional(),
});
