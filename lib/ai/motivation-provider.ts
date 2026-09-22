import { isGeminiEnabled, generateFromGemini } from "@/lib/ai/gemini-provider";
import { fallbackMotivation } from "@/lib/ai/fallback-provider";
import { motivationContentSchema, type MotivationContent } from "@/lib/validations/motivation";
import { businessDateKey } from "@/lib/timezone";

/**
 * Motivation provider selection and orchestration.
 *
 * The provider abstraction keeps the application decoupled from any single
 * content source. `getDailyMotivation` is the single entry point used by
 * the server action: it tries the Gemini provider when enabled and ALWAYS
 * degrades to the curated fallback library on any failure. Because every
 * provider's output is validated against the shared Zod schema, the caller
 * can trust the returned `MotivationContent` unconditionally.
 *
 * Priority:
 *   1. Gemini (serverless AI)    — when enabled in env and by the user
 *   2. Fallback library          — always available, never fails
 */
export async function getDailyMotivation(
  userId: string,
  date: Date | string = new Date(),
  aiMotivationEnabled: boolean = true
): Promise<MotivationContent> {
  const motivationDate = businessDateKey(date);

  // Best-effort AI first; any failure degrades to the library.
  if (aiMotivationEnabled && isGeminiEnabled()) {
    try {
      const ai = await generateFromGemini();
      const checked = motivationContentSchema.safeParse(ai);
      if (checked.success) return checked.data;
    } catch {
      // Degrade to the library.
    }
  }

  return fallbackMotivation(userId, motivationDate);
}
