-- ============================================================
-- COACH NEWS & EVENTS MANAGEMENT (production-ready model)
--
-- Additive-only migration.
--
-- NEWS
--   * excerpt (nullable; app derives a fallback from content)
--   * category (constrained vocabulary for filtering)
--   * index for category-filtered published listing
--
-- EVENTS
--   * event_format INDIVIDUAL|COLLECTIVE, persisted (was a client-only
--     radio that never reached the server); backfilled from the
--     established convention (!is_public AND max_participants = 1).
--   * Authoritative payment default on registration: free events always
--     NOT_REQUIRED; paid events UNPAID unless staff explicitly confirms
--     PAID at insert time. Members can never self-mark PAID.
--   * Re-join: CANCELLED -> JOINED is allowed again (members who cancel
--     can return), with deadline + capacity re-checked under the event
--     row lock and attendance reset. All other terminal states stay
--     terminal.
--   * Capacity guard: max_participants cannot be lowered below the
--     current active (non-CANCELLED) participant count.
-- ============================================================

-- ------------------------------------------------------------
-- 1. News attributes
-- ------------------------------------------------------------
alter table public.news
    add column if not exists excerpt text;

alter table public.news
    add column if not exists category text not null default 'GENERAL';

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'news_category_valid'
    ) then
        alter table public.news
            add constraint news_category_valid check (category in (
                'GENERAL', 'TRAINING', 'NUTRITION',
                'COMPETITION', 'COMMUNITY', 'ANNOUNCEMENT'
            ));
    end if;
end $$;

-- Backfill excerpts for existing rows that have content.
update public.news
    set excerpt = left(btrim(content), 160)
    where excerpt is null
      and content is not null
      and btrim(content) <> '';

create index if not exists news_category_published_idx
    on public.news (category, published_at desc)
    where is_published = true;

-- ------------------------------------------------------------
-- 2. Event format (individual / collective)
-- ------------------------------------------------------------
alter table public.events
    add column if not exists event_format text not null default 'COLLECTIVE';

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'events_format_valid'
    ) then
        alter table public.events
            add constraint events_format_valid check (event_format in (
                'INDIVIDUAL', 'COLLECTIVE'
            ));
    end if;
end $$;

-- Backfill from the established convention: private capacity-1
-- coaching is individual; everything else is collective.
update public.events
    set event_format = 'INDIVIDUAL'
    where is_public = false
      and max_participants = 1;

create index if not exists events_format_idx
    on public.events (event_format);

-- ------------------------------------------------------------
-- 3. Authoritative payment default on registration
-- ------------------------------------------------------------
create or replace function public.enforce_event_registration()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_event         record;
    v_active_count  integer;
begin
    select id, start_at, max_participants, is_public, is_free
    into v_event
    from public.events
    where id = new.event_id
    for update;

    if v_event is null then
        raise exception 'Event not found.' using errcode = 'P0002';
    end if;

    -- Registerable when public OR a private-coaching (capacity-1) event
    if not v_event.is_public and coalesce(v_event.max_participants, 0) != 1 then
        raise exception 'Registration is not available for this event.' using errcode = '42501';
    end if;

    -- Deadline: event must not have started
    if v_event.start_at <= now() then
        raise exception 'Registration is closed — this event has already started.' using errcode = '42501';
    end if;

    -- Capacity check
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

    -- Authoritative payment default (no client trust): free events are
    -- always NOT_REQUIRED; paid events start UNPAID for members. Staff
    -- may confirm PAID explicitly at insert time (e.g. cash collected
    -- at the desk while enrolling), which is preserved.
    if v_event.is_free then
        new.payment_status := 'NOT_REQUIRED';
    elsif not public.is_admin_or_coach() then
        new.payment_status := 'UNPAID';
    elsif new.payment_status = 'NOT_REQUIRED' then
        new.payment_status := 'UNPAID';
    end if;

    -- A member may not register twice (the UNIQUE(event_id,member_id)
    -- guard is enforced by the caller mapping a duplicate_key error).
    return new;
end;
$function$;

drop trigger if exists event_participants_enforce_registration on public.event_participants;
create trigger event_participants_enforce_registration
    before insert on public.event_participants
    for each row execute procedure public.enforce_event_registration();

-- ------------------------------------------------------------
-- 4. Re-join: CANCELLED -> JOINED with re-validation
-- ------------------------------------------------------------
create or replace function public.enforce_participation_transitions()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
declare
    v_event        record;
    v_active_count integer;
begin
    -- No change to status — allow
    if old.status = new.status then
        return new;
    end if;

    -- Re-join: a cancelled member returns. Deadline and capacity are
    -- re-checked under the event row lock (serializes concurrent
    -- re-joins for the last slot exactly like first-time joins).
    -- Attendance is reset; a kept PAID stays kept (staff-confirmed).
    if old.status = 'CANCELLED' and new.status = 'JOINED' then
        select id, start_at, max_participants
        into v_event
        from public.events
        where id = new.event_id
        for update;

        if v_event is null then
            raise exception 'Event not found.' using errcode = 'P0002';
        end if;

        if v_event.start_at <= now() then
            raise exception 'Registration is closed — this event has already started.' using errcode = '42501';
        end if;

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

        new.attended := false;
        new.joined_at := now();
        return new;
    end if;

    -- Terminal states: no transitions allowed (CANCELLED is handled
    -- above for the single re-join case)
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
-- 5. Capacity cannot be lowered below the active headcount
-- ------------------------------------------------------------
create or replace function public.guard_event_capacity_update()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_active_count integer;
begin
    if new.max_participants is null then
        return new;
    end if;

    if old.max_participants is not null
       and new.max_participants >= old.max_participants then
        return new;
    end if;

    select count(*)
    into v_active_count
    from public.event_participants
    where event_id = new.id
      and status != 'CANCELLED';

    if v_active_count > new.max_participants then
        raise exception 'Cannot reduce capacity below % active participants.', v_active_count
            using errcode = '42501';
    end if;

    return new;
end;
$function$;

drop trigger if exists events_guard_capacity_update on public.events;
create trigger events_guard_capacity_update
    before update of max_participants on public.events
    for each row execute procedure public.guard_event_capacity_update();

-- Reload the PostgREST schema cache so the new columns are visible.
notify pgrst, 'reload schema';
