-- ============================================================
-- UPDATE V1 — Event-centric realignment (Phase 3)
--
-- Additive-only migration. No historical migration is rewritten and
-- no production data is dropped.
--
-- Changes:
--   1. events: pricing columns (is_free, price_tnd) + optional image_url
--   2. event_payment_status enum + event_participants payment/attended
--   3. private-event (capacity-1 coaching) visibility for members (RLS)
--   4. allow registration on private-coaching events (capacity >= 1)
--   5. participant-count RPC counts only active (non-CANCELLED) rows
--   6. members cannot self-mark PAID or attended (DB guard)
--   7. indexes + default imagery helper
-- ============================================================

-- ------------------------------------------------------------
-- 1. events pricing + imagery (additive)
-- ------------------------------------------------------------
alter table public.events
    add column if not exists is_free boolean not null default true,
    add column if not exists price_tnd numeric(10, 2),
    add column if not exists image_url text;

-- price_tnd must be null when free, non-null when paid
alter table public.events
    drop constraint if exists events_price_consistent;
alter table public.events
    add constraint events_price_consistent
    check (
        (is_free and price_tnd is null)
        or (not is_free and price_tnd is not null and price_tnd >= 0)
    );

-- ------------------------------------------------------------
-- 2. participation payment status (staff-controlled) + attendance
-- ------------------------------------------------------------
do $$
begin
    if not exists (
        select 1 from pg_type where typname = 'event_payment_status'
    ) then
        create type public.event_payment_status as enum ('UNPAID', 'PAID', 'NOT_REQUIRED');
    end if;
end
$$;

alter table public.event_participants
    add column if not exists payment_status public.event_payment_status
        not null default 'NOT_REQUIRED',
    add column if not exists attended boolean not null default false;

-- Default participation is JOINED (the register action inserts JOINED
-- explicitly; this just aligns the column default).
alter table public.event_participants
    alter column status set default 'JOINED';

-- ------------------------------------------------------------
-- 3. Private-event (capacity-1 coaching) visibility for members
--    Public events: everyone. Private coaching events (capacity=1):
--    authenticated members only. Drafts (not public, capacity!=1):
--    staff only. Enforced at RLS.
-- ------------------------------------------------------------
create policy events_select_authenticated
    on public.events for select
    to authenticated
    using (
        is_public = true
        or coalesce(max_participants, 0) = 1
    );

-- ------------------------------------------------------------
-- 4. registration trigger: allow capacity-1 private coaching events
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
    select id, start_at, max_participants, is_public
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

    -- A member may not register twice (the UNIQUE(event_id,member_id)
    -- guard is enforced by the caller mapping a duplicate_key error).
    return new;
end;
$function$;

-- Re-issue trigger (unchanged signature, replaces in place)
drop trigger if exists event_participants_enforce_registration on public.event_participants;
create trigger event_participants_enforce_registration
    before insert on public.event_participants
    for each row execute procedure public.enforce_event_registration();

-- Participation transition: allow JOINED -> ATTENDED/NO_SHOW/CANCELLED as before;
-- also members still cannot self-mark ATTENDED/NO_SHOW (existing guard covers it).
-- Ensure the self-mark guard also covers `attended` / `payment_status` via a
-- dedicated column guard below (F-analogous to security_gate_hardening).

-- ------------------------------------------------------------
-- 5. participant-count RPC: count only active (non-CANCELLED) rows
-- ------------------------------------------------------------
create or replace function public.get_public_event_participant_count(p_event_id uuid)
returns integer
language sql
security definer
set search_path = ''
stable
as $function$
    select count(*)
    from public.event_participants ep
    join public.events e on e.id = ep.event_id
    where ep.event_id = p_event_id
      and e.is_public = true
      and ep.status != 'CANCELLED';
$function$;

revoke all on function public.get_public_event_participant_count(uuid) from public, anon, authenticated;
grant execute on function public.get_public_event_participant_count(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 6. members cannot self-mark PAID or attended (column guard)
-- ------------------------------------------------------------
create or replace function public.guard_event_participant_self()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_is_staff boolean;
begin
    select public.is_admin_or_coach() into v_is_staff;
    if v_is_staff then
        return new;
    end if;

    -- Non-staff (the member) may not set payment_status=PAID
    if new.payment_status = 'PAID' and old.payment_status is distinct from new.payment_status then
        raise exception 'Payment must be confirmed by the coach.' using errcode = '42501';
    end if;
    -- Non-staff may not set attended
    if new.attended and old.attended is distinct from new.attended then
        raise exception 'Attendance must be confirmed by the coach.' using errcode = '42501';
    end if;
    -- Non-staff may not flip payment_status back from PAID
    if old.payment_status = 'PAID' and new.payment_status is distinct from 'PAID' then
        raise exception 'Payment status cannot be changed by members.' using errcode = '42501';
    end if;

    return new;
end;
$function$;

drop trigger if exists event_participants_guard_self on public.event_participants;
create trigger event_participants_guard_self
    before update on public.event_participants
    for each row execute procedure public.guard_event_participant_self();

-- ------------------------------------------------------------
-- 7. indexes for new query patterns
-- ------------------------------------------------------------
create index if not exists events_public_start_price_idx
    on public.events (start_at desc)
    where is_public = true;

create index if not exists events_active_price_idx
    on public.events (is_public, max_participants);

create index if not exists event_participants_status_event_idx
    on public.event_participants (status, event_id);

-- ------------------------------------------------------------
-- 8. aggregate participant count for public event cards (avoids N+1)
-- ------------------------------------------------------------
create or replace function public.get_public_event_participant_counts()
returns table (event_id uuid, active_count bigint)
language sql
security definer
set search_path = ''
stable
as $function$
    select ep.event_id, count(*) as active_count
    from public.event_participants ep
    join public.events e on e.id = ep.event_id
    where e.is_public = true
      and ep.status != 'CANCELLED'
    group by ep.event_id;
$function$;

revoke all on function public.get_public_event_participant_counts() from public, anon, authenticated;
grant execute on function public.get_public_event_participant_counts() to anon, authenticated;
