# Coach News & Events Management

Coach-only (ADMIN role) management of News and Events; members browse and
join/leave events. Full design notes below; implementation verified with
19 behavioral SQL tests + gates green.

## News model

`news`: `title`, `slug` (UNIQUE), `excerpt` (nullable; derived from content
when empty), `category` (GENERAL/TRAINING/NUTRITION/COMPETITION/COMMUNITY/
ANNOUNCEMENT), `content`, `cover_image_url`, `is_published`,
`published_at`, `created_by → profiles` (byline), timestamps.

- Publishing workflow: create as draft or publish immediately; edit can
  **unpublish** (clears `published_at`). Slug collisions surface a friendly
  message (DB `23505`). Delete has inline two-step confirmation and purges
  the public slug page from cache.
- Public: `/news` (category filter), `/news/[slug]` (byline, category,
  excerpt metadata), homepage preview. Drafts 404 publicly, visible to staff.
- RLS: public reads published rows; staff read/manage all. Actions enforce
  `requireRole(["ADMIN"])` + Zod validation server-side.

## Events model

`events`: `title`, `description`, `event_type`
(TRAINING/WORKSHOP/COMPETITION/SEMINAR/OTHER), `event_format`
(INDIVIDUAL/COLLECTIVE — persisted; INDIVIDUAL forces private + capacity 1
server-side), `start_at`/`end_at`, `location`, `is_public`,
`max_participants` (required positive whole number; INDIVIDUAL coerced to 1), `is_free` + `price_tnd` (CHECK-coupled),
`image_url`, `created_by`, timestamps.

- Paid events display **"Paid in cash with the coach before the event starts."**
  No online payments by design; staff confirm cash via payment status.
- `event_participants`: UNIQUE(event_id, member_id); statuses
  JOINED/INTERESTED/CANCELLED/ATTENDED/NO_SHOW + `payment_status`
  (UNPAID/PAID/NOT_REQUIRED) + `attended`.

## Participation guarantees (all enforced in Postgres, never trusted to client)

- **Atomicity**: `SELECT … FOR UPDATE` on the event row serializes concurrent
  joins/re-joins per event — two members cannot take the same last slot
  (race-tested: loser gets "fully booked", count stays 1).
- **Duplicates**: UNIQUE guard; a CANCELLED own row means **re-join**
  (UPDATE → JOINED) with deadline + capacity re-checked and attendance reset.
  Other terminal states (ATTENDED/NO_SHOW) stay terminal.
- **Payment defaults**: trigger sets NOT_REQUIRED (free) / UNPAID (paid,
  members); staff explicit PAID preserved. Members can never self-mark PAID
  or attendance (column guard).
- **Capacity guard**: `max_participants` cannot drop below the active headcount.
- **Deadline**: no registration at/after `start_at`.

## Realtime

`events` + `event_participants` are in the `supabase_realtime` publication
(RLS-filtered). Subscribers: admin calendar (existing), admin participant
list, member + public event detail pages (per-event channel,
`router.refresh()` on change). Members receive only their own rows; aggregates
stay server-rendered.

## Validation & gates

- `npx tsc --noEmit` — 0 errors; `npx eslint .` — clean; `npm run build` — success.
- Scratch-Postgres replay of all 41 migrations: clean. 19 behavioral tests
  pass (categories, payment defaults, re-join + reset, capacity race,
  terminal states, capacity guard, format default/check).
- Pre-push graceful degradation proven live: without the new columns the
  pages return 200 empty states (logged 42703s) instead of crashing.

## Deploy requirements

1. **Owner:** approve `supabase db push` (`20260907000000_coach_news_events.sql`).
2. Regenerate `types/database.types.ts` (`npm run db:types`).
3. Redeploy Netlify. Smoke: Coach creates → publishes → edits → deletes news;
   creates INDIVIDUAL + paid COLLECTIVE events; member browses → joins →
   cancels → re-joins; participant list updates live.
