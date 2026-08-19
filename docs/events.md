# Fight Zone — Events, Competition & Training Schedule Architecture

Prompt #7 design, security model, data flow, triggers, and testing.

## 1. Schema

Extended in `supabase/migrations/20260821000000_events.sql` (additive only):

```sql
events (existing table, additive changes)
  max_participants    integer                   -- nullable = unlimited capacity

event_participants (existing table, additive changes)
  status              participation_status      -- expanded: + ATTENDED, NO_SHOW
```

The `participation_status` enum now includes: INTERESTED, JOINED, CANCELLED, ATTENDED, NO_SHOW.

## 2. Trigger Functions

### 2a. `enforce_event_registration` (BEFORE INSERT)

Runs on every `event_participants` INSERT. Validates:

1. **Event exists and is public** — blocks registration for non-public or missing events.
2. **Deadline** — blocks registration if `start_at <= now()` (event already started).
3. **Capacity** — counts all non-CANCELLED participants; blocks if `max_participants` is set and reached.

Uses `SECURITY DEFINER` with `SET search_path = public` to avoid RLS interference on the count query.

### 2b. `enforce_participation_transitions` (BEFORE UPDATE of `status`)

State machine enforced at the database level:

| From | Allowed → | Notes |
| --- | --- | --- |
| INTERESTED | JOINED, CANCELLED | |
| JOINED | CANCELLED, ATTENDED, NO_SHOW | |
| CANCELLED | _(none)_ | Terminal |
| ATTENDED | _(none)_ | Terminal |
| NO_SHOW | _(none)_ | Terminal |

Additionally, members (non-admin/non-coach) cannot self-mark ATTENDED or NO_SHOW — the trigger checks `current_setting('request.jwt.claims')` for role membership.

### 2c. `notify_event_registration` (AFTER INSERT)

Creates a notification row for the registering member:
- `type = 'EVENT'`
- `title = 'Registration confirmed: {event_title}'`
- `resource_type = 'event'`, `resource_id = event_id`

### 2d. `notify_event_cancellation` (AFTER UPDATE)

Fires when `status` transitions to CANCELLED. Creates a notification:
- `type = 'EVENT'`
- `title = 'Registration cancelled: {event_title}'`
- `resource_type = 'event'`, `resource_id = event_id`

## 3. Event Lifecycle Status

Event "status" is derived at read time, not stored:

| Condition | Lifecycle |
| --- | --- |
| `is_public = false` | draft |
| `start_at > now()` | upcoming |
| `start_at <= now() AND (end_at IS NULL OR end_at > now())` | ongoing |
| `end_at <= now()` | past |

## 4. Registration State Machine

```
INTERESTED ──→ JOINED ──→ ATTENDED (terminal)
     │              │
     │              ├──→ NO_SHOW (terminal)
     │              │
     │              └──→ CANCELLED (terminal)
     │
     └──→ CANCELLED (terminal)
```

Key rules:
- Capacity is enforced atomically via a `SECURITY DEFINER` count — no read-then-write race.
- Deadline enforcement blocks registration once the event has started.
- Members cannot self-escalate to ATTENDED or NO_SHOW.
- CANCELLED is terminal — a member cannot re-register after cancelling (enforced by the unique constraint on `event_id + member_id`).

## 5. File Map

| Path | Description |
| --- | --- |
| `supabase/migrations/20260821000000_events.sql` | Migration: schema, triggers, indexes |
| `lib/types/events.ts` | Shared types (`EventSummary`, `EventDetail`, `EventParticipant`, `ScheduleItem`) + helpers |
| `lib/validations/events.ts` | Zod schemas for create, update, register, cancel, update-participant-status, filters |
| `lib/actions/events.ts` | Server actions: `registerForEvent`, `cancelEventRegistration`, `createEvent`, `updateEvent`, `updateParticipantStatus` |
| `lib/supabase/queries.ts` | Queries: `getPublicEvents` (upgraded with filters), `getPublicEventById`, `getStaffEventById`, `getMemberEventRegistration`, `getMemberRegisteredEvents`, `getEventParticipants`, `getAdminEvents`, `getMemberSchedule` |
| `components/events/event-detail.tsx` | Shared event detail display |
| `components/events/event-register-button.tsx` | Client-side register/cancel CTA |
| `components/events/event-filters.tsx` | Client-side type filter chips |
| `components/events/event-participant-list.tsx` | Admin participant list with status actions |
| `components/events/event-create-form.tsx` | Admin event creation form |
| `components/events/schedule-list.tsx` | Combined bookings + events schedule list |
| `app/(marketing)/events/page.tsx` | Public events list with type filters |
| `app/(marketing)/events/[id]/page.tsx` | Public event detail |
| `app/member/events/page.tsx` | Member registered events list |
| `app/member/events/[id]/page.tsx` | Member event detail with register/cancel |
| `app/member/schedule/page.tsx` | Combined schedule view |
| `app/admin/events/page.tsx` | Admin event management list |
| `app/admin/events/[id]/page.tsx` | Admin event detail with participant management |
| `app/admin/events/new/page.tsx` | Admin event creation page |
| `supabase/tests/events_rls.sql` | 24 security test cases |
| `docs/events.md` | This file |

## 6. Testing

The SQL test suite (`supabase/tests/events_rls.sql`) covers:

1. Anon: events SELECT — public only
2. Anon: events INSERT/UPDATE/DELETE denied
3. Member: events SELECT — public only
4. Member: event_participants owner read only
5. Member: event_participants INSERT — own only
6. Coach/Admin: events full access
7. Capacity enforcement trigger
8. Deadline enforcement trigger
9. State machine transition enforcement
10. Notification trigger on registration + cancellation
11. event_participants DELETE denied for all
