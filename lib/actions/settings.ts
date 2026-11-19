"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { logError } from "@/lib/errors";
import { issuesToFieldErrors, type FieldErrors } from "@/lib/validations/form-errors";
import { SOCIAL_KEYS, messageTemplateSchema, paymentSettingsSchema, siteSettingsSchema } from "@/lib/validations/settings";

export interface SettingsActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
}

export async function updatePaymentSettings(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = paymentSettingsSchema.safeParse({
    bank_instructions: formData.get("bank_instructions"),
    in_person_instructions: formData.get("in_person_instructions"),
    proof_resubmission_allowed: formData.get("proof_resubmission_allowed") === "true",
  });
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", 1);
  if (error) {
    logError("Failed to update payment settings", error);
    return { ok: false, message: "We could not save the payment settings." };
  }
  revalidatePath("/member", "layout");
  revalidatePath("/admin/settings", "layout");
  return { ok: true, message: "Payment settings saved" };
}

export async function updateSiteSettings(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = siteSettingsSchema.safeParse({
    contact_email: formData.get("contact_email"),
    contact_phone: formData.get("contact_phone"),
    whatsapp: formData.get("whatsapp"),
    address: formData.get("address"),
    working_hours: formData.get("working_hours"),
    social: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, formData.get(`social_${k}`)])),
  });
  if (!parsed.success) {
    const errors = issuesToFieldErrors(parsed.error.issues.map((i) => ({ ...i, path: i.path[0] === "social" ? [`social_${String(i.path[1])}`] : i.path })));
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: errors };
  }
  const user = await requireRole(["ADMIN", "COACH"]);
  const { social, ...rest } = parsed.data;
  const social_links = Object.fromEntries(Object.entries(social).filter((e): e is [string, string] => !!e[1]));
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({ ...rest, social_links, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq("id", 1);
  if (error) {
    logError("Failed to update site settings", error);
    return { ok: false, message: "We could not save the contact settings." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Contact details saved" };
}

export async function updateMessageTemplate(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = messageTemplateSchema.safeParse({
    key: formData.get("key"),
    body: formData.get("body"),
    is_enabled: formData.get("is_enabled") === "true",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid template.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  const user = await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();
  const { data: current } = await supabase.from("message_templates").select("is_essential").eq("key", parsed.data.key).maybeSingle();
  if (!current) return { ok: false, message: "Template not found." };
  const { error } = await supabase
    .from("message_templates")
    .update({
      body: parsed.data.body,
      // Essential transactional messages can't be switched off.
      is_enabled: current.is_essential ? true : parsed.data.is_enabled,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("key", parsed.data.key);
  if (error) {
    logError("Failed to update message template", error);
    return { ok: false, message: "We could not save the template." };
  }
  revalidatePath("/admin/settings", "layout");
  return { ok: true, message: "Template saved" };
}
