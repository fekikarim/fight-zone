import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DatabaseError, NotFoundError, logError } from "@/lib/errors";

/**
 * Server-only data access for public/marketing content.
 * Presentation never touches Supabase directly; it consumes these typed
 * queries. Errors are normalized to safe AppErrors (see lib/errors.ts).
 */

function unwrap<T>(label: string, result: { data: T | null; error: unknown }): T {
  if (result.error) {
    logError(`Query failed: ${label}`, result.error);
    throw new DatabaseError(undefined, { cause: result.error });
  }
  if (result.data === null || result.data === undefined) {
    throw new DatabaseError(`Query returned no data: ${label}`, {
      cause: result.error,
    });
  }
  return result.data;
}

/** Public coach presentation (name, avatar, specialization, biography). */
export const getPublicCoach = cache(async () => {
  const supabase = await createClient();
  const result = await supabase.rpc("get_public_coach");
  const rows = unwrap("get_public_coach", result);
  return rows[0] ?? null;
});

export const getAchievements = cache(async (limit?: number) => {
  const supabase = await createClient();
  let query = supabase
    .from("achievements")
    .select("id, title, description, type, date, image_url")
    .order("date", { ascending: false });
  if (limit) query = query.limit(limit);
  return unwrap("achievements", await query);
});

export const getActiveSessions = cache(async () => {
  const supabase = await createClient();
  const result = await supabase
    .from("sessions")
    .select("id, title, description, type, duration_min, price, is_active")
    .eq("is_active", true)
    .order("price", { ascending: true });
  return unwrap("sessions", result);
});

export const getPublicEvents = cache(async (limit?: number) => {
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("id, title, description, start_at, end_at, location, event_type")
    .eq("is_public", true)
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true });
  if (limit) query = query.limit(limit);
  return unwrap("events", await query);
});

export const getPublishedNews = cache(async (limit?: number) => {
  const supabase = await createClient();
  let query = supabase
    .from("news")
    .select("id, title, slug, content, cover_image_url, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (limit) query = query.limit(limit);
  return unwrap("news", await query);
});

export const getNewsBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const result = await supabase
    .from("news")
    .select("id, title, slug, content, cover_image_url, published_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (result.error) {
    logError(`Query failed: news by slug`, result.error, { slug });
    throw new DatabaseError(undefined, { cause: result.error });
  }
  if (!result.data) throw new NotFoundError();
  return result.data;
});

export const getPublicMedia = cache(async (limit?: number) => {
  const supabase = await createClient();
  let query = supabase
    .from("media")
    .select("id, url, type, title, description")
    .eq("is_public", true)
    .order("uploaded_at", { ascending: false });
  if (limit) query = query.limit(limit);
  return unwrap("media", await query);
});

/** The authenticated member's own bookings (RLS-scoped), newest first. */
export const getCurrentUserBookings = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const result = await supabase
    .from("bookings")
    .select("id, scheduled_at, status, sessions(title)")
    .eq("member_id", user.id)
    .order("scheduled_at", { ascending: false });
  return unwrap("bookings (current user)", result);
});
