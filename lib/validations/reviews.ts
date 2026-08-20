import { z } from "zod";

// ---------------------------------------------------------------------------
// Review submission
// ---------------------------------------------------------------------------

export const submitReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Rating must be at least 1.").max(5, "Rating must be at most 5."),
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  content: z.string().trim().min(10, "Review must be at least 10 characters.").max(2000),
  targetType: z.enum(["COACH", "SESSION", "CLUB"]),
  coachId: z.string().uuid().nullable().optional(),
  sessionId: z.string().uuid().nullable().optional(),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

// ---------------------------------------------------------------------------
// Review moderation (admin / coach)
// ---------------------------------------------------------------------------

export const moderateReviewSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID."),
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
  isFeatured: z.boolean().optional(),
});

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

// ---------------------------------------------------------------------------
// Delete review
// ---------------------------------------------------------------------------

export const deleteReviewSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID."),
});

export type DeleteReviewInput = z.infer<typeof deleteReviewSchema>;

// ---------------------------------------------------------------------------
// Transformation submission
// ---------------------------------------------------------------------------

export const submitTransformationSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  story: z.string().trim().min(20, "Story must be at least 20 characters.").max(5000),
  beforeImageUrl: z.string().url("Before image URL is required."),
  afterImageUrl: z.string().url("After image URL is required."),
  startingWeight: z.coerce.number().positive().nullable().optional(),
  currentWeight: z.coerce.number().positive().nullable().optional(),
  timeframeMonths: z.coerce.number().int().positive().nullable().optional(),
  discipline: z.string().trim().max(100).nullable().optional(),
});

export type SubmitTransformationInput = z.infer<typeof submitTransformationSchema>;

// ---------------------------------------------------------------------------
// Transformation moderation (admin / coach)
// ---------------------------------------------------------------------------

export const moderateTransformationSchema = z.object({
  transformationId: z.string().uuid("Invalid transformation ID."),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export type ModerateTransformationInput = z.infer<typeof moderateTransformationSchema>;
