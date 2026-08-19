import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/guards";
import {
  AuthenticationError,
  DatabaseError,
  NotFoundError,
  ValidationError,
  logError,
} from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  ConversationMessage,
  ConversationSummary,
  MessagingRecipient,
} from "@/lib/types/messaging";
import type { NotificationPage, NotificationRow } from "@/lib/types/notifications";
import type { EventDetail, EventParticipant, EventSummary, ScheduleItem } from "@/lib/types/events";

/**
 * Server-only data access for public/marketing content.
 * Presentation never touches Supabase directly; it consumes these typed
 * queries. Errors are normalized to safe AppErrors (see lib/errors.ts).
 */

/**
 * Marketing/display queries resolve to a fallback value instead of throwing,
 * so a transient database hiccup degrades a section to its empty state rather
 * than crashing the whole page. Failures are still logged for observability.
 */
export async function resolveOrFallback<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    logError("Marketing section fell back after query failure", error);
    return fallback;
  }
}

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

export const getPublicEvents = cache(async (filters: { type?: string; limit?: number } = {}) => {
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select("id, title, description, start_at, end_at, location, event_type")
    .eq("is_public", true)
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true });
  if (filters.type) query = query.eq("event_type", filters.type as Database["public"]["Enums"]["event_type"]);
  if (filters.limit) query = query.limit(filters.limit);
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
export const getCurrentUserBookings = cache(async (limit?: number) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("bookings")
    .select(
      "id, scheduled_at, status, notes, created_at, sessions(title, duration_min, price, type), coach_profiles(id, profiles(full_name))",
    )
    .eq("member_id", user.id)
    .order("scheduled_at", { ascending: false });
  if (limit) query = query.limit(limit);
  return unwrap("bookings (current user)", await query);
});

/** One of the member's own bookings (RLS-scoped), or 404. */
export const getBookingById = cache(async (id: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AuthenticationError();

  const result = await supabase
    .from("bookings")
    .select(
      "id, scheduled_at, status, notes, created_at, updated_at, sessions(id, title, description, duration_min, price, type), coach_profiles(id, specialization, experience_years, profiles(full_name))",
    )
    .eq("id", id)
    .eq("member_id", user.id)
    .maybeSingle();

  if (result.error) {
    logError("Query failed: booking by id", result.error, { id });
    throw new DatabaseError(undefined, { cause: result.error });
  }
  if (!result.data) throw new NotFoundError();
  return result.data;
});

/** A single active session with its public coach info, or 404. */
export const getSessionById = cache(async (id: string) => {
  const supabase = await createClient();
  const result = await supabase
    .from("sessions")
    .select(
      "id, title, description, type, duration_min, price, is_active, coach_profiles(id, experience_years, specialization, biography, is_available, profiles(full_name, avatar_url))",
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (result.error) {
    logError("Query failed: session by id", result.error, { id });
    throw new DatabaseError(undefined, { cause: result.error });
  }
  if (!result.data) throw new NotFoundError();
  return result.data;
});

/** The member's own profile record plus their member_profiles extension. */
export const getMemberProfileData = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AuthenticationError();

  const [profileResult, memberResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, phone, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("member_profiles")
      .select("id, date_of_birth, gender, address, skill_level, weight, height, bio, is_verified")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error || memberResult.error) {
    logError(
      "Query failed: member profile data",
      profileResult.error ?? memberResult.error,
    );
    throw new DatabaseError(undefined, {
      cause: profileResult.error ?? memberResult.error,
    });
  }
  if (!profileResult.data) throw new NotFoundError();

  return {
    profile: profileResult.data,
    member: memberResult.data ?? null,
  };
});

/** Counts of the member's bookings: pending, upcoming confirmed, total. */
export const getMemberBookingStats = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { pending: 0, upcoming: 0, total: 0 };

  const now = new Date().toISOString();
  const base = supabase.from("bookings").select("*", { count: "exact", head: true });
  const [pendingResult, upcomingResult, totalResult] = await Promise.all([
    base.eq("member_id", user.id).eq("status", "PENDING"),
    base.eq("member_id", user.id).eq("status", "CONFIRMED").gte("scheduled_at", now),
    base.eq("member_id", user.id),
  ]);

  if (pendingResult.error || upcomingResult.error || totalResult.error) {
    logError(
      "Query failed: booking stats",
      pendingResult.error ?? upcomingResult.error ?? totalResult.error,
    );
    throw new DatabaseError(undefined, {
      cause: pendingResult.error ?? upcomingResult.error ?? totalResult.error,
    });
  }

  return {
    pending: pendingResult.count ?? 0,
    upcoming: upcomingResult.count ?? 0,
    total: totalResult.count ?? 0,
  };
});

/**
 * Whether a booking can currently be cancelled for display purposes: only
 * active (PENDING/CONFIRMED) bookings scheduled in the future. This is a
 * UI hint only — the cancelBooking action re-checks authoritatively.
 */
export function isBookingCancellable(
  status: Database["public"]["Enums"]["booking_status"],
  scheduledAt: string,
): boolean {
  return (
    (status === "PENDING" || status === "CONFIRMED") &&
    new Date(scheduledAt).getTime() > Date.now()
  );
}

// ---------------------------------------------------------------------------
// Coach/Admin booking management
// ---------------------------------------------------------------------------

export type BookingAction = "confirm" | "cancel" | "complete" | "no_show";

export interface AdminBookingFilters {
  page?: number;
  pageSize?: number;
  status?: Database["public"]["Enums"]["booking_status"];
  /** ISO start (inclusive). */
  from?: string;
  /** ISO end (inclusive). */
  to?: string;
  /** Free-text search on member full name or email. */
  query?: string;
}

export interface AdminBookingListRow {
  id: string;
  scheduled_at: string;
  status: Database["public"]["Enums"]["booking_status"];
  created_at: string;
  notes: string | null;
  member_profiles: {
    profiles: { full_name: string | null } | null;
  } | null;
  sessions: { title: string; duration_min: number; price: number; type: string } | null;
  coach_profiles: { id: string; profiles: { full_name: string | null } | null } | null;
}

export interface AdminBookingList {
  rows: AdminBookingListRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * The acting user must be staff (COACH/ADMIN). Resolves whether they manage
 * only their own bookings (COACH) or everything (ADMIN); returns null for
 * non-staff so callers can throw the right error.
 */
async function resolveStaffScope(): Promise<{ userId: string; isAdmin: boolean } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const isAdmin = user.roles.includes("ADMIN");
  const isCoach = user.roles.includes("COACH");
  if (!isAdmin && !isCoach) return null;
  return { userId: user.id, isAdmin };
}

/** Booking list for coach/admin with server-side filtering + pagination. */
export const getAdminBookings = cache(async (filters: AdminBookingFilters = {}) => {
  const staff = await resolveStaffScope();
  if (!staff) throw new AuthenticationError();
  const supabase = await createClient();

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(Math.max(1, filters.pageSize ?? 20), 100);
  const start = (page - 1) * pageSize;

  // Resolve free-text search to a bounded set of member ids first — a clean
  // way to search on a joined relation without exotic embedded filters.
  let memberIds: string[] | null = null;
  if (filters.query?.trim()) {
    const needle = `%${filters.query.trim()}%`;
    const [byName, byEmail] = await Promise.all([
      supabase.from("profiles").select("id").ilike("full_name", needle).limit(200),
      supabase.from("profiles").select("id").ilike("email", needle).limit(200),
    ]);
    if (byName.error) {
      logError("Query failed: booking search by name", byName.error);
      throw new DatabaseError(undefined, { cause: byName.error });
    }
    if (byEmail.error) {
      logError("Query failed: booking search by email", byEmail.error);
      throw new DatabaseError(undefined, { cause: byEmail.error });
    }
    memberIds = [...new Set([...byName.data, ...byEmail.data].map((m) => m.id))];
    if (memberIds.length === 0) {
      return { rows: [], total: 0, page, pageSize };
    }
  }

  let query = supabase
    .from("bookings")
    .select(
      "id, scheduled_at, status, created_at, notes, member_profiles(profiles(full_name)), sessions(title, duration_min, price, type), coach_profiles(id, profiles(full_name))",
      { count: "exact" },
    )
    .order("scheduled_at", { ascending: false })
    .range(start, start + pageSize - 1);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("scheduled_at", filters.from);
  if (filters.to) query = query.lte("scheduled_at", filters.to);
  if (memberIds) query = query.in("member_id", memberIds);
  if (!staff.isAdmin) query = query.eq("coach_id", staff.userId);

  const result = await query;
  const rows = unwrap("bookings (staff)", result);
  return { rows, total: result.count ?? 0, page, pageSize };
});

/**
 * Full booking detail for coach/admin: booking, member profile, session and
 * coach. RLS scopes the read to the acting role; 404 when not accessible.
 */
export const getAdminBookingById = cache(async (id: string) => {
  const staff = await resolveStaffScope();
  if (!staff) throw new AuthenticationError();
  const supabase = await createClient();

  let query = supabase
    .from("bookings")
    .select(
      "id, scheduled_at, status, notes, created_at, updated_at, member_profiles(id, gender, skill_level, profiles(id, full_name, email, phone, avatar_url)), sessions(id, title, description, type, duration_min, price, is_active), coach_profiles(id, specialization, experience_years, profiles(full_name, email))",
    )
    .eq("id", id);

  if (!staff.isAdmin) query = query.eq("coach_id", staff.userId);

  const result = await query.maybeSingle();
  if (result.error) {
    logError("Query failed: booking detail (staff)", result.error, { id });
    throw new DatabaseError(undefined, { cause: result.error });
  }
  if (!result.data) throw new NotFoundError();
  return result.data;
});

export interface BookingManagementStats {
  pending: number;
  confirmedUpcoming: number;
  today: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

/**
 * Dashboard metrics via cheap, indexed head-count queries. Scoped to the
 * coach's own bookings unless the user is an admin.
 */
export const getBookingManagementStats = cache(async (): Promise<BookingManagementStats> => {
  const staff = await resolveStaffScope();
  if (!staff) throw new AuthenticationError();
  const supabase = await createClient();

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const base = supabase.from("bookings").select("*", { count: "exact", head: true });
  const scope = (query: ReturnType<typeof base.eq>) =>
    staff.isAdmin ? query : query.eq("coach_id", staff.userId);

  const [pending, upcoming, today, completed, cancelled, noShow] = await Promise.all([
    scope(base.eq("status", "PENDING")),
    scope(base.eq("status", "CONFIRMED").gte("scheduled_at", now.toISOString())),
    scope(
      base
        .gte("scheduled_at", dayStart.toISOString())
        .lt("scheduled_at", dayEnd.toISOString()),
    ),
    scope(base.eq("status", "COMPLETED")),
    scope(base.eq("status", "CANCELLED")),
    scope(base.eq("status", "NO_SHOW")),
  ]);

  const failed = [pending, upcoming, today, completed, cancelled, noShow].find(
    (r) => r.error,
  );
  if (failed) {
    logError("Query failed: booking management stats", failed.error);
    throw new DatabaseError(undefined, { cause: failed.error });
  }

  return {
    pending: pending.count ?? 0,
    confirmedUpcoming: upcoming.count ?? 0,
    today: today.count ?? 0,
    completed: completed.count ?? 0,
    cancelled: cancelled.count ?? 0,
    noShow: noShow.count ?? 0,
  };
});

/**
 * Whether a staff action is available for a booking, for display only. The
 * authoritative checks live in the server action and the DB trigger.
 */
export function canTransitionBooking(
  status: Database["public"]["Enums"]["booking_status"],
  action: BookingAction,
  scheduledAt: string,
): boolean {
  switch (action) {
    case "confirm":
      return status === "PENDING";
    case "cancel":
      return status === "PENDING" || status === "CONFIRMED";
    case "complete":
    case "no_show":
      return status === "CONFIRMED" && new Date(scheduledAt).getTime() <= Date.now();
  }
}

/** The current user's own notifications (used by member + admin dashboards). */
export const getCurrentUserNotifications = cache(async (limit = 5) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const result = await supabase
    .from("notifications")
    .select("id, type, title, content, is_read, created_at, resource_type, resource_id")
    .eq("user_id", user.id)
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  return unwrap("notifications (current user)", result);
});

/** The member's own notifications (read-only surface), unread first. */
export const getMemberNotifications = getCurrentUserNotifications;

// ---------------------------------------------------------------------------
// Messaging (member + coach/admin inboxes)
// ---------------------------------------------------------------------------

/**
 * The current user's conversations (participant-only), newest activity first,
 * with the other participant and per-conversation unread counts. The RPC is
 * SECURITY DEFINER but re-checks participant membership; it raises 42501 for
 * anonymous callers, so an empty result is the authenticated user's real list.
 */
export const getMyConversations = cache(async (): Promise<ConversationSummary[]> => {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  const supabase = await createClient();
  const result = await supabase.rpc("get_my_conversations");
  if (result.error) {
    // Pre-push / migration not yet applied: the function may not exist on
    // remote.  The inbox page renders an EmptyState for zero rows, which is
    // the correct fallback.  A real auth failure (42501) is still thrown.
    if (result.error.code !== "42501") return [];
    throw new DatabaseError(undefined, { cause: result.error });
  }
  return result.data ?? [];
});

/**
 * Total unread messages across the user's conversations, for the nav badge.
 * Decorative: failures degrade to 0 rather than breaking the dashboard shell.
 */
export const getUnreadMessageCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  if (!user) return 0;
  const supabase = await createClient();
  const result = await supabase.rpc("get_unread_message_count");
  if (result.error) return 0;
  return result.data ?? 0;
});

/**
 * A page of a conversation's history, newest first. The first page is loaded
 * server-side here; older pages are fetched by the client through the
 * `loadOlderMessages` server action (same RPC). A foreign or nonexistent
 * conversation surfaces as a 404; an invalid cursor yields an empty page.
 */
export const getConversationMessages = cache(
  async (conversationId: string, beforeId?: string, limit = 50): Promise<ConversationMessage[]> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();
    const supabase = await createClient();
    const result = await supabase.rpc("get_conversation_messages", {
      p_conversation_id: conversationId,
      p_before_id: beforeId ?? undefined,
      p_limit: limit,
    });
    if (result.error) {
      logError("Query failed: conversation messages", result.error, { conversationId });
      if (result.error.code === "42501") throw new NotFoundError();
      throw new DatabaseError(undefined, { cause: result.error });
    }
    return result.data ?? [];
  },
);

/**
 * People the current user is authorized to start a conversation with — the
 * coaches a member has booked with, or the members who have booked a coach.
 * Mirrors the bookings relationship the RLS INSERT policy requires, so the
 * recipient picker can never offer an invalid target.
 */
export const getAuthorizedMessagingRecipients = cache(async (): Promise<MessagingRecipient[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();

  const isMember = user.roles.includes("MEMBER");

  let result: { data: RecipientRow[] | null; error: unknown };
  if (isMember) {
    result = await supabase
      .from("bookings")
      .select("coach_profiles(id, profiles(id, full_name, avatar_url))")
      .eq("member_id", user.id);
  } else {
    result = await supabase
      .from("bookings")
      .select("member_profiles(id, profiles(id, full_name, avatar_url))")
      .eq("coach_id", user.id);
  }

  if (result.error) {
    logError("Query failed: messaging recipients", result.error);
    throw new DatabaseError(undefined, { cause: result.error });
  }

  const recipients = new Map<string, MessagingRecipient>();
  for (const row of result.data ?? []) {
    const profile = row.coach_profiles?.profiles ?? row.member_profiles?.profiles;
    if (!profile?.id) continue;
    recipients.set(profile.id, {
      id: profile.id,
      full_name: profile.full_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      role: isMember ? "coach" : "member",
    });
  }
  return [...recipients.values()];
});

interface RecipientRow {
  coach_profiles?: {
    profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
  } | null;
  member_profiles?: {
    profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Notification Center
// ---------------------------------------------------------------------------

/**
 * Total unread notifications for the current user, for nav badge + dashboard
 * stat.  Decorative: returns 0 on failure so the dashboard shell never breaks.
 */
export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const user = await getCurrentUser();
  if (!user) return 0;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
});

/**
 * Parses a base-64-encoded keyset cursor into (created_at, id).
 * Format:  base64url(`${createdAt}|${id}`)
 */
function decodeCursor(cursor: string): [string, string] {
  const raw = Buffer.from(cursor, "base64url").toString("utf-8");
  const sep = raw.indexOf("|");
  if (sep < 1) throw new ValidationError("Invalid cursor.");
  const createdAt = raw.slice(0, sep);
  const id = raw.slice(sep + 1);
  if (!createdAt || !id) throw new ValidationError("Invalid cursor.");
  return [createdAt, id];
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString("base64url");
}

/**
 * Paginated notification center query.  Keyset pagination on
 * `(created_at DESC, id DESC)` — the index the migration creates.
 *
 * Fetches `pageSize + 1` rows; if the extra row exists, `hasMore` is true
 * and the last row is trimmed.  The cursor is derived from the last
 * returned item's `(created_at, id)`.
 *
 * @param filters.type      — filter by notification_type enum
 * @param filters.unreadOnly — if true, only unread notifications
 * @param filters.cursor    — base64url-encoded keyset cursor from prior page
 */
export const getNotificationCenter = cache(
  async (
    filters: { type?: string; unreadOnly?: boolean; cursor?: string } = {},
  ): Promise<NotificationPage> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const supabase = await createClient();
    const PAGE_SIZE = 20;

    let query = supabase
      .from("notifications")
      .select(
        "id, type, title, content, is_read, created_at, resource_type, resource_id",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (filters.type) query = query.eq("type", filters.type as Database["public"]["Enums"]["notification_type"]);
    if (filters.unreadOnly) query = query.eq("is_read", false);

    if (filters.cursor) {
      const [cursorCreatedAt, cursorId] = decodeCursor(filters.cursor);
      query = query.or(
        `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`,
      );
    }

    const { data, error } = await query;
    if (error) {
      logError("Query failed: notification center", error, { filters });
      throw new DatabaseError(undefined, { cause: error });
    }

    const rows = (data ?? []) as NotificationRow[];
    const hasMore = rows.length > PAGE_SIZE;
    const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.created_at, lastItem.id) : null;

    return { items, nextCursor, hasMore };
  },
);

// ---------------------------------------------------------------------------
// Events & Schedule (public + member + admin)
// ---------------------------------------------------------------------------

/**
 * Public event detail with participant count.  The count is derived via a
 * lateral join — no separate query needed.  Returns null for non-public
 * or nonexistent events (used by the public detail page).
 */
export const getPublicEventById = cache(
  async (eventId: string): Promise<EventDetail | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select(
        `id, title, description, start_at, end_at, location, event_type,
         is_public, created_at, created_by,
         event_participants!inner ( id )`,
      )
      .eq("id", eventId)
      .eq("is_public", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logError("Query failed: public event detail", error, { eventId });
      throw new DatabaseError(undefined, { cause: error });
    }

    const rows = data.event_participants ?? [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discard event_participants from rest spread
    const { event_participants: _, ...event } = data;
    return { ...event, participant_count: rows.length } as EventDetail;
  },
);

/**
 * Event detail for staff (includes non-public events).  Returns null if
 * the event does not exist.
 */
export const getStaffEventById = cache(
  async (eventId: string): Promise<EventDetail | null> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select(
        `id, title, description, start_at, end_at, location, event_type,
         is_public, created_at, created_by,
         event_participants!inner ( id )`,
      )
      .eq("id", eventId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logError("Query failed: staff event detail", error, { eventId });
      throw new DatabaseError(undefined, { cause: error });
    }

    const rows = data.event_participants ?? [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discard event_participants from rest spread
    const { event_participants: _, ...event } = data;
    return { ...event, participant_count: rows.length } as EventDetail;
  },
);

/**
 * Member's registration for a specific event.  Returns null if not registered.
 */
export const getMemberEventRegistration = cache(
  async (
    eventId: string,
  ): Promise<{ id: string; status: string; joined_at: string } | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_participants")
      .select("id, status, joined_at")
      .eq("event_id", eventId)
      .eq("member_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      logError("Query failed: member event registration", error, { eventId });
      return null;
    }
    return data;
  },
);

/**
 * All events a member is registered for (upcoming first).  Used by the
 * member events page and the combined schedule.
 */
export const getMemberRegisteredEvents = cache(
  async (): Promise<
    Array<{
      event_id: string;
      status: string;
      joined_at: string;
      events: EventSummary;
    }>
  > => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_participants")
      .select(
        `event_id, status, joined_at,
         events ( id, title, description, start_at, end_at, location, event_type, is_public, created_at )`,
      )
      .eq("member_id", user.id)
      .order("joined_at", { ascending: false });

    if (error) {
      logError("Query failed: member registered events", error);
      throw new DatabaseError(undefined, { cause: error });
    }
    return (data ?? []) as Array<{
      event_id: string;
      status: string;
      joined_at: string;
      events: EventSummary;
    }>;
  },
);

/**
 * Members registered for a specific event (admin/coach view).
 * Paginated with keyset on joined_at DESC, id DESC.
 */
export const getEventParticipants = cache(
  async (
    eventId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: EventParticipant[]; nextCursor: string | null; hasMore: boolean }> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const supabase = await createClient();
    let query = supabase
      .from("event_participants")
      .select(
        `id, event_id, member_id, status, joined_at,
         member_profiles ( profiles ( full_name, avatar_url ) )`,
      )
      .eq("event_id", eventId)
      .order("joined_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      const [cursorJoinedAt, cursorId] = decodeCursor(cursor);
      query = query.or(
        `joined_at.lt.${cursorJoinedAt},and(joined_at.eq.${cursorJoinedAt},id.lt.${cursorId})`,
      );
    }

    const { data, error } = await query;
    if (error) {
      logError("Query failed: event participants", error, { eventId });
      throw new DatabaseError(undefined, { cause: error });
    }

    const rows = ((data ?? []) as Array<{
      id: string;
      event_id: string;
      member_id: string;
      status: string;
      joined_at: string;
      member_profiles: { profiles: { full_name: string | null; avatar_url: string | null } | null } | null;
    }>).map((r) => ({
      id: r.id,
      event_id: r.event_id,
      member_id: r.member_id,
      status: r.status as EventParticipant["status"],
      joined_at: r.joined_at,
      member_name: r.member_profiles?.profiles?.full_name ?? null,
      member_avatar: r.member_profiles?.profiles?.avatar_url ?? null,
    }));

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.joined_at, lastItem.id) : null;

    return { items, nextCursor, hasMore };
  },
);

/**
 * Admin event list with participant counts.  Includes both public and
 * private events.  Ordered by start_at DESC (upcoming first).
 */
export const getAdminEvents = cache(
  async (): Promise<
    Array<EventSummary & { participant_count: number }>
  > => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select(
        `id, title, description, start_at, end_at, location, event_type,
         is_public, created_at,
         event_participants!inner ( id )`,
      )
      .order("start_at", { ascending: false });

    if (error) {
      logError("Query failed: admin events", error);
      throw new DatabaseError(undefined, { cause: error });
    }

    return (data ?? []).map((row) => {
      const count = row.event_participants?.length ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discard event_participants from rest spread
      const { event_participants: _, ...event } = row;
      return { ...event, participant_count: count } as EventSummary & { participant_count: number };
    });
  },
);

/**
 * Combined member schedule: upcoming confirmed bookings + registered events,
 * ordered chronologically.  Bounded to 50 items total.
 */
export const getMemberSchedule = cache(
  async (): Promise<ScheduleItem[]> => {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError();

    const supabase = await createClient();

    const [bookingsResult, eventsResult] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          `id, scheduled_at, status,
           sessions ( title ),
           coach_profiles ( profiles ( full_name ) )`,
        )
        .eq("member_id", user.id)
        .in("status", ["PENDING", "CONFIRMED"])
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(25),
      supabase
        .from("event_participants")
        .select(
          `event_id, status,
           events ( id, title, start_at, end_at, location )`,
        )
        .eq("member_id", user.id)
        .in("status", ["JOINED", "INTERESTED"])
        .order("joined_at", { ascending: false })
        .limit(25),
    ]);

    if (bookingsResult.error) {
      logError("Query failed: member schedule (bookings)", bookingsResult.error);
      throw new DatabaseError(undefined, { cause: bookingsResult.error });
    }
    if (eventsResult.error) {
      logError("Query failed: member schedule (events)", eventsResult.error);
      throw new DatabaseError(undefined, { cause: eventsResult.error });
    }

    const bookingItems: ScheduleItem[] = (bookingsResult.data ?? []).map((b) => ({
      kind: "booking" as const,
      id: b.id,
      title: b.sessions?.title ?? "Session",
      start_at: b.scheduled_at,
      end_at: null,
      location: null,
      status: b.status,
    }));

    const eventItems: ScheduleItem[] = (eventsResult.data ?? [])
      .filter((e) => e.events)
      .map((e) => ({
        kind: "event" as const,
        id: e.event_id,
        title: e.events!.title,
        start_at: e.events!.start_at,
        end_at: e.events!.end_at,
        location: e.events!.location,
        status: e.status,
      }));

    const all = [...bookingItems, ...eventItems].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );

    return all.slice(0, 50);
  },
);

