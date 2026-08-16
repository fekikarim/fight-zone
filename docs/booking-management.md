# Fight Zone — Booking Management (Prompt #4)

Design document for the coach/admin booking management and the
database-authoritative booking lifecycle.

## 1. Objective

Turn the booking lifecycle into a first-class, database-enforced domain flow
so that every state change is atomic, authorized per role, and visible to the
right people — while keeping the member booking workflow from Prompt #3 fully
intact.

## 2. Booking state machine

Authoritative implementation: `enforce_booking_transition()` trigger on
`bookings` (BEFORE UPDATE), migration `20260818000000_booking_lifecycle.sql`.

```
            ┌──────────────┐
            │   PENDING    │
            └──────┬───────┘
      confirm     │     cancel
        ┌─────────┴─────────┐
        ▼                   ▼
 ┌──────────────┐     ┌────────────┐
 │   CONFIRMED  │ ──► │  CANCELLED │  (terminal)
 └──────┬───────┘     └────────────┘
        │
    ┌───┴───────────────┐
    ▼                   ▼
 ┌────────────┐   ┌────────────┐
 │  COMPLETED │   │  NO_SHOW   │  (terminal)
 └────────────┘   └────────────┘
```

- `PENDING` → `CONFIRMED | CANCELLED`
- `CONFIRMED` → `COMPLETED | NO_SHOW | CANCELLED`
- `COMPLETED` / `NO_SHOW` require `new.scheduled_at <= now()` (the session
  must have started).
- `COMPLETED`, `CANCELLED`, `NO_SHOW` are terminal — no restoration.

The trigger applies the same machine to members, coaches, admins and
service-role callers. Members additionally may only write `CANCELLED` on their
own booking that is `PENDING`/`CONFIRMED` and still in the future.

### Invariants enforced by the trigger

| Invariant | Enforced for |
| --- | --- |
| `member_id` / `session_id` immutable | everyone |
| `coach_id` reassignment only by admin | coaches/members blocked |
| status change (any) requires a legal transition | everyone |
| COMPLETED / NO_SHOW only after `scheduled_at` | everyone (staff path) |
| detail edits (`scheduled_at`, `notes`) only by staff | members blocked |

Violations raise `42501` so the app can map them to friendly messages.

## 3. Authorization

Three layers, each independent; the database is the final boundary.

1. **UI** — `canTransitionBooking()` (pure helper, server-side) decides which
   action buttons render; destructive actions (cancel/no-show) require a
   two-step confirmation.
2. **Server action** (`lib/actions/admin-bookings.ts`) — `getCurrentUser()`
   then role check (`ADMIN`/`COACH`), then coach ownership
   (`booking.coach_id === user.id` unless admin), then the business/time rules.
3. **Database** — RLS scopes the row:
   `member_id = auth.uid() or coach_id = auth.uid() or is_admin()`. A coach can
   therefore only reach their own bookings; the trigger enforces the machine
   regardless of which role reached the row.

`is_admin()` is a SECURITY DEFINER helper so RLS/triggers can distinguish ADMIN
from COACH.

## 4. Concurrency

Read-then-write is replaced by an atomic transition:

```sql
update public.bookings
set status = 'CONFIRMED'
where id = :bookingId
  and status = 'PENDING';   -- the status we computed the action from
```

The affected-row count is the source of truth: `0` means the booking was
changed concurrently (e.g. another staff member completed it), and the caller
reports a stale-conflict message instead of overwriting newer state. Both
`updateBookingStatus` (staff) and `cancelBooking` (member) use this pattern.

## 5. Notifications

`notify_on_booking_status_change()` (AFTER UPDATE, SECURITY DEFINER) fires only
when the status actually changed:

| Transition | Recipient | Title |
| --- | --- | --- |
| → CONFIRMED | member | "Booking confirmed" |
| → CANCELLED | member + coach (unless the coach cancelled it themselves) | "Booking cancelled" |
| → COMPLETED | member | "Session completed" |
| → NO_SHOW | member | "No-show" |

Notifications remain a read-only surface: inserts are staff-only via RLS, so
only the triggers can create them.

## 6. Admin UI

- `/admin/bookings` — filters (status, date range, free-text member search) are
  stored in the URL (`searchParams`) so views are shareable and server-side
  filtered; pagination preserves filters. Desktop renders a table; mobile
  renders stacked cards — never a squeezed table.
- `/admin/bookings/[id]` — Booking / Member / Session / Coach sections plus a
  state-dependent action panel (Confirm / Cancel / Complete / No show).
- `/admin` — metrics (pending, confirmed upcoming, today, completed, cancelled,
  no-show), recent bookings, notifications preview, unread messages. All
  queries are coach-scoped unless the user is an admin.
- Every route has `loading.tsx` skeletons and the admin area has `error.tsx`.

## 7. Data layer

`lib/supabase/queries.ts` (server-only):

- `getAdminBookings(filters)` — pagination, status/date filters, member search
  (bounded ilike on `profiles`), coach scoping.
- `getAdminBookingById(id)` — full detail with member/session/coach relations.
- `getBookingManagementStats()` — six indexed head-count metrics.
- `canTransitionBooking(status, action, scheduledAt)` — pure display helper.
- `getCurrentUserNotifications(limit)` / `getMemberNotifications` alias.

`lib/actions/admin-bookings.ts` / `lib/validations/admin-bookings.ts` — one
zod-validated server action per transition with role + ownership + atomicity.

## 8. Timezone strategy

- DB stores `timestamptz` (UTC).
- Member booking form uses `datetime-local` → converted to ISO UTC on submit.
- Display is browser-local via `formatDate`.
- "Today" metrics use server-local day boundaries; COMPLETED/NO_SHOW compare
  `scheduled_at <= now()` in the DB (single time authority).

## 9. Tests

`supabase/tests/coach_booking_management.sql` — transactional (rolls back),
16 cases:

1. anon cannot read bookings/notifications
2. member can read own booking
3. member cannot read another member's booking
4. member cannot confirm
5. member cannot complete
6. member cannot mark NO_SHOW
7. member cancel only when rules permit
8. coach confirms an authorized booking
9. coach cannot manage another coach's booking
10. admin can manage any booking (incl. cross-coach)
11. invalid transitions fail
12. completed cannot be cancelled
13. no-show cannot be confirmed
14. confirmation generates the correct notification
15. cancellation generates the correct notification
16. concurrent/stale transition cannot overwrite newer state

Run after `supabase db reset --local` (Docker required):

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/tests/coach_booking_management.sql
```

The suite connects as `postgres` and impersonates the `anon`/`authenticated`
roles via `SET ROLE` so RLS is genuinely exercised; `auth.uid()` is simulated
with `request.jwt.claims`.

## 10. Migration

`supabase/migrations/20260818000000_booking_lifecycle.sql` is additive and
changes no tables, columns or enums, so the generated Database types stay
valid (no `db:types` regeneration needed). Remote push is a separate,
reviewed step (Prompt #4 §38).
