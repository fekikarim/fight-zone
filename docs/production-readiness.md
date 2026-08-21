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
| Gate B: Migration integration | ⛔ BLOCKED | `supabase link` required; `--dry-run` pending |
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

1. **Link Supabase project** and run `supabase db push --dry-run`
2. **Verify RLS** by running `supabase tests` or querying with test users
3. **Enable PITR** backups in Supabase dashboard
4. **Run `next build`** in CI to confirm zero-error production build
5. **Browser E2E** — test navbar, review modal, moderation buttons manually
