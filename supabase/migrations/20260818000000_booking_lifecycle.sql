-- ============================================================
-- FIGHT ZONE — Migration 0010: Booking lifecycle & coach management
-- ============================================================
-- Prompt #4 makes the booking lifecycle authoritative at the database level:
--
--   1. `is_admin()` helper so RLS/triggers can distinguish ADMIN from COACH.
--   2. RLS narrowed to coach ownership: COACH manages only bookings assigned
--      to them (`coach_id = auth.uid()`), ADMIN manages everything, MEMBER
--      sees only their own rows. Before this, any staff member could read or
--      modify every booking.
--   3. A single SECURITY DEFINER transition trigger that enforces the booking
--      state machine for EVERY role (members AND staff), protects immutable
--      identities (`member_id`, `session_id`), and stops members editing
--      booking details they do not own.
--   4. A comprehensive lifecycle notification trigger (replaces the limited
--      cancel trigger) that only fires on a real status change and never
--      notifies a coach about their own cancellation.
--   5. Composite indexes for the admin booking list queries.
--
-- All changes are additive/drop-recreate; no tables, columns or enums change,
-- so the generated Database types remain valid.

-- ------------------------------------------------------------
-- is_admin(): distinguishes the ADMIN role from COACH/MEMBER.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.user_role_assignments ura
        join public.roles r on r.id = ura.role_id
        where ura.user_id = auth.uid()
          and r.name = 'ADMIN'
    );
$$;

-- ------------------------------------------------------------
-- bookings RLS: coach ownership, admin-wide, member-own
-- ------------------------------------------------------------
drop policy if exists bookings_select_own_or_staff on public.bookings;
create policy bookings_select_own_or_staff
    on public.bookings for select
    using (
        member_id = auth.uid()
        or coach_id = auth.uid()
        or public.is_admin()
    );

drop policy if exists bookings_update_own_cancel_or_staff on public.bookings;
create policy bookings_update_own_cancel_or_staff
    on public.bookings for update
    using (member_id = auth.uid() or coach_id = auth.uid() or public.is_admin())
    with check (member_id = auth.uid() or coach_id = auth.uid() or public.is_admin());

-- bookings_insert_own (member own or staff) and bookings_delete_staff remain
-- as-is: members request their own bookings and staff insert on behalf of a
-- member is an accepted admin/coach operation.

-- ------------------------------------------------------------
-- Booking state machine (DB is the final authority)
-- ------------------------------------------------------------
-- Allowed transitions:
--   PENDING   -> CONFIRMED | CANCELLED
--   CONFIRMED -> COMPLETED | NO_SHOW | CANCELLED
--   (COMPLETED / NO_SHOW require the scheduled time to have passed)
--   COMPLETED, CANCELLED, NO_SHOW are terminal (no restoration).
-- Members may only cancel their own ACTIVE future booking.
-- `member_id` / `session_id` are immutable for everyone; `coach_id` can only
-- be reassigned by an admin; members cannot edit scheduling or notes.
create or replace function public.enforce_booking_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Immutable identities.
    if new.member_id is distinct from old.member_id then
        raise exception using
            errcode = '42501',
            message = 'Booking ownership is immutable.';
    end if;
    if new.session_id is distinct from old.session_id then
        raise exception using
            errcode = '42501',
            message = 'A booking cannot be moved to a different session.';
    end if;
    if new.coach_id is distinct from old.coach_id and not public.is_admin() then
        raise exception using
            errcode = '42501',
            message = 'Only administrators can reassign the coach.';
    end if;

    -- No status change: only admin may reassign coach (checked above); only
    -- staff may edit scheduling/notes on an existing booking.
    if new.status = old.status then
        if auth.uid() is not null
           and not public.is_admin_or_coach()
           and (new.scheduled_at is distinct from old.scheduled_at
                or new.notes is distinct from old.notes) then
            raise exception using
                errcode = '42501',
                message = 'Only staff may edit booking details.';
        end if;
        return new;
    end if;

    -- service_role (auth.uid() is null) and staff follow the state machine.
    if auth.uid() is null or public.is_admin_or_coach() then
        if old.status = 'PENDING' and new.status in ('CONFIRMED', 'CANCELLED') then
            return new;
        end if;
        if old.status = 'CONFIRMED' then
            if new.status = 'CANCELLED' then
                return new;
            end if;
            if new.status in ('COMPLETED', 'NO_SHOW') and new.scheduled_at <= now() then
                return new;
            end if;
        end if;
        raise exception using
            errcode = '42501',
            message = 'Invalid booking status transition.';
    end if;

    -- Member: cancel their own active future booking — nothing else.
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

drop trigger if exists bookings_enforce_member_transition on public.bookings;
create trigger bookings_enforce_transition
    before update on public.bookings
    for each row execute procedure public.enforce_booking_transition();

drop function if exists public.enforce_member_booking_transition();

-- ------------------------------------------------------------
-- Lifecycle notifications (created only when the transition succeeds)
-- ------------------------------------------------------------
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
        insert into public.notifications (user_id, type, title, content)
        values (new.member_id, 'BOOKING', 'Booking confirmed', 'Your booking request has been confirmed.');
    elsif new.status = 'CANCELLED' then
        insert into public.notifications (user_id, type, title, content)
        values (new.member_id, 'BOOKING', 'Booking cancelled', 'Your booking has been cancelled.');
        -- Do not notify the coach about their own cancellation.
        if auth.uid() is distinct from new.coach_id then
            insert into public.notifications (user_id, type, title, content)
            values (new.coach_id, 'BOOKING', 'Booking cancelled', 'A booking was cancelled. The slot is now available again.');
        end if;
    elsif new.status = 'COMPLETED' then
        insert into public.notifications (user_id, type, title, content)
        values (new.member_id, 'BOOKING', 'Session completed', 'Great work — your session has been completed.');
    elsif new.status = 'NO_SHOW' then
        insert into public.notifications (user_id, type, title, content)
        values (new.member_id, 'BOOKING', 'No-show', 'You were marked as a no-show for your session.');
    end if;

    return new;
end;
$$;

drop trigger if exists bookings_notify_on_cancel on public.bookings;
create trigger bookings_notify_on_status_change
    after update on public.bookings
    for each row execute procedure public.notify_on_booking_status_change();

drop function if exists public.notify_on_booking_cancel();

-- ------------------------------------------------------------
-- Admin list indexes (indexed filtering/ordering for growth)
-- ------------------------------------------------------------
create index if not exists bookings_coach_status_idx
    on public.bookings (coach_id, status, scheduled_at);

create index if not exists bookings_member_scheduled_idx
    on public.bookings (member_id, scheduled_at);
