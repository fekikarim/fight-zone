import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { isPrerenderBailout } from "@/lib/supabase/queries";

/** Public contact/social settings — only what Seif entered (never invented). */
export interface SiteSettings {
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp: string | null;
  address: string | null;
  working_hours: string | null;
  social_links: Record<string, string>;
  timezone: string;
}

const EMPTY_SITE: SiteSettings = {
  contact_email: null,
  contact_phone: null,
  whatsapp: null,
  address: null,
  working_hours: null,
  social_links: {},
  timezone: "Africa/Tunis",
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("contact_email, contact_phone, whatsapp, address, working_hours, social_links, timezone")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) {
      if (error) logError("Query failed: site settings", error);
      return EMPTY_SITE;
    }
    const links =
      data.social_links && typeof data.social_links === "object" && !Array.isArray(data.social_links)
        ? Object.fromEntries(
            Object.entries(data.social_links as Record<string, unknown>).filter(
              (e): e is [string, string] => typeof e[1] === "string" && /^https:\/\//.test(e[1]),
            ),
          )
        : {};
    return { ...data, social_links: links };
  } catch (error) {
    // Let Next mark the route dynamic instead of prerendering empty settings.
    if (isPrerenderBailout(error)) throw error;
    logError("Query failed: site settings", error);
    return EMPTY_SITE;
  }
});

export interface PaymentSettings {
  bank_instructions: string | null;
  in_person_instructions: string | null;
  proof_resubmission_allowed: boolean;
}

/** Members only (RLS: authenticated). */
export const getPaymentSettings = cache(async (): Promise<PaymentSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_settings")
    .select("bank_instructions, in_person_instructions, proof_resubmission_allowed")
    .eq("id", 1)
    .maybeSingle();
  if (error) logError("Query failed: payment settings", error);
  return {
    bank_instructions: data?.bank_instructions ?? null,
    in_person_instructions: data?.in_person_instructions ?? null,
    proof_resubmission_allowed: data?.proof_resubmission_allowed ?? true,
  };
});
