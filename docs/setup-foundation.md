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
| Sign up | `signUp` | zod validation → `signUp` (no role from client, always MEMBER via trigger) → `emailRedirectTo` set → redirect `/member` if a session exists, otherwise "check your email". |
| Sign out | `signOut` | `auth.signOut()` → revalidate → redirect `/`. |
| Forgot password | `forgotPassword` | always returns success (no email enumeration); reset link uses `getSiteUrl()` — never the request `Origin` header (prevents reset-link code harvesting). |
| Reset | `exchangeRecoveryCode` + `updatePassword` | page reads async `searchParams.code`, exchanges it for a session, then updates the password only when a valid session exists. |

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
- `requireUser()` — redirects to `/sign-in` when signed out.
- `requireRole([...])` — redirects to `/sign-in` when signed out, throws
  `ForbiddenError` (403) on role mismatch.
- `assertAuthenticated()` — throws instead of redirecting (server actions).
- `hasRole(user, role)` — helper for UI decisions (UX only, never security).

Guards derive identity exclusively from the trusted Supabase server session.
They never trust query parameters, request-body IDs, app-created cookies,
localStorage, or client-side role state.

## 7. Route protection

| Route | Anonymous | MEMBER | COACH | ADMIN |
| --- | --- | --- | --- | --- |
| `/` … `/contact`, `/news/[slug]` | ✅ | ✅ | ✅ | ✅ |
| `/sign-in`, `/sign-up` | ✅ | ➜ `/member` (server-side) | ➜ `/member` | ➜ `/member` |
| `/forgot-password`, `/reset-password` | ✅ | ✅ | ✅ | ✅ |
| `/member` | ➜ `/sign-in` | ✅ | ✅ | ✅ |
| `/admin` | ➜ `/sign-in` | 403 forbidden | ✅ | ✅ |

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
```

The RLS suite simulates `anon` / `authenticated` contexts via
`request.jwt.claims` and asserts the Prompt #2 matrix (IDOR, role escalation,
contact-message rules, coach self-promotion). It rolls back, so it is safe to
run repeatedly. Local demo users (`coach@fightzone.example`,
`member@fightzone.example`) exist only in the local seed.

## 12. Security assumptions

- Supabase Auth is the only authentication authority; passwords are never
  handled outside Supabase.
- The frontend is not a security boundary — every sensitive server action and
  route handler performs its own auth/authz, and RLS enforces at the database.
- Rate limiting on auth/contact endpoints is deferred (later production
  hardening phase).
- The remote project intentionally has no seed users; real accounts are
  created through a controlled production setup.
