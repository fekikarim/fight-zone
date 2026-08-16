# Fight Zone — Foundation & Authentication Setup

Walkthrough of the Supabase foundation, the authentication/authorization
architecture, and how everything wires together.

## 1. Database schema

Applied via versioned migrations in `supabase/migrations/`:

| Migration | Contents |
| --- | --- |
| `20260815000000_enums.sql` | `user_role` (ADMIN/COACH/MEMBER), `gender`, `skill_level`, `achievement_type`, `media_type`, `event_type`, `session_type`, `booking_status`, `payment_status`, `payment_method`, `participation_status`, `message_status`, `notification_type` |
| `20260815000100_identity_and_profiles.sql` | `profiles`, `roles`, `user_role_assignments`, `member_profiles`, `coach_profiles`, updated-at triggers, `handle_new_user()` trigger (auto-creates profile + MEMBER role on signup) |
| `20260815000200_coaching.sql` | `sessions`, `bookings`, `payments` (reserved) |
| `20260815000300_content.sql` | `achievements`, `events`, `event_participants`, `news`, `media` + junction tables |
| `20260815000400_communication.sql` | `contact_messages` (anon INSERT allowed, default status `UNREAD`), `notifications`, `files` |
| `20260815000500_rls.sql` | Row Level Security on every table + grants |
| `20260815000600_storage.sql` | Storage buckets + RLS policies |
| `20260815000700_public_helpers.sql` | `get_public_coach()` security-definer function |
| `20260816000000_auth_hardening.sql` | **Prompt #2 fix:** `coach_profiles` INSERT/UPDATE restricted to ADMIN/COACH (was open to any authenticated user) |
| `20260817000000_member_booking_rules.sql` | **Prompt #3:** duplicate-active-booking prevention (partial unique index), member-initiated booking status enforcement (only CANCELLED for an active future booking), SECURITY DEFINER triggers that create coach/member notifications on booking lifecycle events |
| `20260818000000_booking_lifecycle.sql` | **Prompt #4:** DB-authoritative booking state machine (`enforce_booking_transition` trigger for every role), coach-ownership RLS (`coach_id = auth.uid()` for COACH, admin-wide, member-own), lifecycle notifications (`notify_on_booking_status_change`), `is_admin()` helper, admin list composite indexes |

## 2. Role model

Roles are a single source of truth:

```
User (auth.users.id)
   └── user_role_assignments  (user_id, role_id)
         └── roles (name: MEMBER | COACH | ADMIN)
```

- **MEMBER** — registered member: own profile, own bookings, own event
  participation, own notifications.
- **COACH** — staff access to `/admin`: manage sessions, bookings, content,
  messages, gallery, news.
- **ADMIN** — full platform management (everything COACH can, plus role and
  profile administration).

Roles are **database-backed only**. There is no client-side, metadata, JWT, or
localStorage role. Public signup always results in `MEMBER`; the signup form
does not accept a role field and the server never reads one. ADMIN/COACH are
only granted through a trusted administrative mechanism (service-role/admin
action).

## 3. Row Level Security

RLS is the final security boundary and works independently of the UI.

- **Public reads (anon):** `sessions` (active), `achievements`, `events`
  (public), `news` (published), `media` (public), `coach_profiles`. The
  marketing site needs no session.
- **Anonymous writes:** only `contact_messages` INSERT (contact form).
  Anonymous SELECT returns `[]` (policy filters everything), UPDATE/DELETE are
  denied.
- **MEMBER:** own `profiles`/`member_profiles`/`bookings`/`notifications`/
  `event_participants` rows only — always `auth.uid() = owner_id`. A member
  cannot read or modify another member's rows (IDOR-safe), cannot insert a
  booking with a foreign `member_id`, and cannot assign themselves (or anyone)
  a COACH/ADMIN role.
- **COACH/ADMIN:** read all profiles, manage sessions/bookings/content/
  messages/gallery/news/roles. `coach_profiles` INSERT/UPDATE is staff-only so
  a member cannot self-promote into a "coach" persona.
- **Ownership check:** `auth.uid()` is compared against the resource owner in
  every private-table policy. `member_id`/`user_id` from the browser are never
  trusted; RLS and server actions both enforce the current user.

Verification: `supabase/tests/auth_rls_verification.sql` (local, transactional,
rolls back) + anonymous REST checks against the remote project (public 200,
private 401 / filtered-empty).

## 4. Clients

- `lib/supabase/client.ts` — browser client (`createBrowserClient<Database>`).
- `lib/supabase/server.ts` — server client (`createServerClient<Database>`),
  reads cookies via `next/headers`; used by server components/actions.
- `lib/supabase/config.ts` — validates env vars and exposes `getSiteUrl()`.
  Returns narrowed `string`s because TypeScript drops control-flow narrowing
  of captured module consts during generic inference.
- `proxy.ts` + `lib/supabase/proxy.ts` — Next.js 16 replacement for
  `middleware.ts`: refreshes the Supabase session on matched routes and
  forwards cookie updates. It performs **no authorization** — routing/UX only.

## 5. Authentication flows

Server actions in `lib/actions/auth.ts`:

| Flow | Action | Behavior |
| --- | --- | --- |
| Sign in | `signIn` | zod validation → `signInWithPassword` → generic failure message ("Invalid email or password.") → redirect `/member`. No user enumeration. |
| Sign up | `signUp` | zod validation → `signUp` (no role from client, always MEMBER via trigger) → `emailRedirectTo` = `/auth/callback` → redirect `/member` when a session exists, otherwise transition straight to `/verify-email?email=…` (never a message on the form). |
| Verify email | `checkEmailVerification` + `/verify-email` | "I've verified my email" re-reads the authoritative Supabase session/`email_confirmed_at`; verified → redirect `/member`, else stays on the gate with an explanation. No client-side flag can bypass it. |
| Resend verification | `resendVerificationEmail` | generic outcome (never reveals whether an email is registered); Supabase email frequency + rate limits are the backstop; UI enforces a 60s cooldown. |
| Auth callback | `/auth/callback` | receives the PKCE code / implicit-grant tokens from the email link, exchanges them with Supabase Auth, persists the session via cookies, then redirects to the app (or `/reset-password` for recovery links). Expired/invalid links get a recovery UI. |
| Sign out | `signOut` | `auth.signOut()` → revalidate → redirect `/`. |
| Forgot password | `forgotPassword` | always returns success (no email enumeration); reset link uses `getSiteUrl()` — never the request `Origin` header (prevents reset-link code harvesting). |
| Reset | `exchangeRecoveryCode` + `updatePassword` | page reads async `searchParams.code`, exchanges it for a session, then updates the password only when a valid session exists. |

### Email verification flow (signup gate)

```
Signup → account created → redirect /verify-email
   → click email link → /auth/callback exchanges the code → session → /member
   → "I've verified my email" (if needed) → authoritative check → enter app
```

- Requires `enable_confirmations = true` (done in `supabase/config.toml`). Until
  the email is confirmed, Supabase issues **no session** — an unverified user is
  never an authenticated user, so `requireUser` and RLS are naturally safe.
  `requireUser` additionally treats a hypothetical session with
  `emailConfirmedAt == null` as restricted and sends it back to the gate.
- Cross-tab coherence works because the session lives in shared cookies: a
  confirmation completed in one tab is visible to the others.
- **Remote project:** also toggle *Auth → Providers → Email → Confirm email* in
  the Supabase dashboard, or signup will auto-confirm and skip the gate.

Anti-enumeration: sign-in, sign-up and forgot-password return generic
messages and never leak whether an email exists. Raw Supabase/Postgres errors
are converted to safe messages via `lib/errors.ts` (see `toAppError`).

## 6. Authorization guards

`lib/auth/guards.ts` (server-only, memoized per request with React `cache`):

- `getCurrentUser()` — resolves the server session to a profile + DB roles, or
  `null`. Memoized so layouts/pages/actions share one resolution.
- `getCurrentUserContext()` — `getCurrentUser` + `memberProfile` +
  `coachProfile` in a single `Promise.all` (RLS-scoped) for pages/actions that
  need role-specific data.
- `requireUser()` — redirects to `/sign-in` when signed out; redirects an
  authenticated-but-unverified user to `/verify-email` (restricted state).
- `requireRole([...])` — redirects to `/sign-in` when signed out, throws
  `ForbiddenError` (403) on role mismatch.
- `assertAuthenticated()` — throws instead of redirecting (server actions).
- `hasRole(user, role)` — helper for UI decisions (UX only, never security).

Guards derive identity exclusively from the trusted Supabase server session.
They never trust query parameters, request-body IDs, app-created cookies,
localStorage, or client-side role state. Email verification is the same way:
`getCurrentUser()` exposes `emailConfirmedAt` straight from Supabase Auth —
never a client-side flag.

## 7. Route protection

| Route | Anonymous | Unverified auth | MEMBER | COACH | ADMIN |
| --- | --- | --- | --- | --- | --- |
| `/` … `/contact`, `/news/[slug]` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/sign-in`, `/sign-up` | ✅ | ➜ gate | ➜ `/member` | ➜ `/member` | ➜ `/member` |
| `/verify-email`, `/forgot-password`, `/reset-password` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/auth/callback` | ✅ (completes exchange) | ✅ | ✅ | ✅ | ✅ |
| `/member` | ➜ `/sign-in` | ➜ `/verify-email` | ✅ | ✅ | ✅ |
| `/member/sessions`, `/member/sessions/[id]` | ➜ `/sign-in` | ➜ `/verify-email` | ✅ | ✅ | ✅ |
| `/member/bookings`, `/member/bookings/[id]` | ➜ `/sign-in` | ➜ `/verify-email` | ✅ | ✅ | ✅ |
| `/member/profile` | ➜ `/sign-in` | ➜ `/verify-email` | ✅ | ✅ | ✅ |
| `/admin` | ➜ `/sign-in` | ➜ `/verify-email` | 403 forbidden | ✅ | ✅ |

Enforcement is server-side (layout guards) plus RLS. Hiding a navigation link
is UX only and never a security control.

## 8. Session management

Standard Supabase cookie-based SSR: the session lives in httpOnly cookies set
by `@supabase/ssr`; `proxy.ts` refreshes it on matched routes; the server
client resolves the user via `auth.getUser()` (never trusts a locally-stored
token). No auth tokens are stored in localStorage/sessionStorage.

## 9. Security hardening (Prompt #2 findings)

1. **`coach_profiles` self-promotion (fixed).** The INSERT/UPDATE policies used
   `id = auth.uid()`, so any member could create/update a coach profile for
   themselves. Now staff-only (`is_admin_or_coach()`).
2. **Reset-link open redirect (fixed).** `forgotPassword` derived the email
   redirect target from the request `Origin` header. Now uses the configured
   `NEXT_PUBLIC_SITE_URL` via `getSiteUrl()`.
3. **Sign-up confirmation link (fixed).** `signUp` now sets `emailRedirectTo`
   to the canonical site URL.
4. **Contact ownership (improved).** Signed-in members' contact messages now
   record their `member_id`, so they can later see their own threads.
5. **Repeated auth resolution (fixed).** `getCurrentUser` is memoized per
   request; added `getCurrentUserContext()` for role-specific data.
6. **Auth-page session confusion (improved).** Signed-in users are redirected
   away from `/sign-in` and `/sign-up`.
7. **Auth form UX/a11y (improved).** Password show/hide, sign-out pending
   state (no duplicate submissions), `aria-describedby` + `role="alert"`.

## 10. Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # no trailing slash; used for auth email links
```

## 11. Local testing

```bash
npm run db:start     # supabase start (requires Docker)
npm run db:reset     # supabase db reset --local (migrations + seed)
npm run lint
npm run build
psql "$SUPABASE_DB_URL" -f supabase/tests/auth_rls_verification.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/member_platform_rls.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/coach_booking_management.sql
```

The RLS suites simulate `anon` / `authenticated` contexts via
`request.jwt.claims`. `auth_rls_verification.sql` asserts the Prompt #2 matrix
(IDOR, role escalation, contact-message rules, coach self-promotion);
`member_platform_rls.sql` asserts the Prompt #3 matrix (booking ownership,
duplicate-prevention, status-transition enforcement, notification triggers);
`coach_booking_management.sql` asserts the Prompt #4 matrix (coach-ownership
RLS, DB state machine, invalid/terminal transitions, lifecycle notifications,
concurrent/stale-write protection). All roll back, so they are safe to run
repeatedly. Local demo users (`coach@fightzone.example`,
`member@fightzone.example`) exist only in the local seed.

To exercise the signup → verification gate → callback flow locally, start
Supabase (Docker), open the local email test UI (port 54324) to read the
confirmation link, and click it from the same browser.

## 12. Security assumptions

- Supabase Auth is the only authentication authority; passwords are never
  handled outside Supabase.
- Email verification is an authentication boundary: status is read from
  Supabase Auth (`email_confirmed_at`), never from a client-side flag.
- The frontend is not a security boundary — every sensitive server action and
  route handler performs its own auth/authz, and RLS enforces at the database.
- Rate limiting on auth/contact endpoints is deferred (later production
  hardening phase); email resend relies on Supabase's frequency/rate limits.
- The remote project intentionally has no seed users; real accounts are
  created through a controlled production setup.

## 13. Member platform & booking workflow (Prompt #3)

### Routes (`app/member/`, all under the `requireUser` layout)

| Route | Purpose |
| --- | --- |
| `/member` | Dashboard: booking stats, recent bookings, read-only notifications preview, profile-completion CTA |
| `/member/sessions` | Active session catalog (grid) |
| `/member/sessions/[id]` | Session detail + personalized booking request form (datetime-local + notes) |
| `/member/bookings` | Member's own bookings with inline cancel where allowed |
| `/member/bookings/[id]` | Full booking detail (status explanation, session, coach, notes, cancel) |
| `/member/profile` | Personal info + `member_profiles` extension (upserted on save) |

Every route has a `loading.tsx` skeleton; detail routes 404 via `NotFoundError`.

### Server actions (`lib/actions/member.ts`)

- `updateMemberProfile` — zod-validated; updates `profiles` (full_name, phone)
  and **upserts** `member_profiles` (created on first save — signup only creates
  `profiles` + MEMBER role).
- `createBooking` — validates a future `datetime-local`, loads the active
  session server-side, ensures the member's `member_profiles` row exists,
  then inserts a booking with `member_id = auth.uid()`, `coach_id` from the
  session, and `status` always server-assigned as `PENDING`. Duplicate active
  requests hit the DB partial-unique index → friendly message. Redirects to
  `/member/bookings`.
- `cancelBooking` — loads the member's own booking (RLS-scoped), allows only
  `PENDING`/`CONFIRMED` + future `scheduled_at`, sets `CANCELLED`.

Ownership is always derived from the session — `member_id`/`status` from the
browser are never trusted. The same rules are enforced again by the database.

### Booking domain rules

- New bookings are always `PENDING` (DB default + server-set).
- Members may only **cancel** their own active future booking. The DB trigger
  `bookings_enforce_member_transition` rejects any other member-initiated status
  change (e.g. self-confirming/self-completing) with `42501` — the RLS update
  policy alone cannot restrict *which* status a member writes.
- Confirmation/completion/no-show transitions belong to COACH/ADMIN (Prompt #4).
- Duplicate active booking prevention: partial unique index on
  `(member_id, session_id, scheduled_at)` for `PENDING`/`CONFIRMED`.

### Notifications foundation

`notifications` is a read-only surface for members (own rows only, unread
first). Inserts are staff-only via RLS, so automatic lifecycle notifications
are created by SECURITY DEFINER triggers (bypass RLS, never client input):

- booking created → coach ("New booking request") + member ("Booking request received")
- booking cancelled → coach ("Booking cancelled")

### Data layer (`lib/supabase/queries.ts`)

`getSessionById`, `getBookingById`, richer `getCurrentUserBookings`,
`getMemberProfileData`, `getMemberNotifications`, `getMemberBookingStats`, and
`isBookingCancellable` (pure display helper; the action re-checks authoritatively).

### Prompt #3 security notes

1. **Status is authoritative state.** Members can only ever write `CANCELLED`
   on their own active future booking — enforced by the DB trigger, not just
   the UI (the RLS UPDATE policy is otherwise permissive on own rows).
2. **No IDOR on bookings.** `member_id` is always `auth.uid()` server-side; RLS
   also filters reads/writes; the test suite asserts a member cannot read,
   write, or cancel another member's booking.
3. **Notification integrity.** Members cannot forge notifications for
   themselves or others (`notifications_insert_staff`); lifecycle
   notifications are created only by the security-definer triggers.
4. **Duplicate bookings** are rejected at the database (unique index), not
   just by the form.

## 14. Coach/Admin booking management (Prompt #4)

The booking lifecycle is authoritative at the database level. Migration
`20260818000000_booking_lifecycle.sql`:

- **Coach-ownership RLS.** `bookings` SELECT/UPDATE now use
  `member_id = auth.uid() or coach_id = auth.uid() or is_admin()` — a COACH
  sees and manages only the bookings assigned to them (`coach_id =
  auth.uid()`), an ADMIN manages everything, a MEMBER sees only their own.
- **State machine trigger** `enforce_booking_transition()` (replaces the
  Prompt #3 member-only trigger) enforces, for **every** role:
  `PENDING → CONFIRMED | CANCELLED`, `CONFIRMED → COMPLETED | NO_SHOW |
  CANCELLED` (COMPLETED/NO_SHOW only after `scheduled_at`), terminal states
  are immutable, `member_id`/`session_id` are immutable for everyone,
  `coach_id` reassignment is admin-only, and members can only cancel their own
  active future booking. Violations raise `42501`.
- **Lifecycle notifications** `notify_on_booking_status_change()` (replaces the
  old cancel trigger): member is notified on CONFIRMED/CANCELLED/COMPLETED/
  NO_SHOW; the coach is notified on CANCELLED unless they cancelled it
  themselves.
- **Admin list indexes** `(coach_id, status, scheduled_at)` and
  `(member_id, scheduled_at)`.

### Admin routes (`app/admin/`, under the `requireRole(["ADMIN","COACH"])` layout)

| Route | Purpose |
| --- | --- |
| `/admin` | Dashboard: booking metrics (pending/upcoming/today/completed/cancelled/no-show), recent bookings, notifications preview, unread messages |
| `/admin/bookings` | Manage bookings: URL-driven filters (status, date range, member search), responsive table/cards, pagination |
| `/admin/bookings/[id]` | Full booking detail (booking/member/session/coach) + state-dependent action panel |

### Server action (`lib/actions/admin-bookings.ts`)

`updateBookingStatus` validates via zod, checks ADMIN/COACH role, enforces
coach ownership (`coach_id === user.id` unless admin), re-checks the business
rules, then performs an **atomic** transition: `UPDATE ... WHERE id = ?
AND status = <read>`; an affected-row count of 0 means a concurrent staff
member changed the booking first (stale conflict reported instead of
overwriting state). `42501` from the DB trigger is mapped to a friendly
message. `lib/actions/member.ts` `cancelBooking` uses the same atomic guard.

### Test suite

`supabase/tests/coach_booking_management.sql` covers the 16 Prompt #4 cases
(anonymous isolation, member/coach/admin matrix, coach-ownership, invalid and
terminal transitions, notification generation, concurrent stale writes).
See `docs/booking-management.md` for the full design and run instructions.
