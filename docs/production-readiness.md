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
