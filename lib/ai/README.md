# AI Motivation Provider (Gemini)

This directory contains the logic for the AI-generated motivational quotes in Fight Zone.
By default, the application uses a curated static fallback library (`fallback-provider.ts`)
because it is hosted on serverless architecture (Netlify).

The AI provider is **Google Gemini** (`gemini-provider.ts`) — the free tier
(`gemini-3.5-flash`) works serverless on Netlify. When enabled, `getDailyMotivation`
asks Gemini for today's quote and, on **any** failure (timeout, network error, malformed
response, or Zod validation failure), safely falls back to the static library — the app
never breaks.

## Env vars (to enable Gemini)

In your environment (Netlify env vars or `.env.local` for local dev), add:

```env
# Enable the AI provider instead of the fallback library
AI_MOTIVATION_ENABLED="true"

# Your Google AI Studio API key (AIza...)
GEMINI_API_KEY="your-api-key"

# Optional: model name (default "gemini-3.5-flash")
GEMINI_MODEL="gemini-3.5-flash"

# Optional: request timeout in ms (default 8000)
AI_MOTIVATION_TIMEOUT_MS="8000"
```

## How it works

- `motivation-provider.ts` — picker: Gemini (when enabled) → fallback library.
- `gemini-provider.ts` — calls Gemini with `responseMimeType: "application/json"` and
  validates the output against the shared Zod schema.
- `fallback-provider.ts` — curated original quotes, deterministic per member per day.
- `backup-quotes.json` — additional curated quotes available for the library.

Every provider output is validated server-side with `motivationContentSchema`
(`lib/validations/motivation.ts`) before it is shown or persisted.
