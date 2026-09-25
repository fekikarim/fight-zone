# Fight Zone — Roadmap

> Master status doc. Last updated: 2026-08-29 (Update V4).

## Business model (current)

> **Seif Dridi → creates events → events appear in his calendar → members discover events →
> members verify availability → database safely handles participation → capacity updates →
> Seif sees his schedule and participants → members can cancel when allowed → capacity becomes
> available again.**

- Event-centric product: public group events + private 1-on-1 coaching (capacity-1) events.
- Local payment & attendance tracking, **staff-confirmed only** — no online payment.
- Membership/subscription/online-payment/multi-coach/bookings product UX removed (tables
  and migrations preserved).
- Legacy routes permanently redirected (`/pricing→/events`, `/coaches→/about`, etc.).

## Current status

| Item                          | Status                                   |
| ----------------------------- | ---------------------------------------- |
| Update V1 code + UI           | DONE — gates green                        |
| Update V2 code + UI           | DONE — gates green (tsc 0, eslint 0/0, `npm run build`) |
| Update V2 calendar            | DONE — `/admin/calendar` (month/week/agenda) + realtime sync |
| Update V2 participation UX    | DONE — verify/success/full/already/cancel |
| Update V3 email automation    | DONE — gates green (tsc 0, eslint 0/0, `npm run build`) |
| V3 reminders / daily report   | DONE — 30-min coach+member reminders, 07:00 daily coach report (Africa/Tunis) |
| V3 cancellation + empty alerts| DONE — out-of-band alert to Seif; one-shot empty-event alert on count→0 |
| V3 delivery idempotency       | DONE — `email_deliveries` log + atomic claim/mark (no duplicates) |
| V3 scheduler                 | DONE — Netlify Scheduled Functions → protected `/api/cron/*` routes |
| Update V4 AI motivation      | DONE — gates green (tsc 0, eslint 0/0, `npm run build`) |
| V4 provider abstraction      | DONE — `lib/ai/` (fallback default + optional Gemini) + Zod validation |
| V4 daily dialog/card         | DONE — once/day dialog in member layout + read-only dashboard card |
| V4 concurrency + RLS         | DONE — atomic upsert, member-owned rows, no client insert (8 SQL tests pass) |
| V1 migration                  | PUSHED — verified live (remote == local) |
| V2 migration (realtime + RPC) | PUSHED — verified live (remote == local) |
| V3 migration (email log + RPCs)| PUSHED — verified live (remote == local) |
| V4 migration (daily_motivations)| PUSHED — verified live (remote == local) |
| Coach News & Events system  | DONE — gates green (tsc 0, eslint 0/0, `npm run build`); 19 SQL tests pass |
| News/Event migration        | PUSHED + types regenerated + gates green — **LIVE** |
| Author RPC migration        | PUSHED + types regenerated + gates green — **LIVE** |
| Live re-serve on production   | **PENDING** — after migration push + redeploy + env vars |

## Next steps (in order)

1. **Owner:** approve `supabase db push` (applies the one pending additive
   migration: `20260907000000_coach_news_events.sql` — news excerpt/category,
   `event_format`, payment defaults, re-join, capacity guard).
2. Regenerate `types/database.types.ts` (`npm run db:types`) after push
   (news `excerpt`/`category` + events `event_format` were added by hand to
   match; regen converges them).
3. **Set V3 env vars** on Netlify: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (long random
   string), and optionally `RESEND_FROM_EMAIL`/`RESEND_REPLY_TO_EMAIL` (verified Resend
   sender domain). Keep `NEXT_PUBLIC_SITE_URL` = deployed domain. V4 requires no new env
   vars unless enabling the optional Gemini provider (`AI_MOTIVATION_ENABLED`,
   `GEMINI_API_KEY`, and optionally `GEMINI_MODEL`, `AI_MOTIVATION_TIMEOUT_MS`).
4. Redeploy to Netlify (`fight-zone.app`) so `netlify/functions/*.mjs` scheduled functions
   are active; verify the two schedules in the Netlify dashboard.
5. Post-push smoke (authed): Seif opens `/admin/calendar` (realtime); member registers
   (verify → success), fills an event (full flow), cancels (capacity release + V3
   cancellation/empty alerts); create an event ~30 min ahead and confirm reminders; confirm
   the 07:00 report; member opens dashboard and receives once/day motivation dialog.
6. Seed 1–2 real public events + 1 private coaching event for demo/content.
7. Optional follow-ons (see `docs/update-v3.md` / `docs/daily-ai-motivation.md`):
   `email_deliveries` retention sweep, extend realtime to member-side availability, broader
   notification preferences, switch AI provider or add a hosted alternative in `lib/ai/`.

## Historical planning artifacts

- `updates/update-v1.md` — authoritative Update V1 spec (29 sections).
- `updates/update-v2.md` — authoritative Update V2 spec (26 parts).
- `updates/update-v3.md` — authoritative Update V3 spec (27 parts).
- `updates/update-v4.md` — authoritative Update V4 spec (Daily AI Motivational Coach).
- `docs/update-v1-audit.md` — Phase 1 audit (gap map).
- `docs/update-v1-architecture.md` — Phase 2 owner-approved architecture decisions.
- `docs/update-v1.md` — Update V1 final implementation report (19-section, classified).
- `docs/update-v2.md` — Update V2 final implementation report (17-section, classified).
- `docs/update-v3.md` — Update V3 final implementation report (21-section, classified).
- `docs/daily-ai-motivation.md` — Update V4 implementation note (design + validation).
- `docs/production-readiness.md` — Phase 19/20 readiness + launch (GO WITH EXPLICIT
  ACCEPTED RISKS).
