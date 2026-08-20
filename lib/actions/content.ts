"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import {
  createNewsSchema,
  updateNewsSchema,
  deleteNewsSchema,
  createMediaSchema,
  updateMediaSchema,
  deleteMediaSchema,
  createAchievementSchema,
  updateAchievementSchema,
  deleteAchievementSchema,
} from "@/lib/validations/content";
import { logError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Action state
// ---------------------------------------------------------------------------

export interface ContentActionState {
  ok: boolean;
  message?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Revalidation
// ---------------------------------------------------------------------------

function revalidateNews(articleId?: string) {
  revalidatePath("/news");
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/news");
  if (articleId) {
    revalidatePath(`/news/${articleId}`);
    revalidatePath(`/admin/content/news/${articleId}`);
  }
}

function revalidateMedia() {
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/media");
  revalidatePath("/"); // gallery preview on home
}

function revalidateAchievements() {
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/achievements");
  revalidatePath("/about"); // palmares on about page
}

// ---------------------------------------------------------------------------
// News CRUD
// ---------------------------------------------------------------------------

export async function createNews(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = createNewsSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content") || undefined,
    cover_image_url: formData.get("cover_image_url") || undefined,
    is_published: formData.get("is_published") === "true",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  const user = await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("news")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      content: parsed.data.content ?? null,
      cover_image_url: parsed.data.cover_image_url || null,
      is_published: parsed.data.is_published,
      published_at: parsed.data.is_published ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to create news", error, { title: parsed.data.title });
    if (error.code === "23505") {
      return { ok: false, message: "An article with this slug already exists." };
    }
    return { ok: false, message: "Could not create article. Please try again." };
  }

  revalidateNews(data.id);
  return { ok: true, id: data.id, message: "Article created." };
}

export async function updateNews(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = updateNewsSchema.safeParse({
    articleId: formData.get("articleId"),
    title: formData.get("title") || undefined,
    slug: formData.get("slug") || undefined,
    content: formData.get("content") || undefined,
    cover_image_url: formData.get("cover_image_url") || undefined,
    is_published: formData.get("is_published") === "true" ? true : undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { articleId, title, slug, content, cover_image_url, is_published } = parsed.data;

  const { error } = await supabase
    .from("news")
    .update({
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(content !== undefined && { content }),
      ...(cover_image_url !== undefined && { cover_image_url: cover_image_url || null }),
      ...(is_published !== undefined && {
        is_published,
        ...(is_published && { published_at: new Date().toISOString() }),
      }),
    })
    .eq("id", articleId);

  if (error) {
    logError("Failed to update news", error, { articleId });
    if (error.code === "23505") {
      return { ok: false, message: "An article with this slug already exists." };
    }
    return { ok: false, message: "Could not update article. Please try again." };
  }

  revalidateNews(articleId);
  return { ok: true, id: articleId, message: "Article updated." };
}

export async function deleteNews(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = deleteNewsSchema.safeParse({ articleId: formData.get("articleId") });
  if (!parsed.success) return { ok: false, message: "Invalid data." };

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { error } = await supabase.from("news").delete().eq("id", parsed.data.articleId);

  if (error) {
    logError("Failed to delete news", error, { articleId: parsed.data.articleId });
    return { ok: false, message: "Could not delete article. Please try again." };
  }

  revalidateNews();
  return { ok: true, message: "Article deleted." };
}

// ---------------------------------------------------------------------------
// Media CRUD
// ---------------------------------------------------------------------------

export async function createMediaRecord(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = createMediaSchema.safeParse({
    url: formData.get("url"),
    type: formData.get("type"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    is_public: formData.get("is_public") !== "false",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  const user = await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media")
    .insert({
      url: parsed.data.url,
      type: parsed.data.type,
      title: parsed.data.title ?? null,
      description: parsed.data.description ?? null,
      is_public: parsed.data.is_public,
      coach_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to create media record", error);
    return { ok: false, message: "Could not save media. Please try again." };
  }

  revalidateMedia();
  return { ok: true, id: data.id, message: "Media saved." };
}

export async function updateMedia(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = updateMediaSchema.safeParse({
    mediaId: formData.get("mediaId"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    is_public: formData.get("is_public") === "true" ? true : formData.get("is_public") === "false" ? false : undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { mediaId, title, description, is_public } = parsed.data;

  const { error } = await supabase
    .from("media")
    .update({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(is_public !== undefined && { is_public }),
    })
    .eq("id", mediaId);

  if (error) {
    logError("Failed to update media", error, { mediaId });
    return { ok: false, message: "Could not update media. Please try again." };
  }

  revalidateMedia();
  return { ok: true, id: mediaId, message: "Media updated." };
}

export async function deleteMedia(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = deleteMediaSchema.safeParse({ mediaId: formData.get("mediaId") });
  if (!parsed.success) return { ok: false, message: "Invalid data." };

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { error } = await supabase.from("media").delete().eq("id", parsed.data.mediaId);

  if (error) {
    logError("Failed to delete media", error, { mediaId: parsed.data.mediaId });
    return { ok: false, message: "Could not delete media. Please try again." };
  }

  revalidateMedia();
  return { ok: true, message: "Media deleted." };
}

// ---------------------------------------------------------------------------
// Achievements CRUD
// ---------------------------------------------------------------------------

export async function createAchievement(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = createAchievementSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    date: formData.get("date") || undefined,
    image_url: formData.get("image_url") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  const user = await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("achievements")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      date: parsed.data.date || null,
      image_url: parsed.data.image_url || null,
      coach_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to create achievement", error, { title: parsed.data.title });
    return { ok: false, message: "Could not create achievement. Please try again." };
  }

  revalidateAchievements();
  return { ok: true, id: data.id, message: "Achievement created." };
}

export async function updateAchievement(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = updateAchievementSchema.safeParse({
    achievementId: formData.get("achievementId"),
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
    type: formData.get("type") || undefined,
    date: formData.get("date") || undefined,
    image_url: formData.get("image_url") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { achievementId, title, description, type, date, image_url } = parsed.data;

  const { error } = await supabase
    .from("achievements")
    .update({
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(date !== undefined && { date: date || null }),
      ...(image_url !== undefined && { image_url: image_url || null }),
    })
    .eq("id", achievementId);

  if (error) {
    logError("Failed to update achievement", error, { achievementId });
    return { ok: false, message: "Could not update achievement. Please try again." };
  }

  revalidateAchievements();
  return { ok: true, id: achievementId, message: "Achievement updated." };
}

export async function deleteAchievement(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const parsed = deleteAchievementSchema.safeParse({
    achievementId: formData.get("achievementId"),
  });
  if (!parsed.success) return { ok: false, message: "Invalid data." };

  await requireRole(["ADMIN"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("achievements")
    .delete()
    .eq("id", parsed.data.achievementId);

  if (error) {
    logError("Failed to delete achievement", error, {
      achievementId: parsed.data.achievementId,
    });
    return { ok: false, message: "Could not delete achievement. Please try again." };
  }

  revalidateAchievements();
  return { ok: true, message: "Achievement deleted." };
}
