import { z } from "zod";

const num = (msg: string) => z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number({ error: msg }));
const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().optional());

export const BADGE_TIERS = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "LEGEND"] as const;
export const BADGE_ICONS = ["medal", "trophy", "flame", "star", "shield", "crown", "glove", "bolt"] as const;
export const BADGE_ACCENTS = ["rose", "amber", "emerald", "sky", "violet", "zinc"] as const;

export const badgeSchema = z
  .object({
    id: z.guid().optional(),
    name: z.string().trim().min(2, "Name is required.").max(60),
    description: z.preprocess((v) => (typeof v === "string" ? v.trim() || null : null), z.string().max(300).nullable()),
    threshold: num("Enter the number of events.").pipe(z.number().int("Whole events only.").min(1, "At least 1.").max(10000)),
    tier: z.enum(BADGE_TIERS),
    icon: z.enum(BADGE_ICONS),
    accent: z.enum(BADGE_ACCENTS),
    is_active: z.boolean(),
    reward_type: z.preprocess((v) => (v === "" || v == null || v === "NONE" ? null : v), z.enum(["FREE_ENTRY", "DISCOUNT_TND"]).nullable()),
    reward_value_tnd: optNum,
    reward_expiry_days: optNum,
    reward_total_cap: optNum,
    reward_requires_approval: z.boolean(),
    reward_terms: z.preprocess((v) => (typeof v === "string" ? v.trim() || null : null), z.string().max(500).nullable()),
  })
  .superRefine((d, ctx) => {
    if (d.reward_type && !(d.reward_value_tnd && d.reward_value_tnd > 0)) {
      ctx.addIssue({ code: "custom", path: ["reward_value_tnd"], message: d.reward_type === "FREE_ENTRY" ? "Set the maximum event price this covers." : "Enter the discount amount." });
    }
    if (d.reward_value_tnd != null && d.reward_value_tnd > 10000) ctx.addIssue({ code: "custom", path: ["reward_value_tnd"], message: "That value looks too large." });
    if (d.reward_expiry_days != null && !(Number.isInteger(d.reward_expiry_days) && d.reward_expiry_days >= 1 && d.reward_expiry_days <= 730)) {
      ctx.addIssue({ code: "custom", path: ["reward_expiry_days"], message: "Between 1 and 730 days." });
    }
    if (d.reward_total_cap != null && !(Number.isInteger(d.reward_total_cap) && d.reward_total_cap >= 1)) {
      ctx.addIssue({ code: "custom", path: ["reward_total_cap"], message: "A whole number of rewards, at least 1." });
    }
  });
