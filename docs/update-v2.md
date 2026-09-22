# Update V2 — Final Implementation Report

**Fight Zone** · Professional Seif Calendar + Real-Time / Concurrency-Safe Event Participation
**Date:** 2026-08-29
**Spec:** `updates/update-v2.md` (26 parts)
**Depends on:** Update V1 (`docs/update-v1.md`), Prompts #1–#11.1

Legend for every claim below:

```text
IMPLEMENTED  — delivered in code/UI and present in the working tree
VERIFIED     — exercised and confirmed (tested, built, or gate-passed)
UNVERIFIED   — present but not end-to-end exercised in production
DEFERRED     — intentionally not done / deferred for a reason
```

---

## 1. Executive summary

Update V2 delivers the two headline requirements on top of the event-centric Update V1
platform:

1. **A professional, modern calendar for Seif** at `/admin/calendar` with Month, Week, and
   Agenda/Today views, event-capacity insight, a rich event dialog, and **real-time
   synchronization** with the backend for event create/edit/cancel and participant-count
   changes.
2. **Polished, database-authoritative event participation** — a "verify your spot → success →
   full / already-registered / cancellation" experience backed by the existing
   concurrency-safe registration trigger, with real-time capacity release on the admin
   calendar.

Critical concurrency was **already DB-authoritative** from Prompt #7 / Update V1
(`enforce_event_registration()` trigger performing `SELECT … FOR UPDATE` + capacity count),
so V2 **preserved and operationalized** it rather than duplicating it — no race-prone
client-side capacity logic was introduced.

A single new additive database migration is required for realtime + staff calendar insights:
`20260903000000_update_v2_realtime.sql`. It is **validated on scratch Postgres 17.10** and
confirmed via `supabase db push --dry-run --linked`, but **has NOT been pushed** — it awaits
explicit owner approval (as does the still-pending V1 migration; see §14).

All three mandated quality gates are green: `npx tsc --noEmit` (0 errors),
`npx eslint .` (0 errors, 0 warnings), `npm run build` (success; `/admin/calendar` present).

---

## 2. Current architecture

### Calendar

`Server Component` → `initial data` → `client interactive island` → `targeted realtime` →
`router.refresh()` (reconcile with server truth).

- **Route:** `app/admin/calendar/page.tsx` is a Server Component that reads URL state
  (`?view=month|week|agenda&date=YYYY-MM-DD`) — deterministic/shareable URLs, minimal
  client state (Part 2/15).
- **Data:** `getCalendarEvents(from, to)` (`lib/supabase/queries.ts`) fetches all events in
  the active period via explicit columns and attaches each event's active participant count
  in **one** aggregated `get_staff_event_participant_counts()` RPC call (no N+1, Part 16/21).
- **Client:** `components/admin/calendar/calendar-client.tsx` renders Month/Week/Agenda,
  handles prev/next/today controls through `router.replace`, opens a custom `EventDialog`
  on event click, and subscribes to `events` + `event_participants` realtime
  (RLS-filtered) → `router.refresh()`.
- **Mobile:** Month/Week grid hidden below `lg`; Agenda (chronological list) is the mobile
  priority (Part 17).

### Participation

`Server Action` (auth derives `member_id`) → `INSERT event_participants` → database trigger
enforces capacity + deadline atomically → result resolves to a machine-readable `code`.

- `EventActionState` gained `code?: "ok" | "full" | "already" | "closed" | "not_available" | "error"`
  so the UI renders the correct state from the authoritative backend answer.
- `components/events/event-register-button.tsx` (same exported contract, so
  `app/member/events/[id]` needs no change) renders: verified-registration pending state,
  success dialog, full-event copy, already-registered state, and a 2-step cancellation with
  capacity-release note.

---

## 3. Audit findings

What existed before (and what V2 kept vs. improved):

| Area | Before | V2 |
| ---- | ------ | -- |
| Admin calendar | none | new `/admin/calendar` (Part 1/2/3/17) |
| Realtime | `config.toml` enabled but **no table publication configured** | V2 migration publishes `events` + `event_participants`, sets `REPLICA IDENTITY FULL` (Part 5/13/15) |
| Concurrency | already DB-authoritative trigger (`FOR UPDATE` + CANCELLED-excluding count + deadline) | **preserved & strengthened** — no client race logic added (Part 7) |
| Register UX | immediate insert, ambiguous outcomes | verify → success / full / already / cancel (Part 6/8/9/10/11/12) |
| Staff participant counts | `get_public_event_participant_counts()` counts **public** events only → admin calendar (which shows private coaching) would show 0 | new staff-only `get_staff_event_participant_counts()` RPC (Part 16) |
| Member-side live availability | n/a | **known RLS limitation** — members can only see their own participation rows (Part 15), so member-side availability realtime is intentionally limited; DB remains the authority |

---

## 4. Seif calendar

- **Location/nav:** `/admin/calendar`, added to admin nav between "Events" and "Reviews"
  (`app/admin/layout.tsx`).
- **Views:** Month (capsule indicators + today highlight), Week (day/time layout, desktop
  focus), Agenda (chronological, mobile-first). Controls: previous / next period, Today,
  Month/Week/Agenda toggle.
- **Event dialog:** `EventDialog` shows title, type badge, public/private badge, lifecycle
  badge (`draft/upcoming/ongoing/past` via `getEventLifecycleStatus`), date, time, location,
  price or **Free**, max/current participants, remaining spots (or **Unlimited**), full
  status, description, and a link to full event management. `NULL` capacity = unlimited, not
  zero (Part 16).
- **Backend sync:** all event create/edit/delete and registration/cancellation actions call
  `revalidateEvents()` which now includes `/admin/calendar`; realtime also triggers
  `router.refresh()` (Part 4).

---

## 5. Event participation flow

1. Member opens an event (anonymous sees "Sign in to participate").
2. Member clicks **Register** → button disables duplicate submission and shows
   **"Checking your spot…"** (verify state, Part 8).
3. Server Action resolves the **current** member from the session, Zod-validates the event id,
   and inserts the participation row. The DB trigger re-verifies existence / availability /
   deadline / capacity atomically.
4. Result resolves to a code:
   - **success** → motivational success dialog (Part 9), counts/spots/CTA update, route
     revalidates, Seif's calendar updates via realtime.
   - **full** → friendly "just filled up" copy + next action (Part 10).
   - **already** → "You're already participating" state with cancel option (Part 11).
   - **closed / not_available / error** → clear message, no technical detail, no optimistic
     UI (Part 19).

---

## 6. Concurrency & capacity safety

**Database-authoritative (preserved from Prompt #7 / Update V1):** registration does not use
`SELECT count; IF; INSERT` on the client or in separate non-atomic requests. The
`enforce_event_registration()` trigger (SECURITY DEFINER):

- locks the event row (`SELECT … FOR UPDATE`) to serialize concurrent attempts;
- counts **active** participants (`status != 'CANCELLED'`);
- enforces `max_participants` capacity;
- enforces the registration deadline (`start_at > now()`).

VERIFIED — the same mechanism was behaviorally exercised on scratch Postgres in Update V1
(capacity-1 private event: second simultaneous-style insert rejected; cancel frees the spot).
V2 did not weaken or duplicate it.

---

## 7. Cancellation & capacity release

- Member ownership is enforced server-side (`member_id` derived from session, not client).
- Cancellation performs a guaranteed safe transition → revalidates routes → frees a count
  slot (Part 12/13).
- The **admin calendar** gets live capacity release via realtime on `event_participants`
  (Part 13). The **member side** correctly reflects the released spot on their next
  authoritative register attempt via the DB trigger (fallback refetch/revalidation covers
  non-realtime clients — Part 15).

---

## 8. Realtime architecture

- **Configured by migration:** `events` + `event_participants` published to
  `supabase_realtime` with `REPLICA IDENTITY FULL` (needed for RLS-correct
  UPDATE/DELETE broadcasts).
- **Subscription:** only on `/admin/calendar` (a focused client island), one channel,
  subscribed to two tables, cleaned up in the effect teardown, no duplicates (Part 15/21).
- **Reconciliation:** realtime → `router.refresh()` so server truth re-renders; DB remains
  the source of truth, realtime is purely a refresh trigger.
- **Fallback:** if realtime is unavailable/degrades, the calendar still works through normal
  `revalidatePath` + page refetch. **Realtime is never the security mechanism** — RLS
  remains authoritative (Part 5).
- **Known limitation:** RLS means `authenticated` members only receive their own
  `event_participants` rows, so member-side *availability* realtime is limited by design.
  Full availability realtime is achievable on the admin calendar (staff see all rows). This
  is documented and intentional; the DB trigger still guarantees correct capacity.

---

## 9. UX improvements

- Calendar: premium dark-on-light design using the existing design system (Badge variants,
  `primary-soft`, `ink-soft`, `font-display`), responsive progressive disclosure, touch
  controls, shareable URLs (Part 2/3/17).
- Participation: verify-state copy/animation, motivational success dialog, friendly full
  copy, correct already-registered state, 2-step cancel (Parts 8–12).
- Loading: route `loading.tsx`, button pending spinners, dialog pending state,
  `aria-live` on status (Part 18).
- Error: route `error.tsx` with retry, action messages `role="alert"`, no sensitive detail
  (Part 19).
- Empty/edge states: no-events agenda state, undefined-capacity handled as unlimited.

---

## 10. Security

- No client-side authorization decisions; identity derived server-side (`assertAuthenticated`,
  session `user.id`).
- No client-provided `member_id`, counts, or availability trusted — the DB trigger and RLS
  are authoritative.
- Server actions validate with Zod.
- IDOR: a member can only cancel their **own** participation; cannot alter attendance/payment
  (existing `guard_event_participant_self` trigger preserved).
- No `select("*")`, no `as any` bypasses, no `@ts-ignore` — explicit columns only
  (e.g. `getCalendarEvents` explicit select list).
- Realtime is RLS-filtered; `get_staff_event_participant_counts()` is SECURITY DEFINER gated
  by `is_admin_or_coach()` and returns nothing for non-staff (`revoke … from anon,
  authenticated`; `grant … to authenticated`) — no private-event leak to members.

VERIFIED — on scratch PG: staff RPC returns counts for **both** public and private events;
a member caller gets **0 rows**; `auth` grants for `is_admin_or_coach` confirmed present in
the real project (`20260901000000_security_gate_hardening.sql:278-279`).

---

## 11. Performance

- Calendar data fetched in a Server Component via one event query (explicit columns) + one
  aggregate RPC (no N+1).
- Realtime isolated to a focused client component; payloads lightweight; subscriptions
  cleaned up (no leaks/duplicates).
- Reconciles through `router.refresh()` rather than a second data architecture.
- No unnecessary participant-detail fetches for calendar views — only aggregated counts.

---

## 12. Files created

- `lib/calendar.ts` — pure, server+client-safe date helpers (`toDateKey`, `startOfDay`,
  `startOfWeek`, `startOfMonth`, `endOfMonth`, `endOfDay`, `addDays`, `buildMonthGrid`,
  `parseDateKey`).
- `app/admin/calendar/page.tsx` — calendar Server Component (await `searchParams` per
  Next.js 16.3, `view`/`date` URL state).
- `app/admin/calendar/loading.tsx` — route loading skeleton.
- `app/admin/calendar/error.tsx` — route error boundary with retry.
- `components/admin/calendar/calendar-client.tsx` — full calendar client (Month/Week/Agenda,
  controls, `EventDialog`, realtime → `router.refresh()`).
- `supabase/migrations/20260903000000_update_v2_realtime.sql` — V2 DB migration
  (publication, REPLICA IDENTITY FULL, staff RPC).

## 13. Files modified

- `lib/supabase/queries.ts` — new `getCalendarEvents(from, to)`.
- `lib/actions/events.ts` — `EventActionState.code` result codes; `revalidateEvents()` now
  includes `/admin/calendar`.
- `types/database.types.ts` — added `get_staff_event_participant_counts` RPC type
  (manually; regenerate after push).
- `components/events/event-register-button.tsx` — rewritten participation UX
  (same exported name/props → member detail page unchanged).
- `app/admin/layout.tsx` — admin nav "Calendar".
- `roadmap.md` — V2 status/navigation update.

---

## 14. Database changes

A migration **was required** for two reasons not covered by the existing schema:

1. Realtime was enabled in `config.toml` but **no tables were published**, and
   `REPLICA IDENTITY FULL` was not set (needed for correct RLS-aware realtime broadcasts).
2. The admin calendar needs participant counts for **all** events (including private
   coaching), but the existing public helper counts only public events.

Migration: `supabase/migrations/20260903000000_update_v2_realtime.sql` (additive-only):

- Publishes `events` + `event_participants` to `supabase_realtime` (idempotent guarded
  DO block using `ALTER PUBLICATION`; works on PG 17.10 + Supabase).
- `ALTER TABLE ... REPLICA IDENTITY FULL` on both tables.
- New staff-only RPC `get_staff_event_participant_counts()` (SECURITY DEFINER, empty
  `search_path`, gated by `is_admin_or_coach()`, revoked from non-authenticated).

Validation & status:

- **Scratch Postgres 17.10:** migration re-runs idempotently; publication membership intact
  (both tables); replica identity = FULL; staff RPC returns public + private counts; member
  gets nothing.
- **Conflict with V1:** V1's `20260902000000_update_v1_events.sql` is still pending, so
  pushing applies **both** V1 and V2 migrations.
- `supabase db push --dry-run --linked` **VERIFIED**:
  ```
  Would push these migrations:
   • 20260902000000_update_v1_events.sql
   • 20260903000000_update_v2_realtime.sql
  ```
- **STOP — awaiting explicit owner approval before `supabase db push`.** After push,
  regenerate `types/database.types.ts`.

---

## 15. Testing

**Validated (scratch Postgres 17.10 replay; `v2test.sh`):**
- Staff RPC returns counts for public **and** private events (Part 16 critical fix).
- Member caller of the staff RPC receives nothing (no private-event leak).
- CANCELLED rows excluded from the active count aggregate.
- Realtime publication lists both tables; REPLICA IDENTITY FULL; migration idempotent.
- Cancellation → capacity released → a subsequent registration may take the freed spot
  (exercised via the V1 capacity trigger on scratch).

**Statically verified (code-level, gate-passing):**
- Concurrency safety (Part 7) — DB trigger `FOR UPDATE` + capacity is authoritative; no
  client `SELECT count; IF; INSERT`.
- Authorization (Part 20/12) — server-derived `member_id`; own-row-only cancellation; no
  client-provided capacity/IDs/counts; explicit columns; Zod validation.
- Calendar math + URL state (`lib/calendar.ts` + `page.tsx`), pure functions reviewed.

**Unverified / not exercised end-to-end:**
- Live authenticated/anon request simulation against a real Supabase (no Docker/local
  Supabase infrastructure available) — RLS *behavior* is verified at policy/function and
  grant level only.
- Live realtime subscribe/reconnect on a deployed client.

**Blocked:**
- Full DB/RLS behavioral test suite (capacity race, state machine, realtime delivery) —
  requires Docker/local Supabase, unavailable.

Per spec Part 24: no claim of validated E2E tests where infrastructure is unavailable.

---

## 16. Verification results

| Check                          | Result           |
| ------------------------------ | ---------------- |
| `npx tsc --noEmit`             | **VERIFIED** · 0 errors |
| `npx eslint .` (full tree)     | **VERIFIED** · 0 errors, 0 warnings |
| `npm run build`                | **VERIFIED** · success; `/admin/calendar` present in route table |
| V2 migration scratch replay    | **VERIFIED** · clean, idempotent |
| Staff participant RPC (public + private) | **VERIFIED** on scratch |
| Member → staff RPC returns nothing | **VERIFIED** on scratch |
| `supabase db push --dry-run --linked` | **VERIFIED** · V1 + V2 pending |
| Live smoke on `fight-zone.app` | **UNVERIFIED** — depends on migration push + redeploy |

---

## 17. Production readiness assessment

```text
READY WITH KNOWN LIMITATIONS
```

- **READY:** code is complete, design-consistent, gate-passing, and migration-validated.
- **Limitations (honest):**
  1. Both V1 and V2 migrations are **UNPUSHED** — nothing is live until the owner approves
     `supabase db push` and the platform is redeployed.
  2. **Member-side realtime availability is limited by RLS** (members see only their own
     participation rows by design). Capacity is always enforced by the DB, and member UIs
     resolve availability authoritatively on each attempt, but members won't get live
     "spots left" pushes while viewing an event — documented and intentional.
  3. Full authenticated/anon **behavioral** RLS + realtime tests can't be run locally (no
     Docker/local Supabase); they are verified at policy/grant/scratch level and require a
     post-push live smoke.
  4. `types/database.types.ts` was manually extended and must be regenerated after push.

---

*Report prepared per `updates/update-v2.md` FINAL REPORT requirements. Reflects the working
tree at the time of writing. Migrations remain UNPUSHED pending owner approval.*
