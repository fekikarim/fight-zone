import { z } from "zod";

// ---------------------------------------------------------------------------
// News CRUD
// ---------------------------------------------------------------------------

export const NEWS_CATEGORIES = [
  "GENERAL",
  "TRAINING",
  "NUTRITION",
  "COMPETITION",
  "COMMUNITY",
  "ANNOUNCEMENT",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_LIMITS = { titleMin: 3, titleMax: 200, slugMax: 120, excerptMax: 300, contentMax: 50000 } as const;

const excerptField = z
  .string()
  .trim()
  .max(NEWS_LIMITS.excerptMax, `Excerpt must be at most ${NEWS_LIMITS.excerptMax} characters.`)
  .optional()
  .or(z.literal(""));

const newsTitle = z
  .string({ error: "Title is required." })
  .trim()
  .min(1, "Title is required.")
  .min(NEWS_LIMITS.titleMin, `Title must be at least ${NEWS_LIMITS.titleMin} characters.`)
  .max(NEWS_LIMITS.titleMax, `Title must be at most ${NEWS_LIMITS.titleMax} characters.`);

const newsSlug = z
  .string({ error: "URL slug is required." })
  .trim()
  .min(1, "URL slug is required.")
  .max(NEWS_LIMITS.slugMax, `URL slug must be at most ${NEWS_LIMITS.slugMax} characters.`)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens only (e.g. summer-camp-2026).");

const newsContent = z
  .string()
  .max(NEWS_LIMITS.contentMax, `Content must be at most ${NEWS_LIMITS.contentMax} characters.`)
  .optional();

const coverUrl = z
  .string()
  .trim()
  .refine((u) => u === "" || /^https:\/\//i.test(u), "Please upload the cover image again.")
  .optional();

const publishNeedsContent = (data: { is_published?: boolean; content?: string }, ctx: z.RefinementCtx) => {
  if (data.is_published && (data.content ?? "").trim().length < 20) {
    ctx.addIssue({
      code: "custom",
      message: "Write at least a short paragraph (20+ characters) before publishing.",
      path: ["content"],
    });
  }
};

export const createNewsSchema = z
  .object({
    title: newsTitle,
    slug: newsSlug,
    excerpt: excerptField,
    category: z.enum(NEWS_CATEGORIES).default("GENERAL"),
    content: newsContent,
    cover_image_url: coverUrl,
    is_published: z.boolean().default(false),
  })
  .superRefine(publishNeedsContent);

export type CreateNewsInput = z.infer<typeof createNewsSchema>;

export const updateNewsSchema = z
  .object({
    articleId: z.string().uuid(),
    title: newsTitle.optional(),
    slug: newsSlug.optional(),
    excerpt: excerptField,
    category: z.enum(NEWS_CATEGORIES).optional(),
    content: newsContent,
    cover_image_url: coverUrl,
    is_published: z.boolean().optional(),
  })
  .superRefine(publishNeedsContent);

/** FormData → news schema input (shared by client validation and the server action). */
export function readNewsForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  const published = get("is_published");
  return {
    articleId: get("articleId"),
    title: get("title"),
    slug: get("slug"),
    excerpt: get("excerpt"),
    category: get("category") || undefined,
    content: get("content"),
    cover_image_url: get("cover_image_url"),
    is_published: published === undefined ? undefined : published === "true",
  };
}

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
