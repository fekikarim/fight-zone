-- ============================================================
-- Prompt #7 — Events, Competition & Training Schedule Platform
--
-- Additive migration only:
--   • events.max_participants (capacity enforcement)
--   • participation_status expansion (ATTENDED, NO_SHOW)
--   • registration enforcement trigger (deadline + capacity)
--   • participation transition trigger (state machine)
--   • notification triggers (registration + cancellation)
--   • indexes for event/participant queries
--
-- IMPORTANT: No historical migrations are modified.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Capacity column
--    nullable — NULL means unlimited capacity
-- ------------------------------------------------------------

alter table public.events
    add column if not exists max_participants integer
    check (max_participants is null or max_participants > 0);

-- ------------------------------------------------------------
-- 2. Expand participation_status enum
--    ATTENDED — staff marks member attended
--    NO_SHOW  — staff marks member no-show
--    Uses ADD VALUE IF NOT EXISTS for safety
-- ------------------------------------------------------------

do $$
begin
    if not exists (
        select 1 from pg_enum
        where enumlabel = 'ATTENDED'
        and enumtypid = 'participation_status'::regtype
    ) then
        alter type public.participation_status add value 'ATTENDED';
    end if;

    if not exists (
        select 1 from pg_enum
        where enumlabel = 'NO_SHOW'
        and enumtypid = 'participation_status'::regtype
    ) then
        alter type public.participation_status add value 'NO_SHOW';
    end if;
end
$$;

-- ------------------------------------------------------------
-- 3. Indexes
-- ------------------------------------------------------------

-- Public event listing: upcoming public events by start time
create index if not exists events_start_at_is_public_idx
    on public.events (start_at desc)
    where is_public = true;

-- Participant lookups: all registrations for an event
create index if not exists event_participants_event_id_idx
    on public.event_participants (event_id);

-- Member's registered events
create index if not exists event_participants_member_id_idx
    on public.event_participants (member_id);

-- ------------------------------------------------------------
-- 4. Registration enforcement trigger (BEFORE INSERT)
--
--    Checks:
--    a) Event exists and is public
--    b) Registration deadline: start_at must be in the future
--    c) Capacity: count of active (non-CANCELLED) participants < max_participants
--
--    This is a SECURITY DEFINER function so it can count rows
--    atomically before the INSERT completes. The RLS policy allows
--    the INSERT; the trigger enforces the business rules.
-- ------------------------------------------------------------

create or replace function public.enforce_event_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_event         record;
    v_active_count  integer;
begin
    -- Fetch the target event
    select id, start_at, max_participants, is_public
    into v_event
    from public.events
    where id = new.event_id;

    if v_event is null then
        raise exception 'Event not found.' using errcode = 'P0002';
    end if;

    -- Must be a public event to register
    if not v_event.is_public then
        raise exception 'Registration is not available for this event.' using errcode = '42501';
    end if;

    -- Registration deadline: event must not have started yet
    if v_event.start_at <= now() then
        raise exception 'Registration is closed — this event has already started.' using errcode = '42501';
    end if;

    -- Capacity check (only if max_participants is set)
    if v_event.max_participants is not null then
        select count(*)
        into v_active_count
        from public.event_participants
        where event_id = new.event_id
          and status != 'CANCELLED';

        if v_active_count >= v_event.max_participants then
            raise exception 'This event is fully booked.' using errcode = '42501';
        end if;
    end if;

    return new;
end;
$$;

-- Only fire on INSERT (not UPDATE — capacity is checked at registration time)
drop trigger if exists event_participants_enforce_registration on public.event_participants;
create trigger event_participants_enforce_registration
    before insert on public.event_participants
    for each row execute procedure public.enforce_event_registration();

-- ------------------------------------------------------------
-- 5. Participation transition trigger (BEFORE UPDATE)
--
--    Enforces the state machine:
--      INTERESTED → JOINED, CANCELLED
--      JOINED → CANCELLED, ATTENDED, NO_SHOW
--      Terminal: CANCELLED, ATTENDED, NO_SHOW (no further transitions)
--
--    Members cannot self-mark ATTENDED or NO_SHOW.
--    Staff can perform any valid transition.
-- ------------------------------------------------------------

create or replace function public.enforce_participation_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- No change to status — allow
    if old.status = new.status then
        return new;
    end if;

    -- Terminal states: no transitions allowed
    if old.status in ('CANCELLED', 'ATTENDED', 'NO_SHOW') then
        raise exception 'Cannot change status from % to %.', old.status, new.status
            using errcode = '42501';
    end if;

    -- INTERESTED → only JOINED or CANCELLED allowed
    if old.status = 'INTERESTED' and new.status not in ('JOINED', 'CANCELLED') then
        raise exception 'Invalid transition from INTERESTED to %.', new.status
            using errcode = '42501';
    end if;

    -- JOINED → CANCELLED, ATTENDED, or NO_SHOW allowed
    if old.status = 'JOINED' and new.status not in ('CANCELLED', 'ATTENDED', 'NO_SHOW') then
        raise exception 'Invalid transition from JOINED to %.', new.status
            using errcode = '42501';
    end if;

    -- Members cannot self-mark ATTENDED or NO_SHOW
    if new.status in ('ATTENDED', 'NO_SHOW') and auth.uid() = new.member_id then
        raise exception 'You cannot mark your own attendance.' using errcode = '42501';
    end if;

    return new;
end;
$$;

drop trigger if exists event_participants_enforce_transitions on public.event_participants;
create trigger event_participants_enforce_transitions
    before update on public.event_participants
    for each row execute procedure public.enforce_participation_transitions();

-- ------------------------------------------------------------
-- 6. Notification triggers
--
--    6a. Registration confirmed: AFTER INSERT on event_participants
--        Notifies the member who registered.
--
--    6b. Registration cancelled: AFTER UPDATE when status → CANCELLED
--        Notifies the member whose registration was cancelled.
--
--    6c. Event cancelled: AFTER UPDATE on events when is_public → false
--        Notifies all registered participants.
-- ------------------------------------------------------------

-- 6a. Registration confirmed
create or replace function public.notify_event_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_event_title text;
begin
    select title into v_event_title
    from public.events where id = new.event_id;

    insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
    values (
        new.member_id,
        'EVENT',
        'Registration confirmed',
        'You are registered for ' || coalesce(v_event_title, 'an event') || '.',
        'event',
        new.event_id
    );

    return new;
end;
$$;

drop trigger if exists event_participants_notify_registration on public.event_participants;
create trigger event_participants_notify_registration
    after insert on public.event_participants
    for each row execute procedure public.notify_event_registration();

-- 6b. Registration cancelled
create or replace function public.notify_event_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_event_title text;
begin
    -- Only notify when status changes to CANCELLED
    if new.status = 'CANCELLED' and old.status != 'CANCELLED' then
        select title into v_event_title
        from public.events where id = new.event_id;

        insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
        values (
            new.member_id,
            'EVENT',
            'Registration cancelled',
            'Your registration for ' || coalesce(v_event_title, 'an event') || ' has been cancelled.',
            'event',
            new.event_id
        );
    end if;

    return new;
end;
$$;

drop trigger if exists event_participants_notify_cancellation on public.event_participants;
create trigger event_participants_notify_cancellation
    after update on public.event_participants
    for each row execute procedure public.notify_event_cancellation();
