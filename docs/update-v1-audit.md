# UPDATE V1 — Phase 1 Deep Audit (Source of Truth)

Audit date: 2026-08-29. Baseline commit: `2cefe70` (P15–P20 complete,
release candidate deployed on https://fight-zone.app, backend Supabase
project `jdbythhwikqvqenxyuqw`).

This is the **current-state audit** mandated by `updates/update-v1.md` §27
Phase 1. It reflects the actual codebase + deployed DB schema, NOT prior
completion reports.

---

## 1. Business identity today

- `lib/site.ts` already models **one coach**: `siteConfig.coach = { name: "Seif Dridi", role: "Head Coach & Founder" }`.
- Public marketing copy is single-coach throughout (hero, footer, CTA, about, news/service previews).
- **However** a vestigial multi-coach directory layer exists:
  - `app/(marketing)/coaches/page.tsx` (grid over N coaches via RPC)
  - `app/(marketing)/coaches/[id]/page.tsx` (per-coach detail + "Back to coaches")
  - Queries `getPublicCoaches` (queries.ts:1184) + `getPublicCoachById` (queries.ts:1220)
  - RPCs `get_available_coaches`, `get_coaches_directory`
  - **"Coaches" link still in the dashboard shell** `components/dashboard/dashboard-shell.tsx:74` (PUBLIC_NAV) — inconsistent with `lib/site.ts` (no Coaches link).
- These plural paths are only reachable via the dashboard shell "Coaches" link (not in marketing nav).

## 2. Deployed DB reality

- `coach_profiles` = **0 rows** in production (baseline after P19 cleanup). Only `membership_plans` has seed data (6 plans). There are 2 users (Seif admin/coach + Karim member) but no coach_profiles row, no member_profiles row persisted in baseline.
- `get_public_coach()` RPC returns `LIMIT 1` → returns nothing when the table is empty; home/about use `resolveOrFallback` to degrade gracefully (so the site does not crash).

## 3. Events domain (event-centric core)

**`events` table** (`20260815000300_content.sql:49`, capacity added `20260821000000`):
`id, title, description, start_at, end_at, location, event_type (TRAINING|WORKSHOP|COMPETITION|SEMINAR|OTHER), is_public (default false), created_by→profiles, created_at, updated_at, max_participants (nullable)`

**`event_participants`** (`...content.sql:74`): `id, event_id, member_id→member_profiles, status (JOINED|INTERESTED|CANCELLED|ATTENDED|NO_SHOW), joined_at`, UNIQUE(event_id, member_id).

**Business logic (DB-enforced, SECURITY DEFINER):**
- `enforce_event_registration()` — BEFORE INSERT: event exists, `is_public=true`, `start_at>now()`, active count (`status != 'CANCELLED'`) < `max_participants`. Re-issued with `FOR UPDATE` row-lock in `20260901000010` to serialize concurrent registrations. Capacity is safe under concurrency.
- `enforce_participation_transitions()` — BEFORE UPDATE state machine: INTERESTED→JOINED|CANCELLED; JOINED→CANCELLED|ATTENDED|NO_SHOW; terminal states frozen; **members cannot self-mark ATTENDED/NO_SHOW**.
- Notification triggers: registration + cancellation (+ event cancelled 6c missing from file? present as registration/cancel only).

**RLS events:** SELECT public `is_public=true`; SELECT/ALL staff `is_admin_or_coach()`.
**RLS event_participants:** SELECT own-or-staff; INSERT own-or-staff; UPDATE own-or-staff; DELETE staff.

**Gaps found:**
1. **No image/cover field on events** → §7 custom imagery not supported. `media_events` junction is dead schema.
2. **Zero-participant events invisible to staff/admin** — `getStaffEventById` (queries.ts:835) and `getAdminEvents` (queries.ts:1000) use `event_participants!inner(id)` inner-join → omit 0-participant events.
3. **No delete event path** (action or UI).
4. **No update-event UI** — `updateEvent` action (events.ts:163) orphaned.
5. **Private events invisible to members even when registered** — member detail uses `getPublicEventById` (RLS public-only), so a registered member can't view a private event.
6. **Count vs capacity mismatch** — `get_public_event_participant_count` RPC counts ALL rows incl. CANCELLED/INTERESTED, while the capacity trigger counts `!= CANCELLED`. `spotsLeft` (derived client-side, event-detail.tsx:35) can be wrong.
7. `INTERESTED` status never used (no "interested" flow).
8. Public list `getPublicEvents` (queries.ts:102) does **not** compute participant count/spots, and has no pagination.

**Server actions (`lib/actions/events.ts`):** `registerForEvent` (38), `cancelEventRegistration` (81), `createEvent` (112, ADMIN/COACH), `updateEvent` (163, orphaned), `updateParticipantStatus` (206, ADMIN/COACH, attendance/no-show/cancel). No delete.

**Admin event routes:** list, new (create form), detail (participant list + load-more). No edit page.

---

## 4. Bookings vs Events (audit for §18)

Two genuinely distinct domains, unified only in `/member/schedule`:

| | **EVENTS** | **BOOKINGS (SESSIONS)** |
|---|---|---|
| Table | `events` + `event_participants` | `sessions` (catalog) + `bookings` |
| Participation | `participation_status` (JOINED/…/NO_SHOW), capacity-capped, deadline `start_at>now()` | `booking_status` (PENDING→CONFIRMED→COMPLETED/NO_SHOW/CANCELLED), per-session scheduling |
| Capacity | `max_participants`, concurrency-safe trigger | one member per booking; time unique index |
| Payment | local (no payment on events today) | sessions have `price`; bookings no payment wired to event |
| State machine | `enforce_participation_transitions` | `enforce_booking_transition` |
| Notifications | registration/cancellation | insert/status-change |
| Who | member self-registers | member requests (PENDING) → staff confirms |

**Decision driver:** The V1 model makes **events the primary relationship** ("Seif creates events → members register → attend → pay locally"). But private one-on-one coaching is *exactly* what the bookings system provides (member requests, coach confirms, time + notes).

### Recommended architecture (pending §5 confirmation)
- **EVENTS** = scheduled sport/community activity (multi-participant capacity, self-registration, local payment). Primary public product.
- **BOOKINGS/SESSIONS** = private/direct coaching reservations. **Retained** but re-positioned as the "private coaching" path, visually/semantically separate from events in public nav. This avoids deleting working, security-tested infrastructure while removing the confusion of two competing "join the same activity" flows (bookings drive private sessions; events drive public/group activities — no overlap).
- `INTERESTED` status retired from active UX (default remains in enum for compat; active flows use JOINED).

---

## 5. Memberships / subscriptions / payments (for §13, §14)

**Key finding:** there is **NO payment provider integration at all** (no Stripe, no service-role, no webhook). Online payment is **presentation-only copy** + enums.

**Tables:** `membership_plans` (6 seeded rows, presentation), `member_subscriptions`, `payments` (altered to member/subscription refs).

**RLS hardening already applied:**
- `member_subscriptions_owner_insert` (self-subscribe) was **dropped** in `20260827000000`.
- `payments_owner_insert` (self-fabricate payment) **dropped**.
- `member_subscriptions_member_cancel` — member may only cancel own ACTIVE sub.
- COACH payments access removed (single-coach model).

**Server actions (`lib/actions/memberships.ts`):** `cancelSubscription` (58), `createMembershipPlan` (99), `updateMembershipPlan` (162), `toggleMembershipPlanActive` (228), `recordPayment` (258), `grantMemberSubscription` (309). `subscribeToPlan` deliberately removed. **No route/form consumes grant/record actions** (orphaned).

**Routes:** `/pricing` (public), `/member/subscription`, `/member/payments`, `/admin/memberships*` (plans/new/[id]/subscriptions/payments). Nav: public nav has `Pricing`; member nav has `Membership`+`Payments`; admin nav has `Memberships`; home has `PricingPreview` ("Online subscription coming soon" badge); pricing FAQ claims card/online payments available.

**Impact summary:** The memberships/subscriptions/payments **infrastructure is non-functional as a product** (no checkout, no self-service purchase, no provider). It is purely a presentation manager + admin manual grants. This makes the V1 removal LOW-RISK: no real payment flow exists to "remove". Strategy: strip from active UX/nav/routes; keep tables + enum + migrations intact (safe retention per §14); make `/pricing` redirect/absorb into events; remove PricingPreview from home.

---

## 6. RLS / security posture (for §20)

- RLS enabled on all business tables; helpers `has_role`, `is_admin_or_coach`, `is_admin` (SECURITY DEFINER, revoked from public at `20260901000000:269`).
- Grants: Data-API grants to anon/authenticated for SELECT on public surfaces + staff writes; `TRUNCATE/REFERENCES` revoked from anon/authenticated.
- Column-level guards: reviews moderation, transformations, profiles self-update, subscription cancel.
- **No service-role in app runtime** (lib/supabase has no admin.ts; publishable key only).
- Known discrepancies noted: `20260901000020` comments claim a revoke that isn't present; test expectations vs trigger SQLSTATE mismatch (tests expect 23514, triggers raise 42501) — cosmetic, no prod impact.

---

## 7. Performance / loading / nav

- Server Components + server rendering throughout; `cache()` on queries; Suspense + skeletons on home/marketing; loading.tsx present for most routes.
- Home is fully server-rendered with per-section Suspense.
- Nav: `lib/site.ts` public nav (Home/About/Services/Events/Pricing/News/Contact). Member nav: Overview/Sessions/Schedule/Bookings/Events/Membership/Payments/Reviews/Messages/Notifications/Profile. Admin nav: Overview/Services/Events/Bookings/Memberships/Reviews/Messages/Notifications/Content. Dashboard shell PUBLIC_NAV includes **Coaches** (to remove).
- Event pages use Suspense + skeletons; member/admin events lack route-specific loading but fall back to shared layout loading.

---

## 8. Imagery asset inventory (relevant to §7)

`public/components/event/` already has: `boxing.svg`, `kickboxing.jpg`, `fitness-highlight.svg`, `fitness-default.svg`, `strength-default.jpg`, `strength.jpg`, `competition.svg`, `gym-hero-1..4.jpg`. Good base for the default-per-discipline imagery system (reuse + map to event types). Coach imagery: `coach-seif-dridi-illustration-*.jpeg`.

---

## 9. Summary of required V1 changes (gap map)

| Update § | Required | Current state | Action |
|---|---|---|---|
| §1–2 single-coach | Remove multi-coach UX | vestigial directory (+dashboard link) | Remove/replace `/coaches` routes, plural queries, dashboard Coaches link; keep single-coach marketing |
| §7 event imagery | event cover + per-type defaults | none; assets exist | Add default-image mapping + optional custom upload (storage) |
| §8 cards | premium event card (image, discipline, date, price, spots) | text-only card | Redesign card |
| §9 detail | hero image, pricing, coach, dynamic CTA | functional but no image/pricing/private visual | Enhance |
| §10 create form | free/paid-locally, public/private, image | no pricing, public/private exists | Extend form (event pricing) |
| §13 removals | §14 removals | no real payments | Remove memberships/payments/plans UX + nav; safe retention |
| §18 booking vs event | audit + document | two domains | Retain bookings as private-coaching; document |
| §12 private events | define visibility, enforce at RLS/query | members can't view registered private events | Fix query/RLS so private events visible to registered/authed members (or staff-only presentation) |
| §22/23/24/25 | loading/error/empty/responsive | partially present | Polish event surfaces |

---

## 10. Uncommitted / working state

Repo working tree was clean at audit start (P20 committed by owner:
`2cefe70`). Any changes in this update remain to be committed by the owner
per normal process.
