-- ============================================================
-- FIGHT ZONE — Migration 0009: Member booking rules
-- (duplicate-booking prevention + booking notification triggers)
-- ============================================================
-- 1. A member can hold only ONE active (PENDING/CONFIRMED) booking for a
--    given session at a given time. Historical/completed bookings can repeat.
-- 2. Notifications are the system's read-only surface. `notifications` INSERT
--    is staff-only via RLS, so the coach/member notifications that must fire
--    automatically on booking lifecycle events are created by SECURITY
--    DEFINER triggers (they bypass RLS, never surface client input).

-- ------------------------------------------------------------
-- Duplicate active booking prevention
-- ------------------------------------------------------------
create unique index bookings_member_session_time_unique
    on public.bookings (member_id, session_id, scheduled_at)
    where status in ('PENDING', 'CONFIRMED');

-- ------------------------------------------------------------
-- Member-initiated booking status enforcement
-- ------------------------------------------------------------
-- RLS lets members update their own bookings, but it cannot distinguish
-- which status they are writing. Status is authoritative state that only the
-- coach/staff may change (confirm/complete/no-show); the member may only
-- cancel their own ACTIVE future booking. This is the DB boundary that backs
-- the "no client-trusted status" rule — the app action is just UX on top.
create or replace function public.enforce_member_booking_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.status = old.status then
        return new;
    end if;

    -- service_role (auth.uid() is null) and staff manage bookings freely.
    if auth.uid() is null or public.is_admin_or_coach() then
        return new;
    end if;

    -- Only the booking owner reaches here (RLS filtered the row). They may
    -- cancel an active booking that hasn't started yet — nothing else.
    if new.status = 'CANCELLED'
       and old.status in ('PENDING', 'CONFIRMED')
       and new.scheduled_at > now() then
        return new;
    end if;

    raise exception using
        errcode = '42501',
        message = 'Members can only cancel their own active future bookings.';
end;
$$;

create trigger bookings_enforce_member_transition
    before update on public.bookings
    for each row execute procedure public.enforce_member_booking_transition();

-- ------------------------------------------------------------
-- Notify coach + member when a booking is created
-- ------------------------------------------------------------
create or replace function public.notify_on_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.notifications (user_id, type, title, content)
    values
        (
            new.coach_id,
            'BOOKING',
            'New booking request',
            'A member has requested a session. Review and confirm it in your dashboard.'
        ),
        (
            new.member_id,
            'BOOKING',
            'Booking request received',
            'Your booking request is pending confirmation from the coach.'
        );
    return new;
end;
$$;

create trigger bookings_notify_on_insert
    after insert on public.bookings
    for each row execute procedure public.notify_on_booking_insert();

-- ------------------------------------------------------------
-- Notify coach when a booking is cancelled
-- ------------------------------------------------------------
create or replace function public.notify_on_booking_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.notifications (user_id, type, title, content)
    values (
        new.coach_id,
        'BOOKING',
        'Booking cancelled',
        'A member has cancelled their booking. The slot is now available again.'
    );
    return new;
end;
$$;

create trigger bookings_notify_on_cancel
    after update on public.bookings
    for each row
    when (old.status is distinct from new.status and new.status = 'CANCELLED')
    execute procedure public.notify_on_booking_cancel();
