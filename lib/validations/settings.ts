import { z } from "zod";

const optional = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || null : null),
    z.string().max(max, `${label} must be at most ${max} characters.`).nullable(),
  );

export const paymentSettingsSchema = z.object({
  bank_instructions: optional(2000, "Bank instructions"),
  in_person_instructions: optional(1000, "In-person instructions"),
  proof_resubmission_allowed: z.boolean(),
});

const httpsUrl = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || null : null),
  z.string().url("Enter a full link starting with https://").refine((u) => u.startsWith("https://"), "Links must start with https://").nullable(),
);

export const SOCIAL_KEYS = ["instagram", "facebook", "tiktok", "youtube", "x"] as const;

export const siteSettingsSchema = z.object({
  contact_email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || null : null),
    z.string().email("Enter a valid email address.").max(254).nullable(),
  ),
  contact_phone: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || null : null),
    z.string().regex(/^\+?[0-9 ()-]{6,30}$/, "Use digits, spaces and + only.").nullable(),
  ),
  whatsapp: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/[^\d+]/g, "") || null : null),
    z.string().regex(/^\+?\d{6,20}$/, "Enter the WhatsApp number with country code, e.g. +216…").nullable(),
  ),
  address: optional(300, "Address"),
  working_hours: optional(500, "Working hours"),
  social: z.object(Object.fromEntries(SOCIAL_KEYS.map((k) => [k, httpsUrl])) as Record<(typeof SOCIAL_KEYS)[number], typeof httpsUrl>),
});

export const messageTemplateSchema = z.object({
  key: z.string().regex(/^[a-z_]{3,60}$/),
  body: z.string().trim().min(5, "The message is too short.").max(2000, "At most 2000 characters."),
  is_enabled: z.boolean(),
});
