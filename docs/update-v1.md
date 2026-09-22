# Update V1 — Final Implementation Report

**Fight Zone** · Event-centric business model realignment
**Date:** 2026-08-29
**Spec:** `/Users/karimfeki/Documents/fz-eya/updates/update-v1.md` (29 sections)
**Supporting docs:** `docs/update-v1-audit.md` (Phase 1 audit), `docs/update-v1-architecture.md` (Phase 2 owner-approved decisions)

Legend for every claim below:

```text
IMPLEMENTED  — delivered in code/UI and present in the working tree
VERIFIED     — exercised and confirmed (tested, built, or gate-passed)
UNVERIFIED   — present but not end-to-end exercised in production
DEFERRED     — intentionally not done / deferred for a reason
```

---

## 1. Executive summary

Fight Zone was partially built as a subscription/online-payment gym (membership plans,
recurring billing UX, multi-coach discovery, bookings/sessions). Update V1 realigns the
entire product around a single clear business identity:

> **Seif Dridi → creates events → members join → members attend → payment happens
> locally → Seif manages his community from one platform.**

Concretely: events became the core product (public group events + private 1-on-1 coaching
events), pricing and a local-payment tracking model were added (staff-confirmed, no online
payment), and the membership/subscription/online-payment/multi-coach/bookings product
surfaces were removed from the active UX (tables/migrations preserved). Navigation now
leads with Events; all legacy routes are safely redirected.

All three mandated quality gates are green: `npx tsc --noEmit` (0 errors),
`npx eslint .` (0 errors, 0 warnings over the whole source tree), `npm run build`
(success). The single new database migration is validated locally and is the **only
pending migration**; it has **NOT been pushed** (awaiting explicit owner approval).

---

## 2. Current-state audit

`docs/update-v1-audit.md` captures the full Phase 1 gap map. Headline findings that drove
design:

- Events lacked pricing, imagery, and a paid/unpaid tracking signal.
- `getStaffEventById` / `getAdminEvents` used `event_participants!inner`, silently dropping
  zero-participant events from staff/admin views (P2 bug).
- Private events were invisible to the very registered members who needed to see them.
- `get_public_event_participant_count` counted ALL rows including CANCELLED — mismatched
  with the capacity trigger that excludes CANCELLED.
- No event delete action and no edit UI existed.
- The registration trigger blocked ALL non-public events, so the new private-coaching
  (capacity-1) model would have been impossible without relaxing it.

---

## 3. Business model changes

IMPLEMENTED — The product is now **event-centric and locally paid**. The platform is not
positioned as a subscription SaaS, an online billing platform, or a membership marketplace.
CTAs lead to account creation → joining the community → discovering events → registering.

The home page no longer markets membership plans (`PricingPreview` removed). Public and
member navigation lead with Events (see §9).

---

## 4. Event architecture

IMPLEMENTED — Events are the core product, modelled as a single `events` table:

- **Public events** — visible on the public calendar, anyone can discover; members register.
- **Private events / private coaching** — a *type* of event (capacity **1**, exactly one
  member) rather than a visibility class. It is the replacement for the old
  sessions/bookings product: private coaching is a private event with capacity = 1.

`EventDetail` carries `is_private_coaching` (derived from `!is_public && max_participants === 1`),
`participant_count`, and `spots_left` (active non-cancelled count vs capacity).

Member, staff, and public detail views each select the right privilege surface:

- `getPublicEvents` / `getPublicEventById` — public + future only.
- `getMemberEventViewById` — relies on RLS `events_select_authenticated` (public **or**
  capacity-1 private) so registered members see their private coaching event.
- `getStaffEventById` / `getAdminEvents` — all events (staff).

---

## 5. Event pricing and local payment design

IMPLEMENTED — No online payment anywhere.

- `events.is_free` (default true) + `events.price_tnd` (numeric) + CHECK constraint
  `events_price_consistent` (free ↔ null price; paid ↔ non-negative price).
- A local payment & attendance model on `event_participants`:
  - `payment_status` (`event_payment_status` enum: `UNPAID` | `PAID` | `NOT_REQUIRED`),
    default `NOT_REQUIRED` for free events.
  - `attended` boolean.
- Staff-only confirmation enforced by a SECURITY DEFINER trigger
  `guard_event_participant_self()` that blocks a member from self-setting `PAID`,
  self-marking `attended=true`, or flipping `PAID` → other. Members can never self-confirm
  payment or attendance.
- UI communicates the model transparently: "Fee paid locally — pay at the desk", "there is
  no online payment."
- Admin participant list provides staff controls to mark `UNPAID`/`PAID`/`NOT_REQUIRED`
  and toggle `attended`.

VERIFIED — trigger behavior and CHECK constraint exercised on a scratch Postgres 17.10
instance replaying all 29 migrations in order (functional ROI: %-constraint fires; count
function correct). Full RLS grant simulation is NOT possible on the stub (see §18).

---

## 6. Booking vs event decision

IMPLEMENTED — **Events only.** The old bookings/sessions product UX is removed from the
active product; private 1-on-1 coaching is now a private (capacity-1) event. The member
schedule was consolidated to events-only (`getMemberSchedule` now returns registered
events only; `ScheduleList` renders event rows only). `docs/events.md` documents the
relationship.

Database tables for bookings/sessions remain for historical compatibility but are **not
exposed in the product UX** (per §8).

---

## 7. Database changes

IMPLEMENTED — new additive migration `supabase/migrations/20260902000000_update_v1_events.sql`
(builds on prior schema; does not remove any prior migration/table):

- `events`: `+is_free`, `+price_tnd`, `+image_url`; CHECK `events_price_consistent`;
  indexes `events_public_start_price_idx`, `events_active_price_idx`.
- `event_participants`: `+payment_status` (default `NOT_REQUIRED`), `+attended` (default
  false); status column default → `JOINED`; index `event_participants_status_event_idx`.
- New enum `event_payment_status`.
- RLS policy `events_select_authenticated` (authenticated members can select public **or**
  capacity-1 private events).
- **REPLACED** `enforce_event_registration()` — now permits registration for `is_public`
  OR `max_participants = 1` (still enforces capacity via count of `status != 'CANCELLED'`,
  row-level lock, and the `start_at > now()` registration deadline).
- **REPLACED** `get_public_event_participant_count` — counts only `status != 'CANCELLED'`.
- **NEW** `get_public_event_participant_counts()` (SECURITY DEFINER) — single-call aggregate
  for card spot counts (avoids N+1).
- **NEW** SECURITY DEFINER trigger `guard_event_participant_self()` (staff-only payment /
  attendance confirmation).

VERIFIED — all 29 migrations replay cleanly in order on a fresh scratch Postgres 17.10
(`fail=0`); new functions/constraints behave as designed. See §16 for prod migration status
(UNPUSHED).

---

## 8. Removed / deprecated systems

IMPLEMENTED (UX removed; tables/migrations/history preserved):

- **Membership plan product** — admin membership CRUD, membership marketing, plan UI,
  member subscription page removed from UX. CTAs ("Subscribe", "Choose Plan", payment CTAs)
  gone from active product. Tables/enums stay.
- **Online payment product** — payment pages, subscription pages, payment buttons removed
  from UX. No automated payment path exists; local payment tracking only.
- **Multi-coach experience** — coach directory `/coaches` + `/coaches/[id]`, "choose your
  coach" UX, and coach-selection removed. Seif Dridi is surfaced naturally (About, event
  organizer, homepage, coach attribution).
- **Bookings / sessions product** — member bookings/sessions pages and admin bookings
  removed; consolidated into events. Backend bookings/sessions schema retained.
- **Services product pages** (public + admin) — removed from active UX.

Database migrations, RLS history, and the underlying tables are intentionally NOT deleted.

---

## 9. Routes changed / redirected

IMPLEMENTED — legacy routes deleted and permanently redirected in `next.config.ts`:

| Legacy route                | Destination       |
| --------------------------- | ----------------- |
| `/pricing`                  | `/events`         |
| `/member/subscription`      | `/member/events`  |
| `/member/payments`          | `/member/events`  |
| `/member/sessions` (+ `/*`) | `/member/events`  |
| `/member/bookings` (+ `/*`) | `/member/events`  |
| `/admin/memberships` (+`/*`) | `/admin/events`  |
| `/admin/bookings` (+ `/*`)  | `/admin/events`   |
| `/coaches` (+ `/*`)         | `/about`          |

Public nav (`lib/site.ts`) is now: Home, About, Events, News, Contact (Pricing and
Services removed). Member nav: Overview, Schedule, Events, My Reviews, Messages,
Notifications, Profile. Admin nav: Overview, Events, Reviews, Messages, Notifications,
Content. The dashboard shell exposes the same event-led structure in the desktop sidebar,
mobile drawer, and bottom tab bar.

VERIFIED — production build route table shows the removed routes are gone and events
routes are present; dev/`next build` both succeed.

---

## 10. Security changes

IMPLEMENTED:

- RLS `events_select_authenticated` lets authenticated members see public + capacity-1
  private events without loosening staff-only management.
- Registration remains gated by the hardened `enforce_event_registration` (row lock,
  capacity, deadline) — now correctly permitting private 1-on-1 registration.
- `guard_event_participant_self()` (SECURITY DEFINER) prevents members from self-confirming
  payment/attendance; only staff may set `PAID`/`attended`.
- Participant counts exposed publicly only via SECURITY DEFINER aggregate functions
  (participant rows themselves remain private per Prompt-13 privilege hardening).
- New functions are executed with restrictive `search_path = ''`.

VERIFIED — functions execute correctly on scratch; RLS *policy presence* confirmed on
scratch. Full authenticated/anon grant simulation is a stub limitation (see §18).

---

## 11. Performance improvements

IMPLEMENTED:

- Eliminated N+1 participant-count queries on event cards/detail via the
  `get_public_event_participant_counts()` aggregate (one call per list).
- Removed the `event_participants!inner` join from staff/admin event queries (also fixed
  the zero-participant drop bug).
- Added targeted partial/covering indexes for public-event and participant-status
  query patterns.
- `getMemberSchedule` simplified to a single events-only query.

---

## 12. UX / responsive improvements

IMPLEMENTED:

- **Public:** premium event cards (hero image via `resolveEventImage`, price/free badge,
  date/time, location, spots-left with urgency states); rich event detail page (hero,
  price panel, coach attribution, local-payment messaging, dynamic CTA for
  anonymous/member). `V1` default imagery is auto-derived per event type from
  `public/components/event/*` when no custom image is set.
- **Member:** "My events" shows private-coaching/payment/participation badges; member event
  detail shows private coaching events and payment/attendance status with a local-payment
  note; events-only schedule.
- **Admin:** event create (incl. private-coaching format toggle + free/price fields +
  image), event edit, delete-with-confirm, and a participant list with staff payment +
  attendance controls.
- Layouts are grid-based (`sm:`/`md:`/`lg:`) and the shared dashboard shell already
  provides desktop sidebar, tablet/desktop top nav, mobile drawer, and bottom tab bar.

---

## 13. Loading / error / empty-state improvements

IMPLEMENTED:

- Event pages use `Suspense` around the dynamic filters and admin edit form.
- Empty states retained/extended (no events yet; no registrations → "Browse upcoming
  events"; events-only schedule empty state).
- Server actions return `{ ok, message, eventId? }` and surface inline role="alert" errors;
  pending states disable submit buttons with spinners.
- Participant/attendance updates call `router.refresh()` so state re-renders in place.

---

## 14. Files created

- `lib/events/images.ts` — event image resolver (`resolveEventImage`).
- `components/events/event-edit-form.tsx` — admin edit + delete controls.
- `supabase/migrations/20260902000000_update_v1_events.sql` — Update V1 DB migration.
- `docs/update-v1-audit.md`, `docs/update-v1-architecture.md` — Phase 1/2 artifacts.
- `public/components/event/*` — default event imagery (boxing, kickboxing, fitness,
  strength, competition, gym-hero).

## 15. Files modified

- `types/database.types.ts` — events/participant/`event_payment_status`/RPC types.
- `lib/types/events.ts`, `lib/validations/events.ts` — types + zod schemas (pricing,
  payment, delete).
- `lib/actions/events.ts` — pricing in create/update; `updateParticipantPayment`,
  `deleteEvent`.
- `lib/supabase/queries.ts` — event queries enriched; left-join fix; RLS member view;
  count aggregate; events-only schedule.
- `components/marketing/event-card.tsx`, `sections/events-preview.tsx`,
  `components/events/event-detail.tsx`, `event-create-form.tsx`,
  `event-participant-list.tsx`, `schedule-list.tsx`, `event-register-button.tsx`.
- `app/(marketing)/events/page.tsx`, `app/(marketing)/events/[id]/page.tsx`,
  `app/member/events/*`, `app/member/schedule/*`, `app/admin/events/*`.
- `app/(marketing)/page.tsx`, `app/member/page.tsx`, `app/admin/page.tsx` (removed
  membership/pricing/bookings preview sections).
- `app/member/layout.tsx`, `app/admin/layout.tsx`, `components/dashboard/dashboard-shell.tsx`,
  `lib/site.ts`, `next.config.ts`, `eslint.config.mjs`.
- `components/notifications/notification-list.tsx`, `review-form-modal.tsx`,
  `app/member/messages/page.tsx` — trivial lint hygiene.

**Deleted routes:** `/coaches`, `/coaches/[id]`, `/pricing`, `/services`, `/services/[id]`,
`/member/subscription`, `/member/payments`, `/member/sessions`, `/member/sessions/[id]`,
`/member/bookings`, `/member/bookings/[id]`, `/admin/memberships` (+`/new`,`/[id]`,
`/payments`,`/subscriptions`), `/admin/bookings` (+`/[id]`), `/admin/services`
(+`/new`,`/[id]`).

---

## 16. Migration status

- All 28 prior migrations: **VERIFIED synced** — `supabase migration list --linked`
  shows local == remote for every one (the "UNPUSHED" header comments in
  `20260901000000_security_gate_hardening.sql` / `20260901000010_event_registration_lock.sql`
  are stale).
- `20260902000000_update_v1_events.sql`: **VALIDATED locally** (scratch replay of all 29
  migrations, `fail=0`) but **UNPUSHED**.

```text
supabase db push --dry-run --linked
  Would push these migrations:
   • 20260902000000_update_v1_events.sql   ← the ONLY pending, and it is additive
```

**Action required:** owner approval to run `supabase db push --linked` to apply the single
additive migration. Do **not** push without that approval. After pushing, re-run
`db:types` to regenerate `types/database.types.ts` (currently manually extended and known
consistent).

---

## 17. Verification results

| Check                          | Result           |
| ------------------------------ | ---------------- |
| `npx tsc --noEmit`             | **VERIFIED** · 0 errors |
| `npx eslint .` (full tree)     | **VERIFIED** · 0 errors, 0 warnings |
| `npm run build`                | **VERIFIED** · success; removed routes absent, events routes present |
| Migration replay (scratch)     | **VERIFIED** · 29/29 `OK`, `fail=0` |
| `get_public_event_participant_count(s)` functions | **VERIFIED** on scratch |
| `events_price_consistent` CHECK | **VERIFIED** on scratch |
| `guard_event_participant_self` trigger | **VERIFIED** on scratch (function-level) |
| RLS auth/anon behavioral sim    | **UNVERIFIED** — not simulable on the role/grant stub (see §18) |
| Live E2E on `fight-zone.app`   | **UNVERIFIED** — depends on migration push + a new deploy |

---

## 18. Known limitations

- The scratch Postgres cannot simulate Supabase's `anon`/`authenticated` role GRANTs, so
  per-role behavioral RLS is verified at the *policy/function-existence* level, not by an
  authenticated request simulation.
- `types/database.types.ts` is manually extended to match the new migration; it must be
  regenerated via `supabase gen types` AFTER the migration is pushed to avoid drift.
- Local/remote DB APIs were not re-run against a live authed session post-change; that is
  part of the post-push verification.
- No roadmap file existed in the repo to "update"; a fresh `roadmap.md` was created to
  satisfy §N mandate (see below).
- Live smoke/A11y screenshots on the deployed domain are deferred until after the migration
  push + redeploy.

---

## 19. Future recommendations

1. **Push the migration + redeploy**, then run a live authed smoke test (member registers
   for a private coaching event, staff confirms payment/attendance).
2. Regenerate `types/database.types.ts` after push; mark migration VERIFIED in this doc.
3. Seed 1–2 realistic public events and 1 private coaching event so the public calendar and
   member dashboards have content to demo.
4. Add a lightweight content/imagery workflow (uploaded event images via existing storage)
   since imagery currently defaults to bundled assets.
5. Optionally add low-friction "add to calendar" and email reminders for registered events
   once Resend-based flows are confirmed.
6. Consider formalizing off-line local-payment reconciliation (export of PAID/UNPAID per
   event) for Seif's desk workflow.
7. Extend external monitoring/alerting (the P20 residual) now that production identity is
   settled.

---

*Report prepared per `updates/update-v1.md` §29 (FINAL REPORT). All classifications above
reflect the working tree at the time of writing; the migration remains UNPUSHED pending
owner approval.*
