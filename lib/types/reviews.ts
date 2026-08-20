import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Database row types (derived from generated types)
// ---------------------------------------------------------------------------

type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type TransformationRow = Database["public"]["Tables"]["transformation_stories"]["Row"];

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export interface ReviewItem extends ReviewRow {
  member_profiles?: {
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  } | null;
}

export interface ReviewWithAuthor extends ReviewRow {
  member_profiles: {
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  };
}

export interface TransformationItem extends TransformationRow {
  member_profiles?: {
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  } | null;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

export const reviewStatusLabel: Record<
  Database["public"]["Enums"]["review_status"],
  string
> = {
  PENDING: "Pending Moderation",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const reviewTargetTypeLabel: Record<
  Database["public"]["Enums"]["review_target_type"],
  string
> = {
  COACH: "Coach",
  SESSION: "Session",
  CLUB: "Club",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export type StarType = "full" | "half" | "empty";

/**
 * Returns an array of 5 star types for rendering a rating visually.
 */
export function renderStars(rating: number): StarType[] {
  const stars: StarType[] = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push("full");
    } else if (rating >= i - 0.5) {
      stars.push("half");
    } else {
      stars.push("empty");
    }
  }
  return stars;
}

/**
 * Weight loss (or gain) in kg, derived from starting and current weight.
 */
export function computeWeightChange(
  starting: number | null,
  current: number | null,
): number | null {
  if (starting == null || current == null) return null;
  return Math.round((current - starting) * 10) / 10;
}
