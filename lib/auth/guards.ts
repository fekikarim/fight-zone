import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthenticationError, ForbiddenError, logError } from "@/lib/errors";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  roles: string[];
  /** Authoritative Supabase email-confirmation timestamp (null when unverified). */
  emailConfirmedAt: string | null;
}

export interface CurrentUserContext {
  user: CurrentUser | null;
  memberProfile: MemberProfile | null;
  coachProfile: CoachProfile | null;
}

interface MemberProfile {
  id: string;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  skill_level: string | null;
  weight: number | null;
  height: number | null;
  bio: string | null;
  is_verified: boolean;
}

interface CoachProfile {
  id: string;
  experience_years: number | null;
  specialization: string | null;
  biography: string | null;
  is_available: boolean;
}

/**
 * Returns the authenticated user with their application profile and
 * database-backed roles, or null when there is no session.
 * Authorization is always derived from DB roles — never from client input.
 * Memoized per request so layouts/pages/actions share one resolution.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const [profileResult, rolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, is_active")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_role_assignments")
      .select("roles(name)")
      .eq("user_id", user.id),
  ]);

  if (profileResult.error || rolesResult.error) {
    logError("Failed to load profile/roles for authenticated user", undefined, {
      userId: user.id,
    });
  }

  const profile = profileResult.data;
  const roles =
    rolesResult.data
      ?.map((a) => a.roles?.name)
      .filter((name): name is NonNullable<typeof name> => Boolean(name)) ?? [];

  if (profile && !profile.is_active) return null;

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? "",
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    roles,
    emailConfirmedAt: user.email_confirmed_at ?? null,
  };
});

/**
 * Resolves the current user plus their role-specific profiles in a single
 * request. Both profile lookups are RLS-scoped (own or staff). Use this in
 * pages/actions that need member or coach data; use `getCurrentUser` when
 * only identity/roles are required (cheaper).
 */
export const getCurrentUserContext = cache(async (): Promise<CurrentUserContext> => {
  const user = await getCurrentUser();
  if (!user) return { user: null, memberProfile: null, coachProfile: null };

  const supabase = await createClient();
  const [memberResult, coachResult] = await Promise.all([
    supabase
      .from("member_profiles")
      .select(
        "id, date_of_birth, gender, address, skill_level, weight, height, bio, is_verified",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("coach_profiles")
      .select("id, experience_years, specialization, biography, is_available")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (memberResult.error || coachResult.error) {
    logError("Failed to load member/coach profiles", undefined, {
      userId: user.id,
    });
  }

  return {
    user,
    memberProfile: memberResult.data ?? null,
    coachProfile: coachResult.data ?? null,
  };
});

/**
 * Redirects unauthenticated visitors to the sign-in page.
 * An authenticated-but-unverified user is treated as a restricted session and
 * redirected to the email-verification gate — never given application access.
 * Verification state is authoritative Supabase Auth data (`email_confirmed_at`),
 * never a client-side flag.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.emailConfirmedAt) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}`);
  }
  return user;
}

/** Ensures the user holds at least one of the given roles. */
export async function requireRole(roles: string[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.roles.some((role) => roles.includes(role))) {
    throw new ForbiddenError();
  }
  return user;
}

/** Ensures the user is authenticated; throws instead of redirecting. */
export async function assertAuthenticated(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

export function hasRole(user: CurrentUser | null, role: string): boolean {
  return user?.roles.includes(role) ?? false;
}
