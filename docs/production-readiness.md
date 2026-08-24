# Fight Zone — Production Readiness Report (Prompt #12)

## Scope

Hardening pass over the full Fight Zone codebase. All code changes are
statically verified (`tsc --noEmit`, `next build`). Runtime/remote verification
is blocked until Supabase project is linked and Docker is available locally.

## Summary

| Category | Fixed | Verified | Blocked | N/A |
|----------|-------|----------|---------|-----|
| Authorization defects | 3 | 3 (source-verified) | 0 | 0 |
| Notification scoping | 2 | 2 (source-verified) | 0 | 0 |
| Dead links | 2 | 2 (source-verified) | 0 | 0 |
| Query wildcards | 5 | 5 (source-verified) | 0 | 0 |
| RLS policy defects | 6 | 0 | 1 (remote verify) | 0 |
| Bug fixes | 3 | 3 (source-verified) | 0 | 0 |
| Error boundaries | 3 | 3 | 0 | 0 |
| Loading states | 7 | 7 | 0 | 0 |
| Accessibility | 6 | 0 | 1 (browser E2E) | 0 |
| Documentation | 2 | 2 | 0 | 0 |

## Gate status

| Gate | Status | Notes |
|------|--------|-------|
| Gate A: Auth guards | ✅ VERIFIED | `requireRole` on all event mutations, notification queries scoped |
| Gate B: Migration integration | ✅ VERIFIED | Project linked, all migrations pushed; grants + public views deployed |
| Gate C: Query wildcards | ✅ VERIFIED | All 5 wildcard projections replaced |
| Gate D: Error boundaries | ✅ VERIFIED | Member boundary added, existing boundaries log errors |
| Gate E: Loading states | ✅ VERIFIED | 7 new skeletons created |
| Gate F: Accessibility | 🟡 PARTIAL | Navbar/modal/button fixes applied; browser E2E not possible |
| Gate G: Documentation | ✅ VERIFIED | §22 added to setup-foundation.md, production-readiness.md created |
| Gate H: Build verification | ✅ VERIFIED | `tsc --noEmit` clean, `next build` clean (62 routes) |
| Gate I: Backup/recovery | ⛔ BLOCKED | Cannot verify Supabase backup/PITR without remote access |
| Gate J: Browser E2E | ⛔ BLOCKED | No Playwright/Puppeteer configured |

## Files modified

### Authorization fixes
- `lib/actions/events.ts` — `requireRole(["ADMIN","COACH"])` on createEvent, updateEvent, updateParticipantStatus
- `lib/actions/notifications.ts` — `.eq("user_id", user.id)` on both UPDATE queries
- `components/marketing/navbar.tsx` — `/member/dashboard` → `/member`

### Query hardening
- `lib/supabase/queries.ts` — 5 wildcard projections replaced with explicit columns

### Corrective migration
- `supabase/migrations/20260827000000_rls_hardening.sql` — DROP 3 unsafe policies, CREATE 3 scoped policies

### Bug fixes
- `app/(marketing)/events/[id]/page.tsx` — dead link `/auth/login` → `/sign-in`
- `app/(marketing)/news/[slug]/page.tsx` — NotFoundError handling in generateMetadata
- `supabase/tests/reviews_rls.sql` — table name typo fixed

### Error boundaries
- `app/member/error.tsx` — NEW
- `app/error.tsx` — added error logging
- `app/global-error.tsx` — added error logging

### Loading states
- `app/(marketing)/loading.tsx` — NEW
- `app/(auth)/loading.tsx` — NEW
- `app/(marketing)/news/loading.tsx` — NEW
- `app/(marketing)/about/loading.tsx` — NEW
- `app/(marketing)/events/[id]/loading.tsx` — NEW
- `app/(marketing)/news/[slug]/loading.tsx` — NEW

### Accessibility
- `components/marketing/navbar.tsx` — aria-controls, aria-hidden, inert, aria-haspopup, aria-expanded, Escape key, outside-click
- `components/reviews/review-form-modal.tsx` — overflow scroll, Escape key
- `components/reviews/moderate-review-form.tsx` — min-h-10 min-w-10, aria-label
- `components/reviews/moderate-transformation-form.tsx` — min-h-10 min-w-10, aria-label

### Documentation
- `docs/setup-foundation.md` — §22 added
- `docs/production-readiness.md` — NEW

## Next steps

1. ~~**Link Supabase project** and run `supabase db push --dry-run`~~ ✅ DONE — project linked (`jdbythhwikqvqenxyuqw`), all migrations pushed and verified
2. **Verify RLS** by running `supabase tests` or querying with test users
3. **Enable PITR** backups in Supabase dashboard (requires dashboard access)
4. ~~**Run `next build`** in CI to confirm zero-error production build~~ ✅ DONE locally — re-run in CI
5. **Browser E2E** — test navbar, review modal, moderation buttons manually

## Post-verification remediation (runtime DB errors)

After the gates above, live smoke testing exposed production-breaking
PostgREST errors. Root causes found and permanently fixed:

### Root cause 1: missing Data-API grants (42501 permission denied)
Tables created in later migrations never received `GRANT` privileges for
the PostgREST roles (Supabase does not auto-grant). Every list query on
those tables failed at runtime.

**Fix**: `20260829000000_data_api_grants.sql` — SELECT to anon+authenticated
on public-read tables; DML to authenticated; ALL to service_role.

### Root cause 2: private profile embeds in public queries (42501)
Public marketing pages embedded author/coach identity via
`profiles(...)` / `member_profiles(profiles(...))`, but `profiles` RLS is
own-or-staff. Anon callers got hard permission errors.

**Fix**: definer-semantics views exposing only safe identity columns:
- `20260830000000_public_showcase_views.sql` — `approved_reviews_public`,
  `published_transformations_public`, `available_coaches_public` (anon+auth)
- `20260831000000_coach_directory_authenticated.sql` +
  `20260831000010_coach_views_updated_at.sql` —
  `coaches_directory_authenticated` (authenticated only), `updated_at`
  column alignment

### Code changes
- ~25 list queries in `lib/supabase/queries.ts` now degrade gracefully
  (log + empty/fallback) instead of crashing pages; detail-by-id queries
  intentionally still throw for correct 404 semantics
- Marketing/member queries repointed from raw tables to the safe views;
  view rows mapped back into the nested component-facing shapes so no UI
  components changed
- Dead `coach_profiles(profiles(...))` embed removed from member schedule
  (never consumed); messaging recipients resolve coach names through the
  authenticated directory view
- `lib/errors.ts` logging now surfaces real PostgREST message/code/hint
  server-side (was rendering `{}` due to non-enumerable Error props)
- Ghost migration repaired: stale remote entry `20260828000000`
  ("payments_rls_fix", file no longer present) reverted via
  `supabase migration repair`; grants migration renamed to avoid collision

### Verification results
- REST API as anon: plans (6 rows), transformations (2 published),
  reviews/coaches views return cleanly (empty = correct data state)
- `coaches_directory_authenticated` correctly denies anon (authenticated-only)
- All marketing routes HTTP 200 with graceful empty states
- `tsc --noEmit` clean, ESLint clean, `next build` clean (62 routes)

## Advisor remediation: SECURITY DEFINER views → RPC functions

Supabase Advisor flagged all four showcase views as CRITICAL
("Security Definer View"): Postgres views execute with the owner's
privileges and cannot scope the caller, unlike RLS-governed tables.

**Fix**: `20260831000020_replace_showcase_views_with_functions.sql`
- Dropped `approved_reviews_public`, `published_transformations_public`,
  `available_coaches_public`, `coaches_directory_authenticated`
- Replaced with SECURITY DEFINER SQL functions following the pre-existing
  `get_public_coach()` pattern — each with pinned `search_path`,
  per-call `statement_timeout`, in-body LIMIT caps, and explicit EXECUTE
  grants (PUBLIC/defaul revoked first):
  - `get_public_approved_reviews(p_limit, p_featured, p_coach_id, p_session_id)` — anon+authenticated
  - `get_public_transformations(p_limit, p_featured)` — anon+authenticated
  - `get_available_coaches(p_coach_id)` — anon+authenticated
  - `get_coaches_directory(p_coach_ids)` — **authenticated only**
- Tightened direct access: anon SELECT revoked on `reviews` and
  `transformation_stories` (anon must use the RPCs; members keep direct
  SELECT for their own pending/rejected reviews via RLS)
- `lib/supabase/queries.ts` call sites repointed from `.from(view)` to
  `.rpc(...)`; flat author columns still mapped into nested component
  shapes so no UI components changed

**Post-fix verification**
- `supabase db lint --linked --level error -s public` → **No schema errors found**
- RPCs verified live as anon: reviews `[]`, transformations 2 rows,
  coaches `[]`; directory RPC denies anon; direct table SELECT denied for anon
- All marketing routes HTTP 200 · tsc clean · ESLint clean · production build clean

---

# Security & Authorization Audit (Prompt #13)

## Scope

Full security gate: every Server Action, RLS policy/grant, SECURITY
DEFINER function, public RPC, storage policy and cache scope audited
against the **remote** database (`jdbythhwikqvqenxyuqw`). Executable,
rollback-safe tests were run against remote inside a single transaction
(`BEGIN … ROLLBACK` — production data untouched).

## Findings & disposition

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F1 | P0 | `reviews_owner_insert/update` policies allowed members to forge `status='APPROVED'` / `is_featured=true` via direct PostgREST writes | FIXED-IN-MIGRATION-PENDING-PUSH — guard triggers `guard_reviews_insert/update`; verified by tests T2/T4/T5 |
| F2 | P0 | `transformations_member_insert` allowed members to insert `is_published=true` stories → public showcase forgery | FIXED-IN-MIGRATION-PENDING-PUSH — guard trigger `guard_transformations_insert`; test T7 |
| F7 | P0 (operational) | Remote `roles` table was EMPTY (roles existed only in local seed.sql) → `is_admin()`/`has_role()` false for everyone; staff gates inert; signups assigned no MEMBER role | FIXED-IN-MIGRATION-PENDING-PUSH — canonical role seed + MEMBER backfill for existing users |
| F3 | P1 | `subscribeToPlan` Server Action was a live self-service checkout path (ACTIVE subscription + COMPLETED ONLINE payment) with zero UI callers; violates presentation-only product rule | FIXED-IN-CODE — action + schema removed; tsc clean |
| F4 | P2 | Member cancellation could mutate subscription terms (`remaining_credits`, dates, plan) alongside status/auto_renew | FIXED-IN-MIGRATION-PENDING-PUSH — guard trigger `guard_subscription_cancel`; tests T12/T13 |
| F5 | P2 | `service_role` lacked DML grants on most base tables | FIXED-IN-MIGRATION-PENDING-PUSH — baseline grants + default privileges |
| F6 | P2 (hygiene) | anon/authenticated held inert TRUNCATE/REFERENCES; PUBLIC EXECUTE on helper functions | FIXED-IN-MIGRATION-PENDING-PUSH — revoked; EXECUTE re-granted to anon+authenticated+service_role |
| F8 | P1 (app) | Profile self-update could set arbitrary `avatar_url`/`email`/`is_active` via direct API writes | FIXED-IN-MIGRATION-PENDING-PUSH — guard trigger `guard_profiles_self_update`; tests T8/T9/T10 |

## Verified-good (no change required)

- All 25 tables have RLS enabled; storage buckets correctly scoped
  (`fightzone-public` anon read/staff write, `fightzone-private` owner-or-staff)
- Bookings/events/participations enforced by DB triggers: ownership
  immutable, state machines, capacity/deadline checks (test T11)
- All SECURITY DEFINER functions pin `search_path=public`; public RPCs add
  `statement_timeout=5s` + in-body LIMIT caps; directory RPC is authenticated-only
- All 11 Server Action files: session-derived identity, `requireRole`,
  Zod validation, narrow column updates, safe error messages, revalidation
- No wildcard projections, no `any`/`@ts-ignore`, no service-role keys in
  app code, no unsafe redirects, no `dangerouslySetInnerHTML`, no empty catches
- React `cache()` scoping safe: identity derived inside each cached fn;
  admin queries gated by `resolveStaffScope()` with coach row-scoping

## Executable test results (remote, rollback-safe)

14/14 PASS — T1 anon table read denied · T2/T4 review moderation forgery
blocked · T5 staff approval works · T6 cross-member review isolated ·
T7 transformation publish forgery blocked · T8 profile sensitive-field
self-change blocked · T9 legitimate name/phone edit works · T10 cross-member
profile patch isolated · T11 booking ownership forgery blocked · T12/T13
cancel hygiene · T14 directory RPC denies anon · T15 public RPCs execute.
(Legitimate pending-review insert exercised implicitly by T4/T5/T6 fixtures.)

## Verification suite

- `npx tsc --noEmit` ✅ clean
- `npx eslint .` ✅ 0 errors (2 pre-existing warnings)
- `npm run build` ✅ compiled, 48/48 pages
- `supabase migration list` ✅ 25 synced; `20260901000000` local-only by design
- `supabase db push --dry-run` ✅ would push exactly the hardening migration
- `supabase db lint --linked --level error -s public` ✅ No schema errors found
- Route smoke: `/` `/coaches` `/events` `/news` `/contact` `/pricing` → HTTP 200

## Unverified / blocked

- Responsive pixel-check at 320/390/768/1280/1440px: UNVERIFIED (no browser
  E2E available). Static evidence: Tailwind breakpoints used throughout
  (sm×164, lg×126, md×18, xl×6) + exported viewport meta.
- Guard triggers/role seed take effect only after owner pushes
  `20260901000000_security_gate_hardening.sql` (NOT pushed — awaiting approval).
- Backup/PITR verification requires Supabase dashboard access.

## Recommendation

**READY FOR DATA-INTEGRITY AUDIT** — conditional on pushing
`20260901000000_security_gate_hardening.sql`. Until it is pushed, the P0
policy-forgery findings (F1/F2/F7) remain exploitable by any authenticated
user against the live project. After push: assign ADMIN to the owner account
via SQL or dashboard, then re-run `db lint`.
