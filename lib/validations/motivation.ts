import { z } from "zod";

/**
 * Validation for the Daily AI Motivational Coach.
 *
 * Server actions are the only trust boundary. AI-generated content is
 * ALWAYS validated server-side with Zod before it is shown to a member or
 * persisted — never trusted from an external provider. The fallback
 * library is validated by the same schema so the two providers produce
 * interchangeable, safe output.
 */

export const MOTIVATION_CATEGORIES = [
  "DISCIPLINE",
  "STRENGTH",
  "BOXING",
  "KICKBOXING",
  "FITNESS",
  "CONSISTENCY",
  "CONFIDENCE",
  "RECOVERY",
  "MINDSET",
  "RESILIENCE",
] as const;

export type MotivationCategory = (typeof MOTIVATION_CATEGORIES)[number];

export const MOTIVATION_SOURCES = ["AI", "FALLBACK"] as const;
export type MotivationSource = (typeof MOTIVATION_SOURCES)[number];

/**
 * Core shape every provider must return, and the schema the persisted row
 * is checked against. Enforces:
 *  - a quote of 1-4 sentences, bounded length (max 600 chars),
 *  - an allowed category,
 *  - an optional short focus line (max 120 chars),
 *  - a valid source marker,
 *  - family-friendly, non-mandatory content with no medical advice.
 */
const SentenceBoundary = /[.!?…]/;

export const motivationContentSchema = z
  .object({
    quote: z.string().min(1).max(600),
    focus: z.string().max(120).nullable().optional(),
    category: z.enum(MOTIVATION_CATEGORIES),
    source: z.enum(MOTIVATION_SOURCES),
  })
  .superRefine((data, ctx) => {
    const sentenceCount = (data.quote.match(/[.!?…]+(\s|$)/g) ?? []).length;
    if (!SentenceBoundary.test(data.quote)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quote must be one to four sentences.",
        path: ["quote"],
      });
    } else if (sentenceCount > 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quote must be one to four sentences.",
        path: ["quote"],
      });
    }
  });

export type MotivationContent = z.infer<typeof motivationContentSchema>;
