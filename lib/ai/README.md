# AI Motivation Provider (Gemini + Groq, multi-key rotation)

AI-generated daily quotes for members. Every provider output is validated with
`motivationContentSchema` (`lib/validations/motivation.ts`) before it is shown or persisted.

## How it works

- `ai-provider.ts` — turns every configured key into a slot (`gemini#1, groq#1, gemini#2, groq#2, …`).
  Each request starts at the next slot (round-robin), so usage is spread across all keys.
  - Per key, a model chain is tried (a retired/overloaded model falls through to the next one).
  - A key that returns 401/403/429 (bad key / quota) is skipped for 10 minutes.
  - The whole run is bounded to ~7 s, and each HTTP call to `AI_MOTIVATION_TIMEOUT_MS` (capped at 4 s so a hung provider still leaves time to fail over).
- `motivation-provider.ts` — AI first; if **every** key fails, the curated library is used.
- `fallback-provider.ts` + `backup-quotes.json` — curated quotes, deterministic per member per day.
  A quote is always served.

## Env vars (server-only — set them in Netlify too)

```env
AI_MOTIVATION_ENABLED=true
GEMINI_API_KEYS=key-1,key-2        # Google AI Studio keys, comma-separated
GROQ_API_KEYS=key-1,key-2          # Groq keys, comma-separated
AI_MOTIVATION_TIMEOUT_MS=8000      # optional, per request
# Optional — override the model chains when a provider retires a model:
# GEMINI_MODELS=gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest
# GROQ_MODELS=openai/gpt-oss-20b,openai/gpt-oss-120b
```

Add more keys at any time by appending them to the lists; no code change needed.
