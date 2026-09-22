# UPDATE V1 — Phase 2 Architecture Decisions (Approved)

Owner-confirmed decisions leading the realignment. Base: `docs/update-v1-audit.md`.

## 1. Events-only domain model (bookings removed)

**Decision (owner):** Remove the bookings/sessions system entirely. Private
coaching becomes a **private EVENT**.

- **EVENT** = Seif's scheduled activity.
  - **Public event** → multi-participant (capacity > 1), group/community training.
  - **Private event** → private coaching, **capacity = 1 (one member only)**. Represents the member's private coaching session with Seif.
- `sessions`, `bookings`, and the member booking flows are **removed** from the product.
- The `bookings`/`sessions` **tables are retained** for historical/migration safety (NOT dropped), but are no longer used by any UI, query, action, or nav.

This removes the "two competing ways to join an activity" confusion: everything routes through **events**.

## 2. Private-event semantics

- **Public event** — visible to everyone (anon + members). Any member/guest registers (guests directed to sign-in). Participants limited by `max_participants > 1`.
- **Private event** — visible only to **authenticated members** (hidden from public anon visitors). Enforced at **RLS/query level**, not just UI. Capacity = 1 (a member registers → fills the single spot). Used for private one-on-one coaching sessions with Seif.
- There is **no invitation/subscription-to-see** system in V1 (simplest model, per update §12).

## 3. Event pricing & local payment (persist + track)

Additive columns on `events`:
- `is_free boolean not null default true`
- `price_tnd numeric(10,2) null` (set when not free), `check (price_tnd is null or price_tnd >= 0)`
- Membership "paid status" on participation (staff-controlled only):
- `event_participants`:
  - `payment_status` enum `UNPAID | PAID | NOT_REQUIRED` (default `NOT_REQUIRED`)
  - `attended` boolean (staff marks) — replaces/echoes `status = ATTENDED`.

**Rules (DB + RLS enforced):**
- `price_tnd` must be null when `is_free`, and non-null when not free.
- Members **cannot** self-mark `PAID` or `attended`.
- Only Seif/staff manage local payment confirmation + attendance.
- `payment_method` is implicitly `LOCAL` (single-coach model, no online payment). No online payment flow anywhere; UX always states "pay directly to the coach at the event."

## 4. Membership/payment product removal (UX only; tables retained)

**Decision (owner):** Remove the memberships/subscriptions/plans/payments **product surface**, retain the underlying tables/enums/migrations for compatibility.

- Remove from UX/nav/routes: `/pricing`, `/member/subscription`, `/member/payments`, `/admin/memberships*`, pricing nav links, PricingPreview section, membership CTAs.
- Redirect `/pricing` (and legacy member/admin membership routes) → `/events`.
- Remove multi-coach surface: `/coaches`, `/coaches/[id]`, plural queries, dashboard "Coaches" link.
- Keep `membership_plans`, `member_subscriptions`, `payments` tables + their RLS/triggers/migrations untouched (documented as retained-but-inactive).

## 5. Product navigation after realignment

- Public nav: Home, About, **Events**, News, Contact. (No Pricing, no Coaches, no Services as competitor-directory — services folded into events where relevant; see §6.)
- Member nav: Overview, Events, Schedule, Messages, Notifications, Profile.
- Admin nav: Overview, **Events**, Messages, Notifications, Content, Reviews.
- One coherent story: "Fight Zone is Seif Dridi's sports community — discover events, join, attend, communicate."

## 6. Services handling

`services` = coach service catalog (sessions). With bookings removed, the public `/services` marketing becomes secondary to events. Decision: **retain** `/services` as Seif's coaching-offerings presentation (non-competitor, single-coach) but **de-emphasize** in nav priority and remove booking-CTA from service pages (redirect to events/contact instead). Keeps working content without presenting competing multi-coach selection.

## 7. Booking→Event data migration strategy (Phase 3)

- Because bookings/sessions become inactive, **no forward data migration is required** (no existing prod bookings to convert — DB baseline shows 0 rows). We only:
  - add event columns (pricing, imagery),
  - add participation payment/attended columns,
  - update RLS for private-event visibility,
  - fix count-vs-capacity and zero-participant bugs,
  - add indexes for the new query patterns.
- `events.created_by` remains the single coach (Seif is the only staff creator).

## 8. Security model (unchanged principles)

- RLS is the boundary; SECURITY DEFINER triggers enforce capacity/state/locale-payment rules.
- Members can never: modify capacity, mark themselves paid/attended, bypass private-event visibility, or escalate roles.
- No service-role at runtime; explicit column selection; zod at input boundary; no `any`/`@ts-ignore`.
