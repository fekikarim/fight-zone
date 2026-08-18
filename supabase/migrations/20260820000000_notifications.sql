-- ============================================================
-- Prompt #6 — Notification Center infrastructure
--
-- Additive migration only:
--   • contextual resource columns (resource_type, resource_id)
--   • keyset-pagination index
--   • narrower UPDATE RLS (mark-read only)
--   • trigger functions updated via CREATE OR REPLACE (no trigger drops)
--
-- IMPORTANT: No old migrations are modified. Only CREATE OR REPLACE
-- is used for trigger functions — the trigger rows themselves are
-- untouched and continue to fire with the updated bodies.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Contextual resource columns
--    nullable — null means "system / no deep link"
--    resource_type: text enum-in-disguise ('booking', 'conversation',
--                   'session', 'event', null)
--    resource_id:   uuid of the referenced entity
-- ------------------------------------------------------------

alter table public.notifications
    add column if not exists resource_type text;

alter table public.notifications
    add column if not exists resource_id uuid;

-- ------------------------------------------------------------
-- 2. Keyset-pagination index
--    Primary notification center query:
--      WHERE user_id = ?
--      [AND is_read = false]
--      ORDER BY created_at DESC, id DESC
--      LIMIT 20
--    The existing (user_id, is_read) index covers the unread-count
--    head-count query; this new index covers the paginated list.
-- ------------------------------------------------------------

create index if not exists notifications_user_id_created_at_idx
    on public.notifications (user_id, created_at desc, id desc);

-- ------------------------------------------------------------
-- 3. Narrow the UPDATE RLS policy
--    Old policy (notifications_update_own_or_staff) allowed updating
--    any column including user_id / type / title / content.
--    New policy restricts to: own notifications, is_read must be true
--    after the update.  Members can only mark-read, never revert.
-- ------------------------------------------------------------

drop policy if exists notifications_update_own_or_staff on public.notifications;

create policy notifications_update_read_own
    on public.notifications for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid() and is_read = true);

-- ------------------------------------------------------------
-- 4. Updated trigger functions (CREATE OR REPLACE — no trigger drops)
--
--    The only change: each INSERT now includes resource_type and
--    resource_id so the notification center can deep-link to the
--    relevant booking or conversation.
-- ------------------------------------------------------------

-- 4a. notify_on_booking_insert
--     Fires AFTER INSERT on public.bookings.
--     Creates one notification for the coach and one for the member.

create or replace function public.notify_on_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
    values
        (
            new.coach_id,
            'BOOKING',
            'New booking request',
            'A member has requested a session. Review and confirm it in your dashboard.',
            'booking',
            new.id
        ),
        (
            new.member_id,
            'BOOKING',
            'Booking request received',
            'Your booking request is pending confirmation from the coach.',
            'booking',
            new.id
        );
    return new;
end;
$$;

-- 4b. notify_on_booking_status_change
--     Fires AFTER UPDATE on public.bookings.
--     Covers CONFIRMED, CANCELLED, COMPLETED, NO_SHOW transitions.

create or replace function public.notify_on_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.status = old.status then
        return new;
    end if;

    if new.status = 'CONFIRMED' then
        insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
        values (
            new.member_id,
            'BOOKING',
            'Booking confirmed',
            'Your booking request has been confirmed.',
            'booking',
            new.id
        );
    elsif new.status = 'CANCELLED' then
        insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
        values (
            new.member_id,
            'BOOKING',
            'Booking cancelled',
            'Your booking has been cancelled.',
            'booking',
            new.id
        );
        -- Do not notify the coach about their own cancellation.
        if auth.uid() is distinct from new.coach_id then
            insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
            values (
                new.coach_id,
                'BOOKING',
                'Booking cancelled',
                'A booking was cancelled. The slot is now available again.',
                'booking',
                new.id
            );
        end if;
    elsif new.status = 'COMPLETED' then
        insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
        values (
            new.member_id,
            'BOOKING',
            'Session completed',
            'Great work — your session has been completed.',
            'booking',
            new.id
        );
    elsif new.status = 'NO_SHOW' then
        insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
        values (
            new.member_id,
            'BOOKING',
            'No-show',
            'You were marked as a no-show for your session.',
            'booking',
            new.id
        );
    end if;

    return new;
end;
$$;

-- 4c. notify_on_message_insert
--     Fires AFTER INSERT on public.messages.
--     Notifies the conversation recipient only.

create or replace function public.notify_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_recipient   uuid;
    v_sender_name text;
begin
    select
        case when c.member_id = new.sender_id then c.coach_id else c.member_id end
    into v_recipient
    from public.conversations c
    where c.id = new.conversation_id;

    if v_recipient is null then
        return new;
    end if;

    select p.full_name
    into v_sender_name
    from public.profiles p
    where p.id = new.sender_id;

    insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
    values (
        v_recipient,
        'MESSAGE',
        'New message from ' || coalesce(nullif(v_sender_name, ''), 'Fight Zone'),
        left(new.body, 120),
        'conversation',
        new.conversation_id
    );

    return new;
end;
$$;
