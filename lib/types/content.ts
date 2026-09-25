import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Row types (derived from DB)
// ---------------------------------------------------------------------------

type NewsRow = Database["public"]["Tables"]["news"]["Row"];
type MediaRow = Database["public"]["Tables"]["media"]["Row"];
type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** Public-facing news item (card grid). */
export type NewsItem = Pick<
  NewsRow,
  "id" | "title" | "slug" | "excerpt" | "category" | "content" | "cover_image_url" | "published_at" | "created_by"
>;

/** News item with the resolved author display name. */
export type NewsItemWithAuthor = NewsItem & { author_name: string | null };

/** Full news article (detail page). */
export type NewsArticle = NewsRow;

/** Full article with the resolved author display name. */
export type NewsArticleWithAuthor = NewsArticle & { author_name: string | null };

/** Admin news row (includes metadata). */
export type AdminNewsItem = Pick<
  NewsRow,
  "id" | "title" | "slug" | "excerpt" | "category" | "is_published" | "published_at" | "created_at" | "updated_at"
>;

/** Public media item. */
export type MediaItem = Pick<MediaRow, "id" | "url" | "type" | "title" | "description">;

/** Admin media row. */
export type AdminMediaItem = Pick<
  MediaRow,
  "id" | "url" | "type" | "title" | "description" | "is_public" | "uploaded_at" | "created_at"
>;

/** Public achievement item. */
export type AchievementItem = Pick<
  AchievementRow,
  "id" | "title" | "description" | "type" | "date" | "image_url"
>;

/** Admin achievement row. */
export type AdminAchievementItem = Pick<
  AchievementRow,
  "id" | "title" | "description" | "type" | "date" | "image_url" | "created_at" | "updated_at"
>;

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const achievementTypeLabel: Record<string, string> = {
  TITLE: "Title",
  TROPHY: "Trophy",
  MEDAL: "Medal",
  CERTIFICATE: "Certificate",
  RANKING: "Ranking",
};

export const mediaTypeLabel: Record<string, string> = {
  IMAGE: "Image",
  VIDEO: "Video",
  DOCUMENT: "Document",
};

export const newsCategoryLabel: Record<string, string> = {
  GENERAL: "General",
  TRAINING: "Training",
  NUTRITION: "Nutrition",
  COMPETITION: "Competition",
  COMMUNITY: "Community",
  ANNOUNCEMENT: "Announcement",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive article lifecycle from published status. */
export function getArticleLifecycle(
  isPublished: boolean,
  publishedAt: string | null,
): "draft" | "published" | "scheduled" {
  if (!isPublished) return "draft";
  if (publishedAt && new Date(publishedAt) > new Date()) return "scheduled";
  return "published";
}

/** Derive media lifecycle. */
export function getMediaLifecycle(isPublic: boolean): "public" | "private" {
  return isPublic ? "public" : "private";
}

/**
 * Derives a display excerpt from the body: single-spaced, cut at a
 * sentence boundary near 160 characters so cards and metadata never
 * slice mid-sentence. Used when the coach leaves the excerpt empty.
 */
export function deriveExcerpt(content: string): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= 160) return flat;
  const cut = flat.slice(0, 160);
  const boundary = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  return (boundary > 40 ? cut.slice(0, boundary + 1) : cut).trim();
}
