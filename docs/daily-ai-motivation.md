# Daily AI Motivational Coach (Update V4)

> Authoritative design + implementation note for the daily, personalized
> motivational quote dialog shown to authenticated Fight Zone members.
> Companion to `updates/update-v4.md` (spec) and the `docs/update-v3.md`
> (prior update) conventions. See `roadmap.md` for deploy status.

## Objective

Each calendar day, when a member opens their Fight Zone account, they
receive a fresh motivational experience: a short, personalized, Fight
Zone-themed quote (focus + category) delivered through a premium dialog
overlay. The system:

- shows **once per member per business day** (DB-backed uniqueness,
  not client state),
- stays **fully functional even when no AI is available** (curated
  fallback library is the production default),
- is **secure** (server-only generation, member-owned rows, RLS,
  Zod-validated output),
- is **concurrency-safe** (atomic get-or-create).

## Architecture decision (from the V4 audit)

Fight Zone deploys on **Netlify (serverless Next.js 16)**. Because serverless
does not run a persistent local LLM, the app has never depended on a local
model. The AI provider is **Google Gemini** (free tier), which works
serverless on Netlify.

Therefore Update V4 uses **Option C — internal backend integration** with
a **replaceable provider abstraction** (`lib/ai/`):

| Provider | Active when | Notes |
|----------|-------------|-------|
| **Fallback library** (`fallback-provider.ts`) | **Always** (default) | Curated original quotes; deterministic per member/day; never fails |
| **Gemini** (`gemini-provider.ts`) | `AI_MOTIVATION_ENABLED=true` **and** `GEMINI_API_KEY` set | Free tier (`gemini-3.5-flash`), Zod-validated; any failure degrades to fallback |

No Python/FastAPI microservice is justified: it would add a second
deployment surface with **no runtime to host it**. The provider
abstraction keeps the door open to a different model later without changing
application code.

The app is designed so the AI is **never a single point of failure** —
the fallback library is the default and always available.

## Data flow

```
Member dashboard (client)
  └─ DailyMotivationGate (once/day, sessionStorage optimization)
       └─ server action getTodayMotivation()        [lib/actions/motivation.ts]
            ├─ assertAuthenticated()  → user.id
            ├─ SELECT today's row (member RLS client)   [common path, no generation]
            ├─ if missing → getDailyMotivation()        [lib/ai/motivation-provider.ts]
            │      ├─ Gemini (enabled?) → Zod validate → fallback on any error
            │      └─ Fallback library (deterministic)
            └─ upsert_daily_motivation(...) (SECURITY DEFINER, admin client)
                 └─ atomic ON CONFLICT ... DO UPDATE ... WHERE quote IS NULL
                      → Tab A generates, Tab B receives the same persisted quote
```

Members never call a model directly. There is **no public AI endpoint**
and **no browser → Gemini call**.

## Database model (additive migration)

Migration: `supabase/migrations/20260905000000_update_v4_daily_motivations.sql`

Table `public.daily_motivations`:

| Column          | Type      | Notes                                                       |
|-----------------|-----------|-------------------------------------------------------------|
| `id`            | uuid PK   | default `gen_random_uuid()`                                  |
| `user_id`       | uuid FK   | → `profiles(id)` ON DELETE CASCADE                           |
| `quote`         | text      | 1–4 sentences, ≤600 chars, not blank (check constraints)     |
| `focus`         | text      | optional short action phrase (≤120 via Zod)                  |
| `category`      | text      | one of the 10 allowed categories (check constraint)          |
| `source`        | text      | `AI` or `FALLBACK`                                            |
| `motivation_date`| date     | business day in `Africa/Tunis`                               |
| `generated_at`  | timestamptz | default now()                                              |
| `displayed_at`  | timestamptz | stamped on creation/return                                 |

Constraints:
- `UNIQUE (user_id, motivation_date)` — the daily-uniqueness guarantee.
- Check constraints reject blank, over-long, or invalid-category quotes.

### RLS + grants (least privilege)

- `ENABLE ROW LEVEL SECURITY`.
- **SELECT** policy: `user_id = auth.uid()` (member reads own rows only).
- **No INSERT / UPDATE / DELETE policies** for any client role.
- `GRANT SELECT ON ... TO authenticated` (required for RLS policy to
  take effect — Supabase does not auto-grant table privileges).
- `GRANT ALL ON ... TO service_role` (trusted server tooling).
- Writes happen **only** through the SECURITY DEFINER function
  `public.upsert_daily_motivation(...)`, revoked from
  `public`/`anon`/`authenticated`, `GRANT EXECUTE ... TO service_role`.

### Concurrency (no SELECT→check→INSERT race)

The server never does a naï ve check-then-insert. The insert is an atomic
upsert:

```sql
insert into public.daily_motivations (...)
values (...)
on conflict (user_id, motivation_date)
    do update set displayed_at = now()
    where daily_motivations.quote is null
returning *;
```

When two tabs create today's quote at the same instant, the first insert
wins; the second hits the conflict, the `DO UPDATE ... WHERE quote IS
NULL` guard is already satisfied (quote set), so the losing writer
receives the **existing** row. One quote, one row, both tabs agree.

### Timezone strategy

`motivation_date` is the **business timezone** (`Africa/Tunis`), computed
from `lib/timezone.ts` `businessDateKey()`. This matches the V3 daily
coach-report boundary and does **not** silently depend on the browser's
timezone. (Deliberate, documented decision — see
`updates/update-v4.md`.)

## AI provider abstraction (`lib/ai/`)

- `motivation-provider.ts` — provider interface + `getDailyMotivation()`
  (tries enabled AI, always falls back; validates with Zod).
- `gemini-provider.ts` — Gemini (free tier); strict timeout
  (`AI_MOTIVATION_TIMEOUT_MS`, default 8s), abort call, forces
  `application/json` output, JSON extraction, Zod validation; logs
  `logDegradation` and throws on failure.
- `fallback-provider.ts` — curated library; deterministic
  per-member-per-day selection (djb2 hash of `user|date`) so consecutive
  days differ and parallel devices agree.
- `index.ts` — public re-exports.

### Validation (`lib/validations/motivation.ts`)

Every provider output is validated by `motivationContentSchema`:
- `quote` 1–600 chars, **1–4 sentences**,
- `category` ∈ the 10 allowed values,
- `focus` ≤120 chars (optional),
- `source` ∈ `AI | FALLBACK`,
- content is family-friendly, non-mandatory, and contains no medical
  advice (enforced by provider prompt + review).

## Backend action (`lib/actions/motivation.ts`)

`getTodayMotivation()` — `"use server"`, `assertAuthenticated()`,
returns `MotivationActionState { ok, quote?, focus?, category?, source? }`.
Always returns a usable quote; if persistence fails it still returns the
generated content and logs `logDegradation`. Common-path reads return the
existing daily row with **no generation**.

## UI (`components/motivation/`)

- `daily-motivation-dialog.tsx` — premium overlay matching the
  review-modal pattern: backdrop, Escape/backdrop close, `aria-modal`,
  focus return, "Let's Train" CTA, category/focus/name footer, loading
  state. Dark-mode native (app is dark-only).
- `daily-motivation-gate.tsx` — mounts once in the member layout
  (`app/member/layout.tsx`); calls the action once per business day;
  `sessionStorage` (`fz_motivation_shown:<YYYY-MM-DD>`) is used **only
  as an optimization** so it doesn't re-open every refresh mid-session.
  The **DB remains the source of truth**.
- `today-motivation-card.tsx` — server-rendered, read-only dashboard
  card (revisit today's quote); never creates; hidden until today's quote
  exists. Mounted on `app/member/page.tsx`.

## Env contract (optional AI)

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_MOTIVATION_ENABLED` | `"true"` enables the Gemini provider | off |
| `GEMINI_API_KEY` | Google AI Studio API key (`AIza...`) | — |
| `GEMINI_MODEL` | model name | `gemini-3.5-flash` |
| `AI_MOTIVATION_TIMEOUT_MS` | provider timeout | `8000` |

No env vars are required for the app to work — with none set, the
fallback library serves every member. This is the production-safe default
on Netlify.

## Validation & gates

- `npx tsc --noEmit` — 0 errors
- `npx eslint .` — 0/0
- `npm run build` — success
- Migration replay on scratch Postgres (all 33 migrations): clean
- 8 behavioral SQL tests pass (RLS own-only, no client insert, revoked
  function, blank-quote check, atomic idempotency, concurrency → one row)
- `supabase db push --dry-run` — reports V1/V2/V3/V4 all **UNPUSHED**

## Files

- `supabase/migrations/20260905000000_update_v4_daily_motivations.sql`
- `lib/ai/motivation-provider.ts`, `lib/ai/gemini-provider.ts`,
  `lib/ai/fallback-provider.ts`, `lib/ai/index.ts`
- `lib/validations/motivation.ts`
- `lib/actions/motivation.ts`
- `components/motivation/daily-motivation-dialog.tsx`,
  `components/motivation/daily-motivation-gate.tsx`,
  `components/motivation/today-motivation-card.tsx`
- `app/member/layout.tsx` (gate), `app/member/page.tsx` (card)
- `types/database.types.ts` (`daily_motivations` + `upsert_daily_motivation`)

## Deploy requirements

1. **Owner:** approve `supabase db push` (applies V1–V4 pending).
2. Regenerate `types/database.types.ts` after push.
3. Redeploy Netlify. No new env vars needed unless enabling the optional
   Gemini provider (`AI_MOTIVATION_ENABLED`, `GEMINI_API_KEY`).
