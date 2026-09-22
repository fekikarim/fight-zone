"use server";

import { assertAuthenticated } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyMotivation } from "@/lib/ai";
import { businessDateKey } from "@/lib/timezone";
import { logError, logDegradation } from "@/lib/errors";
import type { Database } from "@/types/database.types";

export interface MotivationActionState {
  ok: boolean;
  quote?: string;
  focus?: string | null;
  category?: string;
  source?: string;
}

type DailyMotivationRow = Database["public"]["Tables"]["daily_motivations"]["Row"];
type MotivationStateSource = Pick<DailyMotivationRow, "quote" | "focus" | "category" | "source">;

/**
 * Returns today's motivation for the authenticated member, creating it on
 * the first access of the business day (atomics get-or-create).
 *
 * Concurrency: the server never does a naï ve SELECT→check→INSERT that can
 * race. On the common path (quote already exists for today) we return the
 * existing row with no generation. On the first-touch path we generate the
 * quote (AI with fallback) and persist via the SECURITY DEFINER
 * `upsert_daily_motivation` function, whose `ON CONFLICT ... DO UPDATE ...
 * WHERE quote IS NULL` guarantees that concurrent writers converge on ONE
 * persisted quote — Tab A generates, Tab B receives the same row.
 *
 * The member always receives a usable quote: if persistence fails we still
 * return the generated content (degradation), and the DB uniqueness keeps
 * a stable row on the next load.
 */
export async function getTodayMotivation(): Promise<MotivationActionState> {
  const user = await assertAuthenticated();
  const motivationDate = businessDateKey();

  try {
    const supabase = await createClient();
    const existing = await fetchTodayRow(supabase, user.id, motivationDate);
    if (existing) return toState(existing);

    const { data: memberData } = await supabase
      .from("member_profiles")
      .select("ai_motivation_enabled")
      .eq("id", user.id)
      .maybeSingle();
      
    const aiMotivationEnabled = memberData?.ai_motivation_enabled ?? true;

    const content = await getDailyMotivation(user.id, new Date(), aiMotivationEnabled);

    // Persistence is best-effort and must NEVER sink the read path. Even if
    // the admin client is misconfigured (missing service-role key) or the
    // RPC fails, the member still receives today's generated quote; the DB
    // remains the source of truth on the next load.
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("upsert_daily_motivation", {
        p_user_id: user.id,
        p_motivation_date: motivationDate,
        p_quote: content.quote,
        p_focus: content.focus ?? null,
        p_category: content.category,
        p_source: content.source,
      });

      if (error || !data) {
        logDegradation("Could not persist daily motivation; returning generated quote", error, {
          domain: "motivation",
          op: "getTodayMotivation",
          userId: user.id,
        });
        return {
          ok: true,
          quote: content.quote,
          focus: content.focus ?? null,
          category: content.category,
          source: content.source,
        };
      }

      return toState(data);
    } catch (error) {
      logDegradation("Could not persist daily motivation; returning generated quote", error, {
        domain: "motivation",
        op: "getTodayMotivation",
        userId: user.id,
      });
      return {
        ok: true,
        quote: content.quote,
        focus: content.focus ?? null,
        category: content.category,
        source: content.source,
      };
    }
  } catch (error) {
    logError("Failed to retrieve daily motivation", error, {
      domain: "motivation",
      op: "getTodayMotivation",
      userId: user.id,
    });
    return { ok: false };
  }
}

/** Fetch today's row (own-scoped by RLS). Returns null when it does not exist. */
async function fetchTodayRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  motivationDate: string,
): Promise<MotivationStateSource | null> {
  const { data, error } = await supabase
    .from("daily_motivations")
    .select("quote, focus, category, source")
    .eq("user_id", userId)
    .eq("motivation_date", motivationDate)
    .maybeSingle();

  if (error) {
    logError("Failed to query today's motivation", error, {
      domain: "motivation",
      op: "fetchTodayRow",
      userId,
    });
    return null;
  }
  return data;
}

function toState(row: MotivationStateSource): MotivationActionState {
  return {
    ok: true,
    quote: row.quote,
    focus: row.focus,
    category: row.category,
    source: row.source,
  };
}
