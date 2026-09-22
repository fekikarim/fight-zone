# Update V3 — Final Implementation Report

**Fight Zone** · Production-grade Event Email Automation — Smart Reminders, Daily Coach Report & Cancellation Alerts
**Date:** 2026-08-29
**Spec:** `updates/update-v3.md` (27 parts)
**Depends on:** Update V1 (`docs/update-v1.md`), Update V2 (`docs/update-v2.md`)

Legend for every claim below:

```text
IMPLEMENTED  — delivered in code and present in the working tree
VERIFIED     — exercised and confirmed (tested, built, or gate-passed)
UNVERIFIED   — present but not end-to-end exercised in production
BLOCKED      — intentionally not done / blocked by unavailable infrastructure
```

---

## 1. Executive summary

Update V3 builds a **production-grade, idempotent, timezone-aware email automation layer**
on top of the event-centric platform, reusing the **existing Resend integration** rather
than creating a competing email system:

- **30-minute event reminders** to Coach Seif **and** to every **JOINED** member.
- A **daily 7:00 AM coach schedule report** (business timezone = `Africa/Tunis`).
- **Cancellation alerts** to Seif when a member cancels, plus a **one-shot empty-event
  alert** when the authoritative participant count drops to zero.
- A durable **`email_deliveries` delivery log** whose atomic SECURITY DEFINER claim/mark
  functions guarantee **no duplicate emails** across overlapping/retried scheduler runs.

The scheduler architecture is **Netlify Scheduled Functions → protected Next.js API route**
— keeping all business logic, the Supabase client, and the Resend client inside the
application server, with the scheduler as a thin authenticated trigger.

The one required database migration (`20260904000000_update_v3_emails.sql`) is validated on
scratch Postgres 17.10 and confirmed pending via dry-run — **NOT pushed** (awaiting owner
approval, alongside the still-pending V1 and V2 migrations).

All three mandated quality gates are green: `npx tsc --noEmit` (0 errors), `npx eslint .`
(0 errors, 0 warnings), `npm run build` (success; `/api/cron/*` present).

---

## 2. Current email architecture

```
Netlify Scheduled Function (every 15 min)
Netlify Scheduled Function (daily 07:00)
             │  POST ?authorization: Bearer CRON_SECRET
             ▼
Next.js API route app/api/cron/*  (server-only)
             │  no user session → createAdminClient()
             ▼
lib/email/jobs.ts      sendEventReminders / sendDailyCoachReport / sendEmptyEventAlerts
lib/email/send.ts      deliverEmail → CLAIM → RENDER → SEND → MARK (idempotent)
lib/email/transport.ts sendEmail → Resend SDK (reuses RESEND_API_KEY)
             │
Database: email_deliveries log + SECURITY DEFINER claim/mark functions (authority)
```

Database is the source of truth everywhere:

```text
Database mutation (cancellation committed)
        ↓  success
Server-side out-of-band notification (notifyEventCancellation)
        ↓
Email delivery (idempotent)
```

---

## 3. Audit findings

What existed before and what V3 kept vs. added:

| Area | Before V3 | V3 |
| ---- | --------- | -- |
| Resend integration | real, working — `lib/email/resend.ts` (welcome/booking/contact/password/notification) | **reused** — V3 adds `lib/email/transport.ts` sharing the same `RESEND_API_KEY` + `RESEND_FROM_EMAIL` conventions; existing senders untouched |
| Scheduler / cron | none | Netlify Scheduled Functions → protected **Next.js API route** (chosen for the Netlify deployment; keeps client code inside the app) |
| Durable delivery tracking | none | new `email_deliveries` log (idempotency) |
| Timezone | events stored `timestamptz`; no local-day logic | `lib/timezone.ts` — `Africa/Tunis` scheduling + display, TZ-db-derived offset (no DST assumption) |
| Cancellation | DB-safe status transition only | + out-of-band cancellation alert + empty-event alert (post-commit, never blocks) |
| Event selection | n/a | range + single-event SECURITY DEFINER read helpers (explicit columns, no N+1) |

Reused without duplicate infrastructure: Resend client conventions, `server-only` pattern,
`logError`/`logDegradation` from `lib/errors.ts`, `createClient()` RLS boundaries.

---

## 4. Resend integration

- **Reused** the existing `RESEND_API_KEY`; no new client layer for the provider.
- `lib/email/transport.ts` provides a single, idempotent `sendEmail()` returning the
  provider `messageId` or throwing. Default sender `Fight Zone <noreply@fight-zone.app>`,
  overridable via `RESEND_FROM_EMAIL` / `RESEND_REPLY_TO_EMAIL` (same variables the existing
  senders read — see §3).
- Server-only (`import "server-only"`); key never reaches the browser; validated to start
  with `re_`.

---

## 5. 30-minute event reminders

- **Candidate window:** `sendEventReminders(now)` queries `get_events_in_range(now,
  now+30min)` — a robust window (Part 8), tolerant of scheduler drift.
- **Coach reminder:** the event creator if staff, else first COACH/ADMIN staff recipient.
  Includes title, time window, location, participant count, and manage link.
- **Member reminders:** only **JOINED** participants (`get_event_joined_participants`); the
  state machine's `INTERESTED`/`CANCELLED`/`ATTENDED`/`NO_SHOW` are excluded (Part 4).
- **Per-recipient isolation (Part 10):** each message is claimed/sent in its own
  try/catch — one failure never blocks the rest of the batch.
- Delivery keys: `coach-remind:{eventId}`, `member-remind:{eventId}:{memberId}`.

---

## 6. Daily 7:00 AM coach report

- Triggered once per day (Netlify `0 7 * * *` → `app/api/cron/daily-report`). **Business
  timezone cron** = 07:00 `Africa/Tunis` (Part 6).
- **Idempotency key per business day:** `daily:{YYYY-MM-DD}` from `businessDateKey(now)` — the
  report is sent at most once per local business day even if the endpoint fires repeatedly.
- Query: `get_events_in_range(businessDayStart(now), businessDayEnd(now))` — today's events,
  aggregated active participant counts, joined with capacity, ordered chronologically,
  **single query + single RPC (no N+1)** (Part 18).
- **No-event day:** a lightweight, positive "clear schedule" report is still sent (Part 5).

---

## 7. Cancellation alerts

`notifyEventCancellation({ eventId, memberId })` (`lib/email/cancellation.ts`):

- Runs **out-of-band** after the cancellation has committed (Part 14/22/23):
  `void notifyEventCancellation(...)` in `cancelEventRegistration` — it can never block or
  fail the member's cancellation.
- Reads the **authoritative post-commit** event via `get_event_fingerprint()` and the
  cancelled member + staff coach via `get_profile_contact()` /
  `get_staff_recipients()` — never trusts client-provided counts or contacts (Part 20).
- Sends `EVENT_CANCELLATION_ALERT` to Seif with updated participant count.
- **Idempotent** under retry via key `cancel:{eventId}:{memberId}` (Part 13).

---

## 8. Empty-event detection

- When the authoritative **post-cancel** `participant_count === 0`, `notifyEventCancellation`
  also sends `EVENT_EMPTY_ALERT` with key `empty:{eventId}` (Part 12).
- The dedicated `sendEmptyEventAlerts` cron job scans upcoming events (next 12h) with `0`
  active participants using the **same** `empty:{eventId}` key — so the alert is sent
  **exactly once** whether it fires from the cancellation path or a later scheduled scan;
  overlapping/duplicate scans are structurally impossible (Parts 9/13).

---

## 9. Scheduling architecture

**Netlify Scheduled Functions → protected Next.js API route** was chosen (owner-confirmed in
the implementation plan) because:

- The deploy target is **Netlify** (no Vercel Cron; no Docker/Supabase job infra to introject).
- It keeps the Supabase/Resend clients and all business rules inside the Next.js server
  (single place, server-only), with the scheduler as a thin authenticated trigger.
- Answers Part 7 exactly: `Scheduler → Authenticated server endpoint → Find due reminders →
  Prevent duplicates → Send through Resend → Record result`.

Files: `netlify/functions/email-reminders.mjs` (`*/15 * * * *`),
`netlify/functions/daily-report.mjs` (`0 7 * * *`), using `@netlify/functions` `schedule()`.

The endpoint runs headless — it never relies on a logged-in user, a browser timer, or Seif
being online (Part 7).

---

## 10. Idempotency & duplicate prevention

- Persistent `email_deliveries` table with a **unique
  `(delivery_type, delivery_key, recipient_email)`** constraint (Parts 9/24).
- Atomic `claim_email_delivery()` (SECURITY DEFINER, single transaction):
  - insert-if-new (the first caller wins via `ON CONFLICT DO NOTHING`);
  - **SENT rows are terminal** — never reclaimed (no re-send);
  - **FAILED rows are re-claimed** → `PENDING`, `attempts+1` (retryable).
- Completion marks transition only `PENDING → SENT|FAILED`; double completion is a no-op and a
  later success never rewrites a FAILED row — so retries and overlapping runs can never
  duplicate (Parts 9/13).

---

## 11. Failure & retry strategy

- Per-recipient try/catch in jobs and the cancellation handler (Part 10): one failure does
  not abort the batch.
- On transmission failure, `deliverEmail` marks the delivery `FAILED` and rethrows for the
  job to log; the scheduler re-runs and `claim_email_delivery` re-claims FAILED rows
  (`attempts+1`) — **retry without duplicates** (Part 18 test).
- Errors are logged via `logError`/`logDegradation` — never surfaced raw to users (Part 21).

---

## 12. Timezone strategy

- Events stored as `timestamptz` (UTC-normalized); conversion happens only at the
  scheduling/presentation boundary (`lib/timezone.ts`).
- `BUSINESS_TIMEZONE = "Africa/Tunis"`; the UTC offset is derived from the TZ database via
  `Intl` — **no hardcoded ±1h, no DST assumption** (Part 6). Verified on scratch Node:
  `2026-08-05` business-day bounds = `2026-08-04T23:00:00Z` → `2026-08-05T23:00:00Z`, date
  key `2026-08-05`.
- Daily report "today" and the 07:00 cron are both expressed in the business timezone.

---

## 13. Security

- **Server-only email delivery:** every module is `server-only`; no client/browser
  sending (Part 1).
- **Cron authorization:** `app/api/cron/*` require `Authorization: Bearer <CRON_SECRET>`
  verified with a constant-time comparison (`lib/cron.ts`); returns 401 otherwise
  (Parts 20/25 test).
- **Secrets server-only:** `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY` are
  never `NEXT_PUBLIC_` and never logged.
- **Service role usage justified (Part 20):** email automation runs with **no user
  session** (cron) and must read staff/member/event state across RLS rows; its sole scope is
  trusted email reads/writes on `email_deliveries` + the SECURITY DEFINER helpers. All
  recipients/emails/counts are resolved server-side from the DB — **never from the client**,
  so cancellation alerts can't be forged (Parts 20/25).
- RLS remains enabled; `email_deliveries` is revoked from `anon`/`authenticated`, granted
  only to `service_role`; the SECURITY DEFINER read helpers are revoked from clients and
  granted only to `service_role` (scratch-verified: `anon` cannot `EXECUTE`).
- No `select("*")`, no `any`, no `@ts-ignore` — explicit columns throughout.

---

## 14. Performance

- `get_events_in_range()` returns events + aggregated active participant counts in **one**
  query (indexed `start_at` range), no N+1, no participant-detail fetches (Parts 18/19).
- `get_event_fingerprint()` is a single-row aggregate for the cancellation path.
- `email_deliveries` is indexed on `status`, `created_at`, and `(delivery_type, delivery_key)`
  to serve the claim/lookup and any later retention sweep (Part 24).
- Per-recipient, bounded processing — no unbounded concurrency (Part 19).

---

## 15. Files created

- `lib/timezone.ts` — business-timezone utilities.
- `lib/supabase/admin.ts` — server-only service-role client (scoped to email automation).
- `lib/email/layout.ts` — branded, mobile-friendly HTML shell + escape/button/meta renderers.
- `lib/email/types.ts` — shared delivery + template data types.
- `lib/email/templates.ts` — 5 templates (coach reminder, member reminder, daily report,
  cancellation alert, empty-event alert).
- `lib/email/delivery.ts` — claim/mark wrappers over the SECURITY DEFINER RPCs.
- `lib/email/send.ts` — idempotent `deliverEmail` (claim → render → send → mark).
- `lib/email/transport.ts` — Resend `sendEmail` transport.
- `lib/email/jobs.ts` — `sendEventReminders`, `sendDailyCoachReport`, `sendEmptyEventAlerts`.
- `lib/email/cancellation.ts` — `notifyEventCancellation` (cancellation + empty-event alerts).
- `lib/cron.ts` — Bearer `CRON_SECRET` guard.
- `lib/email/templates.ts` — (see above).
- `app/api/cron/reminders/route.ts` — protected scheduler endpoint.
- `app/api/cron/daily-report/route.ts` — protected scheduler endpoint.
- `netlify/functions/email-reminders.mjs`, `netlify/functions/daily-report.mjs` — scheduled
  functions.
- `supabase/migrations/20260904000000_update_v3_emails.sql` — V3 DB migration.
- `docs/update-v3.md` — this report.

## 16. Files modified

- `lib/actions/events.ts` — `cancelEventRegistration` fires `notifyEventCancellation`
  out-of-band after a successful cancellation.
- `types/database.types.ts` — added `email_deliveries` table, `email_delivery_type` /
  `email_delivery_status` enums, and 8 RPC function types (manually; regenerate after push,
  mirroring the V1/V2 approach).
- `.env.example` — documented `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`,
  `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`.
- `netlify.toml` — added `CRON_SECRET` to `SECRETS_SCAN_OMIT_KEYS` + scheduled-functions note.
- `package.json` — added `@netlify/functions` (devDependency).
- `roadmap.md` — V3 status update.

---

## 17. Database changes

A migration **was required** for durable duplicate prevention (Parts 9/24): neither the
existing tables nor in-memory state can answer "was this reminder already sent?" safely.
Justification:

- **why persistent tracking:** scheduler runs overlap/retry; delivery history must survive
  process restarts.
- **why existing tables can't:** events/participants contain no per-recipient delivery keys
  and adding columns would mutate historical semantics; a dedicated log is additive.
- **how uniqueness prevents duplicates:** unique `(delivery_type, delivery_key,
  recipient_email)` + atomic claim.
- **how failures retry:** FAILED → re-claim (`attempts+1`) → PENDING → SENT; SENT terminal.
- **how old records are managed:** indexed `created_at`/`status` for a future retention
  sweep; no retention job added this update (no new background infra beyond cron).

Migration: `supabase/migrations/20260904000000_update_v3_emails.sql` (additive-only):
`email_deliveries` table + enums + indexes; `claim_email_delivery` / `mark_email_delivery_sent`
/ `mark_email_delivery_failed` SECURITY DEFINER functions; read helpers
(`get_staff_recipients`, `get_profile_contact`, `get_event_joined_participants`,
`get_events_in_range`, `get_event_fingerprint`).

Validation & status:

- **Scratch Postgres 17.10:** full replay of **all** migrations (incl. V1/V2 → V3) = 0
  failures; `get_event_fingerprint` returns active count excluding CANCELLED; staff/member/
  events-in-range helpers verified; `anon` cannot `EXECUTE` the helpers; claim/mark state
  machine verified (fresh claim PENDING|1, SENT terminal → NULL, FAILED → retry PENDING|2,
  partial-batch isolation).
- **Pending:** `supabase db push --dry-run --linked` shows all **three** pending migrations
  (V1, V2, V3).
- **STOP — awaiting explicit owner approval before `supabase db push`.**

---

## 18. Testing

**Validated (scratch Postgres 17.10 + SQL/function tests):**
- Delivery claim/mark state machine (fresh / dup-while-PENDING / SENT terminal / FAILED
  retry / partial-batch isolation).
- Read helpers: staff ordering (COACH first), member contact, JOINED-only participants,
  events-in-range with active counts, single-row `get_event_fingerprint`, empty detection.
- Client grant denial: `anon` cannot execute the helpers; `email_deliveries` revoked from
  clients.
- Timezone math (`lib/timezone.ts`) via Node: business-day bounds, date key, wall-clock.

**Statically verified (code-level, gate-passing):**
- Idempotency (unique constraint + atomic claim), per-recipient isolation, out-of-band
  cancellation, cron Bearer guard, no client recipients/forgery, explicit columns, no
  `any`/`@ts-ignore`.

**UNVERIFIED (not exercised end-to-end):**
- Live Resend transmission against the provider (no real send performed; requires secret +
  verified sender domain).
- Netlify Scheduled Function firing on the deployed site.
- Real authenticated RLS request flows (no Docker/local Supabase).

**BLOCKED:**
- Full runtime E2E (scheduler firing, live Resend delivery, authenticated RLS behavior) —
  requires deployment + migration push + owner-provided secrets, all pending.

Per spec Part 25: runtime validation is not claimed where infrastructure is unavailable.

---

## 19. Verification results

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` | **VERIFIED** · 0 errors |
| `npx eslint .` | **VERIFIED** · 0 errors, 0 warnings |
| `npm run build` | **VERIFIED** · success; `/api/cron/reminders`, `/api/cron/daily-report` present |
| V3 migration scratch replay (V1→V2→V3) | **VERIFIED** · 0 failures |
| Delivery state-machine + read-helper SQL tests | **VERIFIED** on scratch |
| Client denial of email helpers | **VERIFIED** on scratch |
| Timezone bounds/keys | **VERIFIED** via Node |
| `supabase db push --dry-run --linked` | **VERIFIED** · V1 + V2 + V3 pending |
| Live scheduled-function/send smoke | **UNVERIFIED** — needs deploy + secrets + push |

---

## 20. Deployment configuration required (owner manual steps)

1. **Approve & push migrations:** `supabase db push --linked` (applies V1, V2, V3 together);
   then regenerate `types/database.types.ts` via `npm run db:types`.
2. **Environment variables** (Netlify site + scheduled functions + app server):
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (server-only, not `NEXT_PUBLIC_`).
   - `CRON_SECRET` — a long random string shared by the scheduled functions and the `/api/cron/*`
     routes (added to `netlify.toml` secret-scan omit list).
   - Verify `RESEND_API_KEY` and, if desired, set `RESEND_FROM_EMAIL` /
     `RESEND_REPLY_TO_EMAIL` (sender domain must be verified in Resend).
   - `NEXT_PUBLIC_SITE_URL` must equal the deployed domain (used by the scheduled functions to
     reach the routes and by emails for links).
3. **Redeploy to Netlify** so `netlify/functions/*.mjs` scheduled functions are active.
4. **Verify scheduled functions** in the Netlify dashboard (reminders `*/15 * * * *`;
   daily report `0 7 * * *`, business timezone `Africa/Tunis`).
5. **Smoke after push+deploy:** create an event ~30 min ahead (coach + JOINED members get
   reminders), cancel a member (Seif gets cancellation alert; if count → 0, a one-shot
   empty-event alert), and confirm the 07:00 report arrives.

These steps are **manual** — none were executed in this environment.

---

## 21. Production readiness assessment

```text
READY WITH KNOWN LIMITATIONS
```

- **READY:** code is complete, design-consistent, gate-passing; migration validated on
  scratch; idempotency/timezone/security are structurally sound.
- **Limitations (honest):**
  1. All **three** migrations (V1, V2, V3) are **UNPUSHED** — nothing relating to them is
     live until the owner approves `supabase db push` and the platform is redeployed with
     the new env vars.
  2. **Live Resend transmission and Netlify Scheduled Function firing are UNVERIFIED** —
     they require deployment + owner-provided secrets + a verified Resend sender domain.
  3. Full authenticated/anon **behavioral** RLS + E2E tests can't run locally (no
     Docker/local Supabase); verified at policy/grant/scratch/type level.
  4. `types/database.types.ts` was manually extended and must be regenerated after push.
  5. Email-transmission retries rely on the scheduler re-claiming FAILED rows; there is no
     separate retry queue (deliberate — simple, production-appropriate). Retention of old
     `email_deliveries` rows is deferred to a future sweep; indexes are ready.

---

*Report prepared per `updates/update-v3.md` FINAL REPORT requirements. Reflects the working
tree at the time of writing. Migrations remain UNPUSHED pending owner approval.*
