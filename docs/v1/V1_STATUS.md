# Fight Zone V1 — Implementation status

> Living document. Only evidenced items are marked done. Last update: 2026-11-18.

## Environment rule
The V1 code requires the V1 migrations (`supabase/migrations/20261118*`). They are **applied only to
the local Supabase stack**, NOT to production. **Do not push/deploy V1 code before the owner approves
`supabase db push`** (see `RELEASE_CHECKLIST.md`) — the deployed site would query columns that don't
exist yet.

Local run: `supabase start` → `npm run test:db` → `sh scripts/dev-local-db.sh` (port 3100, local DB,
e-mail disabled).

## Phase status

| Phase | Item | Status | Evidence |
|---|---|---|---|
| 0 | Audit + plan | ✅ | `V1_AUDIT_AND_PLAN.md` |
| 1 | Enums, core (audit log, notify dedupe, settings, templates) | ✅ | migrations 000000/000100 |
| 1 | Messaging model (single conversation w/ Seif, SYSTEM kind, attachments, idempotency) | ✅ DB | migration 000200 |
| 1 | Events lifecycle, registration/payment/attendance separation, RPCs, invitations, payment proofs, income ledger | ✅ DB | migration 000300 |
| 1 | Attendance → badges → rewards (idempotent, reconciled, atomic redemption, liability) | ✅ DB | migration 000400 |
| 1 | CMS pages + revisions, FAQ, legal versions, contact rate-limit, storage hardening, avatars | ✅ DB | migration 000500 |
| 1 | SQL security/workflow suite | ✅ 95/95 | `tests/sql/v1_security_workflows.sql` |
| 1 | Concurrent last-seat race | ✅ 20/20 | `tests/sql/v1_race.sh` |
| 2 | Event queries/actions on V1 model | ✅ | `lib/events/queries.ts`, `lib/actions/events.ts` |
| 2 | Event form: category, tags, requirements, window, approval, waitlist, deadline, draft/publish | ✅ | `event-form-fields.tsx` |
| 2 | Admin event page: lifecycle (publish/unpublish/cancel/archive/duplicate/delete-draft), registrations desk, attendance, invitations | ✅ | `app/admin/events/[id]` |
| 2 | Member events (tabs) + registration/payment panel + proof upload (private bucket) | ✅ UI-verified | local E2E 2026-11-18 |
| 2 | Admin payment review queue + signed proof viewer | ✅ UI-verified | `/admin/payments`, `/api/payment-proofs/[id]` |
| 3 | Messaging: member single thread w/ Seif, admin inbox (search, unread-first, new conversation), SYSTEM labels, private attachments (signed URLs), read receipts, realtime + 20 s polling fallback, older-page pagination | ✅ UI-verified (admin send) | `components/messages/message-thread.tsx` |
| 4 | Settings: manual-payment instructions, contact/social, editable automatic-message templates (essential ones locked on) | ✅ | `/admin/settings` |
| 4 | Admin dashboard (period selector, attention queue, KPI drill-downs, recent audit activity) from `get_admin_dashboard` RPC | ✅ | `/admin`, migration 000600 |
| 4 | Reports: per-event utilization + income ledger (confirmed receipts only) + CSV exports (staff-only, formula-injection safe) | ✅ | `/admin/reports`, `/api/reports/*` |
| 4 | Members: search/paginate, detail (history, payments, attendance, badges, rewards), message, (de)activate (audited) | ✅ | `/admin/members` |
| 4 | Badges & rewards: definitions CRUD, impact preview, liability, approve/revoke/apply (atomic RPCs) | ✅ | `/admin/badges` |
| 5 | About block editor + revisions (UI-verified publish → public render), FAQ, contact inbox (+topic, honeypot, rate limit), versioned Privacy/Terms, public event filters, sitemap/robots, settings-driven footer/contact | ✅ | `/admin/content/*`, `/faq`, `/privacy`, `/terms` |
| 6 | Member dashboard (real data), avatar upload, achievements gallery, rewards | ✅ | `/member`, `/member/profile` |
| 7 | Responsive check 375 px (7 pages, no overflow) | ✅ partial | manual |
| 8 | Gates: tsc 0, eslint 0, npm test 104/104, test:db 95/95 + race 20/20, next build ✅ | ✅ | `V1_REPORT.md` |
| — | News newsroom upgrades, calendar filters/prefill, attendee CSV, notification prefs, home redesign | ❌ not done | `V1_REPORT.md` §6 |

## Verified end-to-end (local DB, real UI)
1. Member registers for a paid event → CONFIRMED / UNPAID, amount snapshot 30.000 TND.
2. Member uploads a PNG receipt → private object `<uid>/payments/…`, status "Proof received — awaiting review".
3. Seif sees it in `/admin/payments` (nav badge 1), opens the proof via a 60 s signed URL, confirms.
4. Registration → PAID, exactly one `payments` ledger row, audit `payment.confirm`, 4 idempotent
   Fight Zone system messages in the member's conversation.
