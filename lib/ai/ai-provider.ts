import "server-only";

import { motivationContentSchema, type MotivationContent } from "@/lib/validations/motivation";
import { logDegradation } from "@/lib/errors";

/**
 * Multi-key, multi-provider AI motivation generator (server-only).
 *
 * Every configured API key (Gemini + Groq, both free tiers) becomes a
 * "slot". Each request starts at the next slot in a round-robin, so daily
 * usage is spread evenly across all keys instead of draining one. A slot
 * that fails with a quota/auth error is put on a short cooldown so the
 * next requests skip it. Each slot tries its provider's model chain (a
 * retired or overloaded model falls through to the next one).
 *
 * The whole run is bounded by a total time budget; if every slot fails the
 * caller falls back to the curated quote library, so a quote is ALWAYS
 * served.
 *
 * Env contract (server-only, never NEXT_PUBLIC_):
 *   - AI_MOTIVATION_ENABLED     "true" to enable AI quotes
 *   - GEMINI_API_KEYS           comma-separated Google AI Studio keys
 *   - GROQ_API_KEYS             comma-separated Groq keys
 *   - AI_MOTIVATION_TIMEOUT_MS  per-request timeout (default 8000)
 *   - GEMINI_MODELS / GROQ_MODELS  optional comma-separated model chains
 *     (override the defaults below when Google/Groq retire a model)
 */

type ProviderName = "gemini" | "groq";

interface Slot {
  provider: ProviderName;
  key: string;
  /** Stable, non-secret label for logs ("gemini#1"). */
  label: string;
}

const DEFAULT_MODELS: Record<ProviderName, string[]> = {
  gemini: ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"],
  groq: ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"],
};

/** Total wall-clock budget for one quote, across all slots (below Netlify's function limit). */
const TOTAL_BUDGET_MS = 7000;
/** Per-attempt ceiling so one hung provider still leaves time to fail over. */
const MAX_ATTEMPT_MS = 4000;
/** How long a key that hit a quota/auth error is skipped (per warm instance). */
const COOLDOWN_MS = 10 * 60 * 1000;

const SYSTEM_INSTRUCTION = `You are Fight Zone's motivational coach.
Your only job is to produce a single JSON object — no markdown fences, no commentary, nothing else.
The JSON must have exactly these fields:
- "quote": a short, ORIGINAL (never a famous quote), family-friendly motivational message (1 to 3 sentences, at most 400 characters) themed around boxing, kickboxing, fitness, discipline, or mindset for a gym member. Never give medical advice, never encourage anything unsafe or harmful.
- "focus": a short action phrase of at most 80 characters, or null.
- "category": exactly one of ["DISCIPLINE","STRENGTH","BOXING","KICKBOXING","FITNESS","CONSISTENCY","CONFIDENCE","RECOVERY","MINDSET","RESILIENCE"].
Example output: {"quote":"Show up on the days you least feel like it. That is where fighters are made.","focus":"Discipline beats motivation","category":"DISCIPLINE"}`;

const THEMES = [
  "showing up on hard days", "footwork and patience", "recovery and rest", "building confidence",
  "small daily progress", "breathing under pressure", "learning from losses", "consistency over intensity",
  "respect for training partners", "mental toughness in the late rounds", "setting a goal for this week",
  "technique before power", "staying calm when tired", "pride in the work nobody sees",
];

/** Varies the request so members don't get near-identical quotes every day. */
function userPrompt(): string {
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  return `Give me today's motivational quote for a Fight Zone gym member. Theme: ${theme}. Do not start with "Every".`;
}

// Per warm-instance state (serverless: best effort, resets on cold start).
let cursor = Math.floor(Math.random() * 1000);
const cooldownUntil = new Map<string, number>();

function parseList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function modelsFor(provider: ProviderName): string[] {
  const override = parseList(provider === "gemini" ? process.env.GEMINI_MODELS : process.env.GROQ_MODELS);
  return override.length > 0 ? override : DEFAULT_MODELS[provider];
}

/** Interleaves providers (gemini#1, groq#1, gemini#2, …) so one provider's outage hits fewer requests. */
function buildSlots(): Slot[] {
  const gemini = [...new Set(parseList(process.env.GEMINI_API_KEYS ?? process.env.GEMINI_API_KEY))];
  const groq = [...new Set(parseList(process.env.GROQ_API_KEYS))];
  const slots: Slot[] = [];
  for (let i = 0; i < Math.max(gemini.length, groq.length); i += 1) {
    if (gemini[i]) slots.push({ provider: "gemini", key: gemini[i], label: `gemini#${i + 1}` });
    if (groq[i]) slots.push({ provider: "groq", key: groq[i], label: `groq#${i + 1}` });
  }
  return slots;
}

export function isAiMotivationEnabled(): boolean {
  return process.env.AI_MOTIVATION_ENABLED === "true" && buildSlots().length > 0;
}

/** Error carrying whether the whole key (not just the model) should be skipped. */
class ProviderError extends Error {
  constructor(
    message: string,
    readonly keyLevel: boolean,
  ) {
    super(message);
  }
}

async function callProvider(slot: Slot, model: string, timeoutMs: number): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs);
  const res =
    slot.provider === "gemini"
      ? await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            signal,
            headers: { "content-type": "application/json", "x-goog-api-key": slot.key },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
              contents: [{ role: "user", parts: [{ text: userPrompt() }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.9,
                maxOutputTokens: 400,
              },
            }),
          },
        )
      : await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal,
          headers: { "content-type": "application/json", authorization: `Bearer ${slot.key}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_INSTRUCTION },
              { role: "user", content: userPrompt() },
            ],
            response_format: { type: "json_object" },
            temperature: 0.9,
            max_completion_tokens: 800,
          }),
        });

  if (!res.ok) {
    // 401/403 = bad key, 429 = quota exhausted: skip this key for a while.
    // 404 (retired model), 400, 5xx (overloaded): try the next model.
    const keyLevel = res.status === 401 || res.status === 403 || res.status === 429;
    throw new ProviderError(`${slot.provider} HTTP ${res.status}`, keyLevel);
  }

  const body = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text =
    slot.provider === "gemini"
      ? body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("")
      : body.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new ProviderError(`${slot.provider} returned an empty response`, false);
  return text;
}

function parseContent(text: string): MotivationContent {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const json = start !== -1 && end > start ? text.slice(start, end + 1) : text;
  const raw = JSON.parse(json) as Record<string, unknown>;
  const parsed = motivationContentSchema.safeParse({
    quote: typeof raw.quote === "string" ? raw.quote.trim() : raw.quote,
    focus: typeof raw.focus === "string" && raw.focus.trim() ? raw.focus.trim() : null,
    category: typeof raw.category === "string" ? raw.category.trim().toUpperCase() : raw.category,
    source: "AI",
  });
  if (!parsed.success) throw new ProviderError("AI response failed validation", false);
  return parsed.data;
}

/**
 * Generates a quote by rotating through every configured key/model until
 * one succeeds. Throws only when ALL slots failed (caller falls back).
 */
export async function generateAiMotivation(): Promise<MotivationContent> {
  const slots = buildSlots();
  if (slots.length === 0) throw new Error("No AI API keys configured.");

  const perRequest = Number(process.env.AI_MOTIVATION_TIMEOUT_MS ?? 8000);
  const requestTimeout = Math.min(Number.isFinite(perRequest) && perRequest > 0 ? perRequest : MAX_ATTEMPT_MS, MAX_ATTEMPT_MS);
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  const start = cursor++ % slots.length;
  const ordered = [...slots.slice(start), ...slots.slice(0, start)];
  // Keys on cooldown go last instead of being dropped: if everything else
  // fails they still get a chance (the cooldown may be stale).
  const now = Date.now();
  ordered.sort(
    (a, b) => Number((cooldownUntil.get(a.key) ?? 0) > now) - Number((cooldownUntil.get(b.key) ?? 0) > now),
  );

  const failures: string[] = [];
  for (const slot of ordered) {
    for (const model of modelsFor(slot.provider)) {
      const remaining = deadline - Date.now();
      if (remaining < 500) {
        failures.push("time budget exhausted");
        return fail(failures);
      }
      try {
        const content = parseContent(await callProvider(slot, model, Math.min(requestTimeout, remaining)));
        cooldownUntil.delete(slot.key);
        return content;
      } catch (error) {
        const keyLevel = error instanceof ProviderError && error.keyLevel;
        const reason = error instanceof Error ? error.message : "unknown error";
        failures.push(`${slot.label}/${model}: ${reason}`);
        if (keyLevel) {
          cooldownUntil.set(slot.key, Date.now() + COOLDOWN_MS);
          break; // this key is unusable — move to the next slot
        }
      }
    }
  }
  return fail(failures);
}

function fail(failures: string[]): never {
  const error = new Error("All AI providers failed.");
  logDegradation("AI motivation unavailable on every key; falling back to library", error, {
    domain: "motivation",
    op: "generateAiMotivation",
    attempts: failures.slice(0, 12).join(" | "),
  });
  throw error;
}
