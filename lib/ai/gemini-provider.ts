import { GoogleGenerativeAI } from "@google/generative-ai";
import { motivationContentSchema, type MotivationContent } from "@/lib/validations/motivation";
import { logDegradation } from "@/lib/errors";

/**
 * Gemini-based motivation provider (free tier).
 *
 * Uses Google's Gemini 3.5 Flash model, which is available on the free tier
 * at no cost. This is the recommended production AI provider for Fight Zone
 * on Netlify (serverless). Any failure — network error, timeout, malformed
 * response, or Zod validation failure — throws, and the caller degrades
 * gracefully to the fallback library.
 *
 * Env contract:
 *   - AI_MOTIVATION_ENABLED  = "true" to enable this provider
 *   - GEMINI_API_KEY         = your Google AI Studio API key (AIza...)
 *   - GEMINI_MODEL           = model name (default "gemini-3.5-flash")
 *   - AI_MOTIVATION_TIMEOUT_MS = request timeout in ms (default 8000)
 */

const SYSTEM_INSTRUCTION = `You are Fight Zone's motivational coach. 
Your only job is to produce a single JSON object — no markdown fences, no commentary, nothing else.
The JSON must have exactly these fields:
- "quote": a short, original, family-friendly motivational message (1 to 4 sentences, at most 600 characters) themed around boxing, kickboxing, fitness, discipline, or mindset for a gym member. Never give medical advice, never encourage anything unsafe or harmful.
- "focus": a short action phrase of at most 120 characters (can be a single word), or null.
- "category": exactly one of ["DISCIPLINE","STRENGTH","BOXING","KICKBOXING","FITNESS","CONSISTENCY","CONFIDENCE","RECOVERY","MINDSET","RESILIENCE"].
Example output: {"quote":"Show up on the days you least feel like it. That is where fighters are made.","focus":"Discipline beats motivation","category":"DISCIPLINE"}`;

export function isGeminiEnabled(): boolean {
  return (
    process.env.AI_MOTIVATION_ENABLED === "true" &&
    typeof process.env.GEMINI_API_KEY === "string" &&
    process.env.GEMINI_API_KEY.length > 0
  );
}

export async function generateFromGemini(): Promise<MotivationContent> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const modelName = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
  const timeoutMs = Number(process.env.AI_MOTIVATION_TIMEOUT_MS ?? 8000);

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 8000,
  );

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json", // forces valid JSON output
        temperature: 0.8,
        maxOutputTokens: 300,
      },
    });

    const result = await model.generateContent(
      "Give me today's motivational quote for a Fight Zone gym member.",
      { signal: controller.signal } as Parameters<typeof model.generateContent>[1],
    );

    const text = result.response.text().trim();
    if (!text) throw new Error("Gemini returned an empty response.");

    const parsed = motivationContentSchema.safeParse(JSON.parse(extractJson(text)));
    if (!parsed.success) {
      throw new Error(`Gemini response failed Zod validation: ${JSON.stringify(parsed.error.issues)}`);
    }

    return { ...parsed.data, source: "AI" as const };
  } catch (error) {
    logDegradation("Gemini motivation provider failed; falling back to library", error, {
      domain: "motivation",
      op: "generateFromGemini",
    });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull the first JSON object out of an LLM response that may include prose. */
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}
