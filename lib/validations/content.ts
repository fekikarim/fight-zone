import { z } from "zod";

// ---------------------------------------------------------------------------
// News CRUD
// ---------------------------------------------------------------------------

export const createNewsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be at most 200 characters."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens."),
  content: z.string().max(50000).optional(),
  cover_image_url: z.string().url("Must be a valid URL.").optional().or(z.literal("")),
  is_published: z.boolean().default(false),
});

export type CreateNewsInput = z.infer<typeof createNewsSchema>;

export const updateNewsSchema = z.object({
  articleId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  content: z.string().max(50000).optional(),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  is_published: z.boolean().optional(),
});

export type UpdateNewsInput = z.infer<typeof updateNewsSchema>;

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export const createMediaSchema = z.object({
  url: z.string().url("Must be a valid URL."),
  type: z.enum(["IMAGE", "VIDEO", "DOCUMENT"]),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  is_public: z.boolean().default(true),
});

export type CreateMediaInput = z.infer<typeof createMediaSchema>;

export const updateMediaSchema = z.object({
  mediaId: z.string().uuid(),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  is_public: z.boolean().optional(),
});

export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export const createAchievementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be at most 200 characters."),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(["TITLE", "TROPHY", "MEDAL", "CERTIFICATE", "RANKING"]),
  date: z.string().optional().or(z.literal("")),
  image_url: z.string().url("Must be a valid URL.").optional().or(z.literal("")),
});

export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;

export const updateAchievementSchema = z.object({
  achievementId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(["TITLE", "TROPHY", "MEDAL", "CERTIFICATE", "RANKING"]).optional(),
  date: z.string().optional().or(z.literal("")),
  image_url: z.string().url().optional().or(z.literal("")),
});

export type UpdateAchievementInput = z.infer<typeof updateAchievementSchema>;

// ---------------------------------------------------------------------------
// Delete schemas
// ---------------------------------------------------------------------------

export const deleteNewsSchema = z.object({
  articleId: z.string().uuid(),
});

export const deleteMediaSchema = z.object({
  mediaId: z.string().uuid(),
});

export const deleteAchievementSchema = z.object({
  achievementId: z.string().uuid(),
});
