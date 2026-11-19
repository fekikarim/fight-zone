# Fight Zone V1 — Engineering report

Date: 2026-11-18 · Scope: `FIGHT_ZONE_V1_IMPLEMENTATION_BRIEF.md` · Plan: `V1_AUDIT_AND_PLAN.md` ·
Release: `RELEASE_CHECKLIST.md`

> **Deployment status (2026-11-19): database migrated, code not yet deployed.** All 9 V1 migrations
> were applied to production after a data backup (schema `backup_20261119`); the remote history now
> holds 45 migrations whose versions match the files. Verified: columns, grants, function privileges,
> triggers and all 97 function bodies identical to the tested local schema; legal texts byte-identical
> (md5) to `lib/legal/templates.ts`; data counts unchanged; 4 events backfilled to PUBLISHED.
> Remaining: push the V1 code to `main` so Netlify stops serving V0 code against the V1 schema.

## 1. Audit findings fixed
| Finding | Fix |
|---|---|
| Any member could read every private 1-on-1 event | Invitation-only private events (`event_invitations` + `is_invited_to_event()` in RLS); drafts hidden from everyone but Seif |
| Members couldn't start a conversation (required a retired booking) | One conversation per member with Seif, created by `get_or_create_conversation()` |
| Payment evidence could be overwritten/deleted by its owner | Private bucket is write-once for members (insert only into `<uid>/payments|messages/`), staff-only update/delete |
| Registration + attendance in one status; no proof workflow; no amount snapshot | Separate `registration_status` / `payment_status` / `attendance_status`, `amount_due_tnd` snapshot, `payment_submissions`, income ledger |
| Admin badge counted other users' notifications (fixed earlier) | owner filter |
| Footer/contact page showed invented phone, hours, location, socials | Only Seif-entered `site_settings` are displayed |
| Public pages could be prerendered with empty settings (swallowed dynamic signal) | Prerender bail-outs re-thrown |

## 2. Completed features (evidenced)
**Events & manual payments**
- Event lifecycle DRAFT → PUBLISHED → CANCELLED/ARCHIVED; publish, unpublish (only without registrations), cancel with member notice, archive/restore, duplicate as draft, delete only empty drafts.
- Individual (capacity 1) vs group format separate from public/private visibility; registration window, approval mode, waitlist (auto-promotion oldest-first), member cancellation deadline, category, tags, requirements.
- Capacity-safe `register_for_event` RPC (row lock; PENDING+CONFIRMED hold seats); duplicate-safe; re-registration after cancel/reject.
- Free events → `NOT_REQUIRED` (no payment tasks). Paid → `UNPAID` with price snapshot; price edits don't change what registered members owe.
- Bank-transfer proof: client upload to private storage → `submit_payment_proof` validates owner path, MIME, size, existence; status "awaiting review" (never auto-confirmed).
- Seif's queue `/admin/payments`: signed 60 s proof links, declared vs due mismatch flag, confirm (records income once) / reject with mandatory reason (member may resubmit if allowed in Settings).
- In-person payments recorded from the event registrations desk (no fake proof).
- Registrations desk per event: confirm/decline/cancel with reason, record payment, review proof, attendance toggles.
- Admin events list with status filters/search; admin calendar uses the same table.

**Messaging & notifications**
- Member: single private thread with Seif. Seif: inbox (search, unread first) + "message a member".
- SYSTEM messages labelled "Fight Zone · automatic message" (never impersonate Seif), idempotent by key; 15 editable templates (essential ones can't be disabled).
- Private image/PDF attachments (≤5 MB) via signed URLs; read receipts; realtime hints + 20 s polling fallback; older-page pagination.
- Notifications deduplicated (`dedupe_key`), new categories (payment, badge, reward), correct deep links.

**Admin operations**
- Dashboard from `get_admin_dashboard` (period 7/30/90 days, attention queue, KPIs with drill-downs, recent audit activity). Income = confirmed receipts only.
- Reports: per-event utilization + income ledger, CSV exports (staff-only, formula-injection safe, millime-exact totals).
- Members: search/paginate, detail (history, payments, attendance, badges, rewards), message, (de)activate (audited; inactive members can't register).
- Settings: bank/in-person payment instructions, contact & social links, automatic-message templates.
- Audit log for registration decisions, payments, attendance, rewards, badge definitions, event price/capacity/date/visibility changes, CMS publish/restore, legal publish, settings/FAQ/news edits, member activation.

**Gamification**
- Participation = attendance recorded by Seif only. Badge definitions (thresholds, tier, icon, colour, optional reward) — none seeded.
- Idempotent award (unique member+badge), reconciliation on correction (revoke + restore), notifications/messages once.
- Rewards: discount or free-entry (capped), manual approval default, expiry, total cap, single-use atomic redemption reducing the amount due (never negative; covered → `WAIVED`, not income), append-only `reward_events` ledger, liability dashboard and "members who'd qualify" preview.
- Member dashboard progress bar, achievements gallery, reward status/terms.

**Public portal & CMS**
- About page block editor (12 block types, add/reorder/duplicate/delete, image upload with alt text, phone/tablet/desktop preview, unsaved-changes guard, draft/publish, revision restore). Versioned JSON validated on write and render; invalid blocks are skipped; no HTML/CSS/script; video allowlist (YouTube/Vimeo, privacy-enhanced); stats/testimonials require explicit verification/consent ticks.
- FAQ (admin CRUD/order/publish; public searchable accessible accordion).
- Privacy & Terms: versioned drafts → publish (previous versions kept, public history); starting drafts describe actual data handling and are clearly marked "[TO CONFIRM] / requires legal review".
- Contact: topic, honeypot, DB rate limit (3/email/hour), inbox with New/Read/Replied.
- Public events: search, category, type, upcoming/past, "places available"; `sitemap.xml` (public published only) and `robots.txt` (private areas disallowed).
- Auth: safe `next` return path (visitor → sign in/up → back to the event); Seif lands on `/admin`.

## 3. Database migrations (new, local-tested)
`20261118000000_v1_enums` · `000100_v1_core` · `000200_v1_messaging` · `000300_v1_events_registrations` ·
`000400_v1_attendance_gamification` · `000500_v1_cms_storage` · `000600_v1_reporting`.
Additive only; applied migrations untouched; legacy `status/attended` columns kept and synced by trigger.

## 4. Security verification
`tests/sql/v1_security_workflows.sql` — **95/95 pass** on a fresh replay of all 43 migrations, covering:
anon/member A/member B/Seif matrix; drafts & private events hidden; member A ↔ B isolation for
registrations, proofs (rows and storage objects), messages (table + RPC), rewards; members cannot write
registrations, call staff RPCs, self-assign ADMIN, read audit log, edit events/CMS, send SYSTEM messages,
impersonate senders, attach other members' files, create conversations, delete evidence, record own
attendance or approve own rewards; capacity reduction guard; price snapshot; idempotent notifications,
system messages, badge awards and rewards; double confirmation/redemption prevented; contact rate limit;
legal published versions immutable; drafts never leak via `get_published_page`.
`tests/sql/v1_race.sh` — **20/20** concurrent last-seat rounds: exactly one winner each time.

## 5. Test & quality gates (exact commands)
| Command | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npx eslint app components lib --quiet` | 0 problems |
| `npm test` (72 existing + 32 new V1 unit tests) | 104/104 pass |
| `npm run test:db` (local Supabase) | 95/95 + race 20/20 |
| `npx next build` | success, no errors |
| Manual E2E on local stack (real UI) | paid registration → proof upload → Seif confirms → PAID + ledger + messages; admin messaging; About publish → public render; all member/public pages 200; no horizontal overflow at 375 px on 7 pages |

Not run: Playwright E2E (not configured in the repo); `supabase db push --dry-run` (CLI not logged in —
the remote list was compared via the Supabase API instead); Supabase security advisors on the new schema
(only possible after the push).

## 6. Not done / partial (honest)
- **News newsroom upgrades**: DB has `tags`, `archived_at`, `seo_description`, but the news editor/public
  filters, scheduled publishing, preview and related articles were not built (existing news CRUD works).
- **Calendar**: unchanged V0 month/week/agenda on the shared table; no status/category filters or
  create-from-selected-date prefill yet.
- **Per-event attendee CSV**, admin editing of member profile fields, notification preferences,
  in-app event-reminder and reward-expiring messages (email reminders from V3 still run), V1 email
  copies of the new notifications.
- **Home page** not redesigned for V1 (still V0, real data only).
- Event categories are free text with suggestions (no managed category table).
- Profile photos live in the public bucket (link-accessible); the privacy draft says so.

## 7. Owner decisions (safe defaults active, all configurable)
1. Pending paid registration holds a seat (default yes) — and for how long (no expiry implemented).
2. Approval required (per event, default off). 3. Waitlist (per event, default off).
4. Cancellation deadline (per event, default until start) and refund policy (none processed by the platform).
5. One seat per member (no multi-person registration).
6. **Bank-transfer details** — Seif must enter them in Settings; until then members are told to message him.
7. Private events = invitation-only.
8. Reward values, expiry, caps, approval — none created; Seif defines them.
9. **Legal text** — drafts require completion of "[TO CONFIRM]" items and legal review before publishing.
10. **Contact details, socials, statistics, testimonials, photos** — nothing invented; Seif enters them.

## 8. Deployment readiness
Code and schema are ready for a supervised release following `RELEASE_CHECKLIST.md`.
Blockers: owner approval for `supabase db push` + backup. After deploy, Seif must fill Settings
(payment + contact) and review/publish legal pages.


## 9. Update 2026-11-19 (owner feedback round)
- **Admin member page 404** fixed: Zod 4 `uuid()` rejected non-RFC-variant ids (seeded accounts); all id checks now use `z.guid()`.
- **Payment plan before registering** (migration `20261119000000`): paid events require choosing *in person* or *bank transfer* (+ planned date, optional note) in the same transaction as the registration; a bank-transfer plan is posted to Seif as the member's own message; members can change the plan; Seif sees it in the registrations desk.
- **Chat images inline**: CSP `img-src` now allows the configured Supabase origin (was `*.supabase.co` only); `frame-src` added for YouTube/Vimeo embeds.
- **Messaging rebuilt** (WhatsApp-style): instant realtime delivery + read receipts (✓/✓✓), optimistic sending with failed/retry, typing indicator (broadcast, no content), day separators, grouping, smart auto-scroll + "new messages" pill, image lightbox, paste-to-attach, offline banner, catch-up on reconnect/visibility, 30 s safety poll. Verified: a member message appeared in Seif's open thread in ~2 s without reload.
- **Live notifications** across both portals (`LiveUpdates` in the dashboard shell): toast with deep link + badge refresh on every new notification.
- **Settings split** into Payments / Contact & social / Automatic messages pages; template editor uses readable chips (“+ Event name” → `[Event name]`), per-message explanations and a live example preview (stored as `{{event_title}}`, verified).
- **Article slugs** are generated server-side (title + random 6-char suffix, e.g. `ete-2026-summer-sparring-camp-nggz43`); no slug field; never derived from ids; stable after creation.
- **Achievements page** (`/member/achievements`): earned badges in colour, locked ones hidden behind a lock with their requirement, progress hero, rewards.
- **Preview mode** notice reduced to a small floating pill; admin entry is a discreet one-line link.
- **Default Privacy Policy, Terms of Use and FAQ** (migration `20261119000100`, generated from `lib/legal/templates.ts`) — describe actual platform behaviour, reference Tunisian Organic Law 2004-63 / INPDP and GDPR rights; publish only if none exist. Recommended: have a Tunisian lawyer review before relying on them commercially.
- **Contact page** redesigned (quick actions, settings-driven channels, quick-answer FAQ).
- Gates after this round: tsc 0 · eslint 0 · npm test 104/104 · test:db 109/109 + race 20/20 · next build ✅.
