"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/lib/auth/guards";
import {
  submitReviewSchema,
  moderateReviewSchema,
  deleteReviewSchema,
  submitTransformationSchema,
  moderateTransformationSchema,
} from "@/lib/validations/reviews";
import { logError } from "@/lib/errors";
import type { Database } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Action state
// ---------------------------------------------------------------------------

export interface ReviewActionState {
  ok: boolean;
  message?: string;
  id?: string;
}

// ---------------------------------------------------------------------------
// Revalidation
// ---------------------------------------------------------------------------

function revalidateReviews() {
  revalidatePath("/");
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/reviews/transformations");
  revalidatePath("/member/reviews");
  revalidatePath("/about");
}

function revalidateTransformations() {
  revalidatePath("/");
  revalidatePath("/admin/reviews/transformations");
}

// ---------------------------------------------------------------------------
// Submit Review (member)
// ---------------------------------------------------------------------------

export async function submitReview(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = submitReviewSchema.safeParse({
    rating: formData.get("rating"),
    title: formData.get("title"),
    content: formData.get("content"),
    targetType: formData.get("targetType"),
    coachId: formData.get("coachId") || null,
    sessionId: formData.get("sessionId") || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      member_id: user.id,
      rating: parsed.data.rating,
      title: parsed.data.title,
      content: parsed.data.content,
      target_type: parsed.data.targetType,
      coach_id: parsed.data.coachId ?? null,
      session_id: parsed.data.sessionId ?? null,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to submit review", error, { userId: user.id });
    return { ok: false, message: "Could not submit review. Please try again." };
  }

  revalidateReviews();
  return { ok: true, id: data.id, message: "Review submitted! It will be visible after moderation." };
}

// ---------------------------------------------------------------------------
// Moderate Review (admin / coach)
// ---------------------------------------------------------------------------

export async function moderateReview(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = moderateReviewSchema.safeParse({
    reviewId: formData.get("reviewId"),
    status: formData.get("status"),
    isFeatured: formData.get("isFeatured") === "true" ? true : undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();

  const updatePayload: Database["public"]["Tables"]["reviews"]["Update"] = {
    status: parsed.data.status as Database["public"]["Enums"]["review_status"],
  };
  if (parsed.data.isFeatured !== undefined) {
    updatePayload.is_featured = parsed.data.isFeatured;
  }

  const { error } = await supabase
    .from("reviews")
    .update(updatePayload)
    .eq("id", parsed.data.reviewId);

  if (error) {
    logError("Failed to moderate review", error, { reviewId: parsed.data.reviewId });
    return { ok: false, message: "Could not update review. Please try again." };
  }

  revalidateReviews();
  return { ok: true, message: `Review ${parsed.data.status.toLowerCase()}.` };
}

// ---------------------------------------------------------------------------
// Toggle Review Featured (admin / coach)
// ---------------------------------------------------------------------------

export async function toggleReviewFeatured(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const reviewId = formData.get("reviewId") as string | null;
  const isFeatured = formData.get("isFeatured") === "true";

  if (!reviewId) {
    return { ok: false, message: "Missing review ID." };
  }

  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("reviews")
    .update({ is_featured: isFeatured })
    .eq("id", reviewId);

  if (error) {
    logError("Failed to toggle review featured", error, { reviewId });
    return { ok: false, message: "Could not update review." };
  }

  revalidateReviews();
  return { ok: true, message: isFeatured ? "Review featured." : "Review unfeatured." };
}

// ---------------------------------------------------------------------------
// Delete Review (owner or admin)
// ---------------------------------------------------------------------------

export async function deleteReview(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = deleteReviewSchema.safeParse({
    reviewId: formData.get("reviewId"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  const user = await requireUser();
  const supabase = await createClient();

  // Check if user is admin or the review owner
  const isAdmin = user.roles.includes("ADMIN");
  if (!isAdmin) {
    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("member_id")
      .eq("id", parsed.data.reviewId)
      .single();

    if (fetchError || !review) {
      return { ok: false, message: "Review not found." };
    }
    if (review.member_id !== user.id) {
      return { ok: false, message: "You can only delete your own reviews." };
    }
  }

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", parsed.data.reviewId);

  if (error) {
    logError("Failed to delete review", error, { reviewId: parsed.data.reviewId });
    return { ok: false, message: "Could not delete review." };
  }

  revalidateReviews();
  return { ok: true, message: "Review deleted." };
}

// ---------------------------------------------------------------------------
// Submit Transformation (member or admin)
// ---------------------------------------------------------------------------

export async function submitTransformation(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = submitTransformationSchema.safeParse({
    title: formData.get("title"),
    story: formData.get("story"),
    beforeImageUrl: formData.get("beforeImageUrl"),
    afterImageUrl: formData.get("afterImageUrl"),
    startingWeight: formData.get("startingWeight") || null,
    currentWeight: formData.get("currentWeight") || null,
    timeframeMonths: formData.get("timeframeMonths") || null,
    discipline: formData.get("discipline") || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transformation_stories")
    .insert({
      member_id: user.id,
      title: parsed.data.title,
      story: parsed.data.story,
      before_image_url: parsed.data.beforeImageUrl,
      after_image_url: parsed.data.afterImageUrl,
      starting_weight: parsed.data.startingWeight ?? null,
      current_weight: parsed.data.currentWeight ?? null,
      timeframe_months: parsed.data.timeframeMonths ?? null,
      discipline: parsed.data.discipline ?? null,
      is_published: false,
      is_featured: false,
    })
    .select("id")
    .single();

  if (error) {
    logError("Failed to submit transformation", error, { userId: user.id });
    return { ok: false, message: "Could not submit transformation story." };
  }

  revalidateTransformations();
  return { ok: true, id: data.id, message: "Transformation story submitted for review." };
}

// ---------------------------------------------------------------------------
// Moderate Transformation (admin / coach)
// ---------------------------------------------------------------------------

export async function moderateTransformation(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = moderateTransformationSchema.safeParse({
    transformationId: formData.get("transformationId"),
    isPublished: formData.get("isPublished") === "true" ? true : undefined,
    isFeatured: formData.get("isFeatured") === "true" ? true : undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, message: first?.message ?? "Invalid data." };
  }

  await requireRole(["ADMIN", "COACH"]);
  const supabase = await createClient();

  const updatePayload: Database["public"]["Tables"]["transformation_stories"]["Update"] = {};
  if (parsed.data.isPublished !== undefined) {
    updatePayload.is_published = parsed.data.isPublished;
  }
  if (parsed.data.isFeatured !== undefined) {
    updatePayload.is_featured = parsed.data.isFeatured;
  }

  const { error } = await supabase
    .from("transformation_stories")
    .update(updatePayload)
    .eq("id", parsed.data.transformationId);

  if (error) {
    logError("Failed to moderate transformation", error, { transformationId: parsed.data.transformationId });
    return { ok: false, message: "Could not update transformation." };
  }

  revalidateTransformations();
  return { ok: true, message: "Transformation updated." };
}
