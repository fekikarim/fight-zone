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
  "id" | "title" | "slug" | "content" | "cover_image_url" | "published_at"
>;

/** Full news article (detail page). */
export type NewsArticle = NewsRow;

/** Admin news row (includes metadata). */
export type AdminNewsItem = Pick<
  NewsRow,
  "id" | "title" | "slug" | "is_published" | "published_at" | "created_at" | "updated_at"
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
