# Fight Zone — Notification Center Architecture

Prompt #6 design, security model, data flow, triggers, and testing.

## 1. Schema

The `notifications` table (migration `20260815000400_communication.sql`, extended
by `20260820000000_notifications.sql`):

```sql
notifications
  id              uuid primary key default gen_random_uuid()
  user_id         uuid not null references profiles(id)
  type            notification_type not null default 'SYSTEM'
  title           text not null
  content         text
  is_read         boolean not null default false
  created_at      timestamptz not null default now()
  resource_type   text                   -- 'booking' | 'conversation' | 'session' | null
  resource_id     uuid                   -- UUID of the referenced entity
```

`resource_type` and `resource_id` are nullable — null means "system / no deep link."
The notification center resolves these to contextual routes at render time.

## 2. Indexes

| Index | Covers |
| --- | --- |
| `(user_id, is_read)` | Unread head-count query |
| `(user_id, created_at DESC, id DESC)` | Keyset-paginated notification center list |

The second index was added in Prompt #6 for O(1) page access without offset drift.

## 3. RLS policies

| Policy | Operation | Rule |
| --- | --- | --- |
| `notifications_select_own_or_staff` | SELECT | `user_id = auth.uid()` OR `is_admin_or_coach()` |
| `notifications_insert_staff_only` | INSERT | `is_admin_or_coach()` |
| `notifications_update_read_own` | UPDATE | `USING user_id = auth.uid()` / `WITH CHECK user_id = auth.uid() AND is_read = true` |
| `notifications_delete_staff_only` | DELETE | `is_admin_or_coach()` |

The UPDATE policy was narrowed in Prompt #6: members can only mark their own
notifications as read (`is_read = true`). Reverting `is_read` to `false`,
changing `user_id`, or modifying `title`/`content`/`type` is blocked by the
`WITH CHECK` clause.

## 4. Trigger functions (SECURITY DEFINER)

All triggers run as the definer (superuser). The function bodies were updated
via `CREATE OR REPLACE` in Prompt #6 to include `resource_type` and `resource_id`
on every INSERT.

| Trigger | Fires on | Notifications created | resource_type |
| --- | --- | --- | --- |
| `notify_on_booking_insert` | AFTER INSERT on bookings | coach + member (2 rows) | `booking` |
| `notify_on_booking_status_change` | AFTER UPDATE on bookings | member (CONFIRMED/CANCELLED/COMPLETED/NO_SHOW) + coach (CANCELLED only) | `booking` |
| `notify_on_message_insert` | AFTER INSERT on messages | conversation recipient only (not sender, not on read) | `conversation` |

No trigger bodies were changed — only the INSERT column lists were extended.

## 5. Server actions

| Action | File | Purpose |
| --- | --- | --- |
| `markNotificationRead` | `lib/actions/notifications.ts` | Atomic: `UPDATE ... SET is_read = true WHERE id = ? AND is_read = false`. Idempotent. |
| `markAllNotificationsRead` | `lib/actions/notifications.ts` | Bulk: `UPDATE ... SET is_read = true WHERE is_read = false`. Returns affected count. |

Both actions:
- Derive `user_id` from session (never from form input).
- Use `count: "exact"` to return the affected row count.
- Call `revalidatePath` on both `/member` and `/admin` layouts (badge) + notification pages.

## 6. Server queries

| Query | File | Purpose |
| --- | --- | --- |
| `getUnreadNotificationCount` | `lib/supabase/queries.ts` | Head-count for nav badge + dashboard stat. Decorative: returns 0 on failure. |
| `getNotificationCenter` | `lib/supabase/queries.ts` | Keyset-paginated list. Supports `type` filter, `unreadOnly` filter, base64url cursor. Fetches PAGE_SIZE + 1 to detect `hasMore`. |
| `getCurrentUserNotifications` | `lib/supabase/queries.ts` | Legacy dashboard preview (5 rows, unread-first). Now includes `resource_type`/`resource_id`. |

### Keyset pagination

The cursor is a base64url-encoded string: `base64url(${created_at}|${id})`.
The server decodes it and applies:
```sql
WHERE (created_at, id) < (cursor_created_at, cursor_id)
ORDER BY created_at DESC, id DESC
```
In PostgREST: `.or('created_at.lt.X,and(created_at.eq.X,id.lt.Y)')`.

## 7. UI components

| Component | File | Client? | Purpose |
| --- | --- | --- | --- |
| `NotificationItem` | `components/notifications/notification-item.tsx` | Yes | Single notification: icon, title, content, relative timestamp, unread dot, contextual link, optimistic mark-read |
| `MarkAllReadButton` | `components/notifications/mark-all-read-button.tsx` | Yes | Form with `useActionState` calling `markAllNotificationsRead` |
| `NotificationFilters` | `components/notifications/notification-filters.tsx` | Yes | Filter tabs using URL search params (`?filter=unread&type=BOOKING`) |
| `LoadMoreNotifications` | `components/notifications/load-more-notifications.tsx` | Yes | "Load older" button, appends cursor to URL |
| `NotificationList` | `components/notifications/notification-list.tsx` | No | Server component: orchestrates filters, list, mark-all, load-more |

## 8. Pages

| Route | Role | Layout badge |
| --- | --- | --- |
| `/member/notifications` | MEMBER | Yes |
| `/admin/notifications` | ADMIN/COACH | Yes |

Both pages parse `searchParams` (type, filter, cursor), call `getNotificationCenter`
and `getUnreadNotificationCount`, then render `NotificationList` inside a
`Suspense` boundary with a skeleton fallback.

## 9. Dashboard integration

**Member dashboard** (`app/member/page.tsx`):
- "Unread notifications" stat card (links to `/member/notifications`).
- "View all" button in the notification preview panel.

**Admin dashboard** (`app/admin/page.tsx`):
- "Unread notifications" stat card (links to `/admin/notifications`).
- "View all" button in the notification preview panel.

**Nav** (`app/member/layout.tsx`, `app/admin/layout.tsx`):
- "Notifications" nav item with unread badge in both layouts.

## 10. Deep-linking

`resource_type` + `resource_id` resolve to contextual routes at render time:

| resource_type | Route prefix |
| --- | --- |
| `booking` | `/member/bookings/{id}` or `/admin/bookings/{id}` |
| `conversation` | `/member/messages/{id}` or `/admin/messages/{id}` |
| `session` | `/member/sessions/{id}` or `/admin/sessions/{id}` |

If the referenced resource no longer exists, the notification renders without
a link. No client-side error.

## 11. Security considerations

- **Owner-only read**: SELECT RLS restricts to `user_id = auth.uid()` (staff bypass via `is_admin_or_coach()`).
- **Narrow mark-read**: UPDATE `WITH CHECK` only allows `is_read = true`, preventing revert.
- **No forged inserts**: INSERT RLS is staff-only; members cannot create notifications.
- **No client-trusted user_id**: All actions derive user from session.
- **No `select("*")`**: Every query uses explicit column lists.
- **No realtime**: Notifications update on next page load or navigation.
- **Cursor integrity**: Base64url cursor is validated server-side; tampering yields empty results or a validation error.

## 12. Pre-push graceful degradation

Before `supabase db push`:
- `getUnreadNotificationCount` returns 0 on error (badge stays hidden).
- `getNotificationCenter` throws `DatabaseError` on missing table (page shows error state).
- Mark-read actions return friendly errors if the narrow UPDATE policy doesn't exist yet.

## 13. Testing

`supabase/tests/notifications_rls.sql` — 21 test cases covering:

| Category | Cases |
| --- | --- |
| SELECT scope | Anon isolation, owner-only, IDOR, member6 zero |
| UPDATE mark-read | Own mark-read, revert blocked, escalation blocked, IDOR blocked, idempotent |
| Mark-all bulk | Owner-scoped affected count, cross-user isolation |
| INSERT/DELETE | Member denied for both |
| Resource columns | Populated on trigger inserts, nullable for system |
| Trigger regression | Booking insert (2 notifications), booking status change, message insert |

Run after `supabase db reset --local`:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
    -f supabase/tests/notifications_rls.sql
```
