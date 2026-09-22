export { getDailyMotivation } from "@/lib/ai/motivation-provider";
export { fallbackMotivation } from "@/lib/ai/fallback-provider";
export { isGeminiEnabled } from "@/lib/ai/gemini-provider";
export {
  motivationContentSchema,
  MOTIVATION_CATEGORIES,
  MOTIVATION_SOURCES,
  type MotivationCategory,
  type MotivationSource,
  type MotivationContent,
} from "@/lib/validations/motivation";
