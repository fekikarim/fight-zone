# Fight Zone — Coaching Services & Coach Directory

Prompt #8: Production-grade coaching service browsing, filtering, and admin management.

## Overview

Adds discipline/level metadata to sessions, a public coach directory, and admin CRUD for session management. Reuses the existing booking flow (Prompt #4/5) — no new booking logic.

## Schema changes

### `sessions` table (additive)

| Column | Type | Nullable | Purpose |
| --- | --- | --- | --- |
| `discipline` | `text` | YES | Canonical discipline (English Boxing, Kick Boxing, Fitness & Strength Training) |
| `level` | `skill_level` | YES | Skill level enum (BEGINNER, INTERMEDIATE, ADVANCED, PROFESSIONAL) |

All existing seed data backfilled. Nullable = zero migration risk.

### Indexes

| Index | Columns | Partial |
| --- | --- | --- |
| `sessions_discipline_idx` | `discipline` | `WHERE is_active = true` |
| `sessions_level_idx` | `level` | `WHERE is_active = true` |
| `sessions_discipline_level_idx` | `(discipline, level)` | `WHERE is_active = true` |
| `sessions_active_coach_idx` | `(is_active, coach_id)` | No |

## Architecture

- Single-coach model preserved (no new tables)
- Booking flow unchanged (reuses `createBooking` + DB triggers)
- Notification flow unchanged (existing triggers handle everything)

## File map

| Path | Description |
| --- | --- |
| `supabase/migrations/20260822000000_coaching_services.sql` | Migration |
| `lib/types/services.ts` | Discipline constants, labels, domain types |
| `lib/validations/services.ts` | Zod schemas (filters, create, update, toggle) |
| `lib/actions/services.ts` | Server actions (create, update, toggle) |
| `lib/supabase/queries.ts` | 7 new/updated queries |
| `components/services/session-filters.tsx` | Filter pills (client) |
| `components/services/session-create-form.tsx` | Admin create form |
| `components/services/session-edit-form.tsx` | Admin edit form |
| `app/(marketing)/services/` | Public services + detail |
| `app/(marketing)/coaches/` | Public coaches + detail |
| `app/admin/services/` | Admin session management |
| `app/member/sessions/[id]/page.tsx` | Updated detail with badges |
| `types/database.types.ts` | Updated session types |

## New routes

| Route | Description |
| --- | --- |
| `/services` | Upgraded with discipline/level/type filters |
| `/services/[id]` | Session detail with coach info + booking CTA |
| `/coaches` | Coach directory |
| `/coaches/[id]` | Coach profile with achievements + sessions |
| `/admin/services` | Admin session list |
| `/admin/services/[id]` | Admin session edit |
| `/admin/services/new` | Admin session create |

## Filter UX

URL search params (`?discipline=X&level=Y&type=Z`) — deep-linkable, bookmarkable, back-button friendly. No client state management needed.
