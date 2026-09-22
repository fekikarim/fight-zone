import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/types/database.types";

/**
 * Server-only SUPABASE ADMIN client (service_role key).
 *
 * WHY THIS FILE EXISTS (Update V3 audit — see `docs/update-v3.md` §13):
 * The event-email automation runs in contexts with NO authenticated user
 * session:
 *   * Scheduled cron jobs (daily coach report + 30-minute reminders) run
 *     headless, outside any browser request or user session.
 *   * Cancellation emails must read the authoritative event + participant
 *     state and the coach's address regardless of which member performed
 *     the cancellation. Under RLS, a non-staff member can only see their
 *     own participation row and cannot read the coach's email, so the
 *     email-processing step needs RLS-bypassing admin access.
 *
 * This is the ONE place where the service_role key is used, and it is
 * used ONLY for trusted, server-side email-automation reads/writes:
 *   * reading events, participation, profiles for building emails;
 *   * INSERT/UPDATE on the `email_deliveries` idempotency log.
 * It is NEVER exposed to the browser, NEVER used to serve user-facing
 * data, and NEVER used to mutate business data on a user's behalf.
 * The key is never logged and never leaves the server.
 *
 * The service_role key MUST be set in the server environment
 * (SUPABASE_SERVICE_ROLE_KEY) and must NOT be prefixed NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. It is required for server-side email automation (cron + cancellation alerts).",
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
