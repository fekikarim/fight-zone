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

const SYSTEM_INSTRUCTION = `You are the corner coach at Fight Zone, a boxing, kickboxing and fitness gym.
Between rounds a coach does not lecture — they lean in and say one or two lines that make a fighter stand up.
Write exactly that for a member opening the app today. Speak TO them ("you"), present tense, punchy, warm and fierce.
Output a single JSON object only — no markdown, no commentary. Fields:
- "quote": ORIGINAL words (never a famous quote, no names, no hashtags, no emojis), 1 or 2 short sentences, at most 170 characters. Concrete gym imagery beats abstract advice (the bell, the bag, the wraps, the last round, sweat, breath, footwork). Family-friendly, never unsafe or medical.
- "focus": today's single action, imperative, 2 to 6 words, at most 50 characters (e.g. "Win the first two minutes"). Never null.
- "category": exactly one of ["DISCIPLINE","STRENGTH","BOXING","KICKBOXING","FITNESS","CONSISTENCY","CONFIDENCE","RECOVERY","MINDSET","RESILIENCE"].
Avoid generic poster lines ("believe in yourself", "never give up", "every day is a new chance") and do not start with "Every" or "Remember".
Example: {"quote":"Your legs will ask you to stop before your heart does. Answer with one more round.","focus":"Finish the last round strong","category":"RESILIENCE"}`;

const THEMES = [
  "showing up on a day you didn't want to", "footwork and patience", "recovery is part of the plan", "walking in with confidence",
  "one percent better than yesterday", "breathing under pressure", "coming back after a loss", "consistency beats intensity",
  "respect for your training partners", "the late rounds", "a goal for this week", "technique before power",
  "staying calm when tired", "the work nobody sees", "the first bell", "wrapping your hands", "the heavy bag",
];

/** Varies the request so members don't get near-identical lines every day. */
function userPrompt(): string {
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
  return `Corner talk for today. Theme: ${theme}.`;
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
