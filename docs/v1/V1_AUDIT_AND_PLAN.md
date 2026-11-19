# Fight Zone V1 — Audit & Implementation Plan

> Source spec: `FIGHT_ZONE_V1_IMPLEMENTATION_BRIEF.md`. Audit date: 2026-11-18.
> Status of each item is tracked in `docs/v1/V1_STATUS.md`.

## 1. Audit of the actual V0 state

### Stack (verified)
Next.js 16.3 (App Router, Turbopack, `proxy.ts`), React 19.2, TypeScript strict, Tailwind 4,
Supabase (Postgres + Auth + Storage + Realtime) via `@supabase/ssr`, Zod 4, react-hook-form,
Resend email, Netlify deploy + scheduled functions, `sonner` toasts. Scripts: `dev`, `build`,
`lint`, `test` (tsx unit tests), `db:*` (Supabase CLI). No E2E runner configured.

### Migrations
36 local migrations; remote (`jdbythhwikqvqenxyuqw`) history is identical — nothing pending.
Local Supabase (`supabase start`) applies all 36 cleanly and is used to test V1 migrations.

### Production data (row counts)
events 4 · event_participants 1 · news 3 · notifications 2 · profiles 2 · conversations 0 ·
messages 0 · payments 0 · bookings 0 · subscriptions 0 · private storage objects 0.
→ Schema evolution is low-risk; one registration row must be backfilled.

### Roles
`user_role` enum `ADMIN, COACH, MEMBER`; `is_admin_or_coach()` is the RLS staff predicate.
Seif = the single ADMIN (+ coach profile). Single-coach model: "staff" == Seif. No second
authorization system is introduced.

### What works (keep)
- Auth (instant sign-up, no email verification by owner decision), role guards, RLS on all tables.
- Events CRUD, calendar (month/week/agenda + realtime), capacity lock trigger, re-join.
- News CRUD, media library, achievements, reviews moderation, notifications center.
- Email automation (reminders, daily report, idempotent `email_deliveries`).
- Daily AI motivation with key rotation + fallback.

### Defects / gaps found (V1-blocking)
| # | Finding | Severity |
|---|---------|----------|
| A1 | `events_select_authenticated` lets **any member read every private capacity-1 event** (title, time, location). | P0 security |
| A2 | `conversations` insert requires a `bookings` row — bookings are retired, so **members cannot start a conversation with Seif**. | P0 workflow |
| A3 | Private bucket lets owners **UPDATE/DELETE** their files → payment evidence can be swapped after submission. | P1 security |
| A4 | Registration + attendance collapsed in one `participation_status`; payment only `UNPAID/PAID/NOT_REQUIRED`; no proof workflow, no amount snapshot, no reviewer metadata. | P0 V1 model |
| A5 | No event lifecycle (draft/published/cancelled/archived), registration window, waitlist or approval mode. | P0 |
| A6 | No badges/rewards ledger, no audit log, no CMS (About/FAQ/legal), no site settings. | P0 (V1 scope) |
| A7 | Money is `numeric(10,2)`; TND uses millimes (3 decimals). | P2 |
| A8 | Notifications have no dedupe key; message notifications use sender name only. | P1 |
| A9 | Members can insert/update `event_participants` directly (guarded by triggers) — V1 moves all writes to RPCs. | P1 |

## 2. Status models (V1)

Separate columns/state machines — never one generic status.

| Lifecycle | Values | Owner |
|-----------|--------|-------|
| Event `status` | `DRAFT → PUBLISHED → (CANCELLED | ARCHIVED)`; derived display states: full, in progress, completed (from time + capacity) | Seif |
| Registration `registration_status` | `PENDING → CONFIRMED | WAITLISTED | REJECTED`; any active → `CANCELLED`; `WAITLISTED → CONFIRMED|PENDING` (promotion) | member requests, Seif decides |
| Payment `payment_status` | `NOT_REQUIRED` (free) · `UNPAID → PROOF_SUBMITTED → PAID | REJECTED(→PROOF_SUBMITTED)`; `UNPAID → PAID` (in-person, recorded by Seif) | member submits proof, Seif confirms |
| Attendance `attendance_status` | `UNMARKED → ATTENDED | NO_SHOW` (correctable, audited) | Seif only |
| Reward `status` | `PENDING_APPROVAL → AVAILABLE → REDEEMED`; `AVAILABLE|PENDING → REVOKED | EXPIRED` | system grants, Seif approves/redeems |
| Message | `status UNREAD → READ` (+ `kind USER|SYSTEM`) | recipient |

## 3. Owner decisions — safe configurable defaults (documented, not guessed)

| Decision | V1 default (configurable) |
|----------|---------------------------|
| Pending paid registration reserves a seat? | **Yes**, `PENDING`/`CONFIRMED` count toward capacity; Seif can cancel unpaid registrations. Per-event setting not needed until Seif asks. |
| Admin approval required? | Per-event `requires_approval` (default **off** → instant `CONFIRMED`). |
| Waitlist? | Per-event `waitlist_enabled` (default **off**). Promotion: oldest waitlisted first, on cancellation. |
| Cancellation deadline / refunds | Per-event `cancellation_deadline_hours` (default 0 = until start). **No refunds implemented.** |
| Multi-person registration | **Only self** (one seat per member). |
| Bank-transfer details | `payment_settings.bank_instructions` — empty until Seif fills it; UI then says "ask Seif". |
| Private events | **Invitation-only** (`event_invitations`). |
| Rewards | Badge definitions + optional reward; financial rewards require Seif approval by default; **none seeded**. |
| Legal text | Drafts clearly marked "requires review"; Seif publishes. |
| Contact details / socials | Only what Seif enters in Settings; nothing invented. |

## 4. Phases

0. **Audit & plan** (this doc).
1. **Foundation migrations** — enums, event lifecycle columns, registration/payment/attendance
   columns + backfill, `payment_submissions`, payment ledger via `payments.registration_id`,
   `event_invitations`, `audit_log`, notifications dedupe, messaging (single-coach
   conversation RPC, `kind`, attachments, idempotent system messages), badges/rewards,
   CMS pages + revisions, FAQ, legal documents, site/payment settings, storage hardening.
   All writes through `SECURITY DEFINER` RPCs that authenticate, authorize, lock and audit.
   Tested on local Supabase with an RLS/IDOR/concurrency SQL suite.
2. **Events + manual payments** — admin event manager (lifecycle, window, waitlist, approval,
   invitations, duplicate), registration RPC wiring, member payment flow (bank proof upload
   to private bucket, in-person), admin review queue, attendance.
3. **Messaging & notifications** — single conversation with Seif, attachments (signed URLs),
   system messages + templates, idempotent notifications, realtime with polling fallback.
4. **Admin ops** — dashboard metrics from source records, members list/detail, reports &
   income ledger, audit view, settings.
5. **Public portal & CMS** — About block editor + revisions, FAQ, contact inbox, legal pages,
   events/news discovery & filters, sitemap/robots/metadata.
6. **Member experience & gamification** — dashboard, profile/avatar, badges gallery,
   progress, rewards.
7. **UX polish** — responsive review at 320/390/768/1024/1440/1920.
8. **Verification & release** — gates, SQL test suite, report, release checklist.

## 5. Migration safety
- New, additive migrations only; no edits to applied files; no `DROP` of data columns.
- Deprecated columns (`event_participants.status/attended`) are kept and synced for
  backward compatibility until a later cleanup migration.
- **Nothing is pushed to production without owner approval.** Push procedure, backup and
  rollback notes: `docs/v1/RELEASE_CHECKLIST.md`.
