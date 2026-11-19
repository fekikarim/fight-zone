-- ============================================================
-- Fight Zone V1 — events, registrations, manual payments
--
-- Separate state machines (never one generic status):
--   events.status                         DRAFT | PUBLISHED | CANCELLED | ARCHIVED
--   event_participants.registration_status PENDING | CONFIRMED | WAITLISTED | REJECTED | CANCELLED
--   event_participants.payment_status      NOT_REQUIRED | UNPAID | PROOF_SUBMITTED | PAID | REJECTED | WAIVED
--   event_participants.attendance_status   UNMARKED | ATTENDED | NO_SHOW
--   payment_submissions.status             SUBMITTED | CONFIRMED | REJECTED
--
-- Seat policy (owner decision, safe default): PENDING and CONFIRMED
-- registrations hold a seat; WAITLISTED/REJECTED/CANCELLED do not.
--
-- All writes go through SECURITY DEFINER RPCs that authenticate,
-- authorize, lock the event row (capacity), audit and notify. Members can no
-- longer INSERT/UPDATE event_participants directly.
--
-- Legacy columns event_participants.status / attended are kept (not
-- dropped) and synced by trigger for backward compatibility.
-- ============================================================

-- ------------------------------------------------------------
-- Money: TND uses millimes (3 decimals). Widening scale is lossless.
-- ------------------------------------------------------------
alter table public.events alter column price_tnd type numeric(10,3);

-- ------------------------------------------------------------
-- Events: lifecycle + registration rules
-- ------------------------------------------------------------
alter table public.events add column if not exists status public.event_status not null default 'PUBLISHED';
alter table public.events add column if not exists registration_opens_at timestamptz;
alter table public.events add column if not exists registration_closes_at timestamptz;
alter table public.events add column if not exists requires_approval boolean not null default false;
alter table public.events add column if not exists waitlist_enabled boolean not null default false;
alter table public.events add column if not exists cancellation_deadline_hours integer not null default 0;
alter table public.events add column if not exists category text;
alter table public.events add column if not exists tags text[] not null default '{}';
alter table public.events add column if not exists requirements text;
alter table public.events add column if not exists cancelled_at timestamptz;
alter table public.events add column if not exists cancellation_reason text;

-- New events start as drafts (existing rows default to PUBLISHED above).
alter table public.events alter column status set default 'DRAFT';

alter table public.events drop constraint if exists events_registration_window_valid;
alter table public.events add constraint events_registration_window_valid check (
    registration_opens_at is null or registration_closes_at is null or registration_closes_at > registration_opens_at);
alter table public.events drop constraint if exists events_cancellation_deadline_valid;
alter table public.events add constraint events_cancellation_deadline_valid check (cancellation_deadline_hours between 0 and 720);
alter table public.events drop constraint if exists events_category_len;
alter table public.events add constraint events_category_len check (category is null or char_length(category) between 1 and 40);
alter table public.events drop constraint if exists events_tags_len;
alter table public.events add constraint events_tags_len check (cardinality(tags) <= 10);
alter table public.events drop constraint if exists events_requirements_len;
alter table public.events add constraint events_requirements_len check (requirements is null or char_length(requirements) <= 2000);
alter table public.events drop constraint if exists events_title_len;
alter table public.events add constraint events_title_len check (char_length(title) between 3 and 200);

create index if not exists events_status_start_idx on public.events (status, start_at);

-- ------------------------------------------------------------
-- Registrations: separate lifecycles + decision/payment metadata
-- ------------------------------------------------------------
alter table public.event_participants add column if not exists registration_status public.registration_status;
alter table public.event_participants add column if not exists attendance_status public.attendance_status not null default 'UNMARKED';
alter table public.event_participants add column if not exists amount_due_tnd numeric(10,3);
alter table public.event_participants add column if not exists created_at timestamptz not null default now();
alter table public.event_participants add column if not exists updated_at timestamptz not null default now();
alter table public.event_participants add column if not exists decided_at timestamptz;
alter table public.event_participants add column if not exists decided_by uuid references public.profiles(id) on delete set null;
alter table public.event_participants add column if not exists decision_reason text check (decision_reason is null or char_length(decision_reason) <= 500);
alter table public.event_participants add column if not exists cancelled_at timestamptz;
alter table public.event_participants add column if not exists cancelled_by uuid references public.profiles(id) on delete set null;
alter table public.event_participants add column if not exists waitlisted_at timestamptz;
alter table public.event_participants add column if not exists attendance_recorded_at timestamptz;
alter table public.event_participants add column if not exists attendance_recorded_by uuid references public.profiles(id) on delete set null;
alter table public.event_participants add column if not exists payment_confirmed_at timestamptz;
alter table public.event_participants add column if not exists payment_confirmed_by uuid references public.profiles(id) on delete set null;

-- Backfill from the legacy participation_status.
update public.event_participants ep set
    registration_status = case ep.status
        when 'CANCELLED'  then 'CANCELLED'::public.registration_status
        when 'INTERESTED' then 'PENDING'::public.registration_status
        else 'CONFIRMED'::public.registration_status end,
    attendance_status = case ep.status
        when 'ATTENDED' then 'ATTENDED'::public.attendance_status
        when 'NO_SHOW'  then 'NO_SHOW'::public.attendance_status
        else (case when ep.attended then 'ATTENDED' else 'UNMARKED' end)::public.attendance_status end,
    amount_due_tnd = case when e.is_free then 0 else coalesce(e.price_tnd, 0) end,
    created_at = ep.joined_at
from public.events e
where e.id = ep.event_id and ep.registration_status is null;

alter table public.event_participants alter column registration_status set not null;
alter table public.event_participants alter column registration_status set default 'PENDING';
alter table public.event_participants alter column amount_due_tnd set default 0;
update public.event_participants set amount_due_tnd = 0 where amount_due_tnd is null;
alter table public.event_participants alter column amount_due_tnd set not null;
alter table public.event_participants drop constraint if exists event_participants_amount_nonneg;
alter table public.event_participants add constraint event_participants_amount_nonneg check (amount_due_tnd >= 0);

create index if not exists event_participants_event_reg_idx on public.event_participants (event_id, registration_status);
create index if not exists event_participants_member_idx on public.event_participants (member_id, registration_status);
create index if not exists event_participants_payment_idx on public.event_participants (payment_status) where payment_status in ('PROOF_SUBMITTED', 'UNPAID');

-- Drop V0 write-path triggers (replaced by RPCs) and keep legacy columns in sync.
drop trigger if exists event_participants_enforce_registration on public.event_participants;
drop trigger if exists event_participants_enforce_transitions on public.event_participants;
drop trigger if exists event_participants_guard_self on public.event_participants;
drop trigger if exists event_participants_notify_cancellation on public.event_participants;
drop trigger if exists event_participants_notify_registration on public.event_participants;

create or replace function public.sync_legacy_participation()
returns trigger language plpgsql set search_path = public as $$
begin
    new.status := case
        when new.registration_status in ('CANCELLED', 'REJECTED') then 'CANCELLED'
        when new.registration_status = 'WAITLISTED' then 'INTERESTED'
        when new.attendance_status = 'ATTENDED' then 'ATTENDED'
        when new.attendance_status = 'NO_SHOW' then 'NO_SHOW'
        when new.registration_status = 'PENDING' then 'INTERESTED'
        else 'JOINED' end::public.participation_status;
    new.attended := new.attendance_status = 'ATTENDED';
    new.updated_at := now();
    return new;
end;
$$;
drop trigger if exists event_participants_sync_legacy on public.event_participants;
create trigger event_participants_sync_legacy
    before insert or update on public.event_participants
    for each row execute function public.sync_legacy_participation();

-- RLS: reads stay owner-or-staff; ALL writes go through RPCs.
drop policy if exists event_participants_insert_own on public.event_participants;
drop policy if exists event_participants_update_own_or_staff on public.event_participants;
drop policy if exists event_participants_delete_staff on public.event_participants;
revoke insert, update, delete on public.event_participants from anon, authenticated;

-- ------------------------------------------------------------
-- Private-event invitations (fixes V0 leak: every member could read
-- every capacity-1 private event).
-- ------------------------------------------------------------
create table if not exists public.event_invitations (
    event_id   uuid not null references public.events(id) on delete cascade,
    member_id  uuid not null references public.profiles(id) on delete cascade,
    invited_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    primary key (event_id, member_id)
);
create index if not exists event_invitations_member_idx on public.event_invitations (member_id);
alter table public.event_invitations enable row level security;
drop policy if exists event_invitations_select on public.event_invitations;
create policy event_invitations_select on public.event_invitations
    for select to authenticated using (member_id = auth.uid() or public.is_admin_or_coach());
revoke insert, update, delete on public.event_invitations from anon, authenticated;
grant select on public.event_invitations to authenticated;

-- Backfill: members already registered to a private event keep access.
insert into public.event_invitations (event_id, member_id)
select ep.event_id, ep.member_id from public.event_participants ep
  join public.events e on e.id = ep.event_id
 where not e.is_public
on conflict do nothing;

-- SECURITY DEFINER so the events policy works for anon too (anon has no
-- privilege on event_invitations) and stays an index lookup.
create or replace function public.is_invited_to_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select auth.uid() is not null and exists (
        select 1 from public.event_invitations i where i.event_id = p_event_id and i.member_id = auth.uid());
$$;
revoke all on function public.is_invited_to_event(uuid) from public;
grant execute on function public.is_invited_to_event(uuid) to anon, authenticated;

drop policy if exists events_select_authenticated on public.events;
drop policy if exists events_select_public on public.events;
drop policy if exists events_select_visible on public.events;
create policy events_select_visible on public.events
    for select using (
        status in ('PUBLISHED', 'CANCELLED')
        and (is_public or public.is_invited_to_event(id))
    );

-- ------------------------------------------------------------
-- Payment proofs (private evidence) + income ledger
-- ------------------------------------------------------------
create table if not exists public.payment_submissions (
    id               uuid primary key default gen_random_uuid(),
    registration_id  uuid not null references public.event_participants(id) on delete cascade,
    member_id        uuid not null references public.profiles(id) on delete cascade,
    amount_declared  numeric(10,3) not null check (amount_declared >= 0),
    transfer_reference text check (transfer_reference is null or char_length(transfer_reference) <= 120),
    member_note      text check (member_note is null or char_length(member_note) <= 1000),
    proof_path       text not null,
    proof_mime       text not null check (proof_mime in ('image/png','image/jpeg','image/webp','application/pdf')),
    proof_size       integer not null check (proof_size between 1 and 5242880),
    status           public.payment_submission_status not null default 'SUBMITTED',
    reviewed_by      uuid references public.profiles(id) on delete set null,
    reviewed_at      timestamptz,
    rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
    created_at       timestamptz not null default now(),
    constraint payment_submissions_proof_path_owner check (proof_path like member_id::text || '/payments/%')
);
-- At most one submission awaiting review per registration.
create unique index if not exists payment_submissions_one_open_uidx
    on public.payment_submissions (registration_id) where status = 'SUBMITTED';
create index if not exists payment_submissions_status_idx on public.payment_submissions (status, created_at desc);
alter table public.payment_submissions enable row level security;
drop policy if exists payment_submissions_select on public.payment_submissions;
create policy payment_submissions_select on public.payment_submissions
    for select to authenticated using (member_id = auth.uid() or public.is_admin_or_coach());
revoke insert, update, delete on public.payment_submissions from anon, authenticated;
grant select on public.payment_submissions to authenticated;

-- Income ledger: payments rows explicitly recorded/confirmed by Seif.
alter table public.payments add column if not exists registration_id uuid references public.event_participants(id) on delete set null;
alter table public.payments add column if not exists submission_id uuid references public.payment_submissions(id) on delete set null;
alter table public.payments add column if not exists recorded_by uuid references public.profiles(id) on delete set null;
alter table public.payments add column if not exists note text check (note is null or char_length(note) <= 500);
alter table public.payments alter column amount type numeric(10,3);
-- A registration is counted as income at most once.
create unique index if not exists payments_registration_paid_uidx
    on public.payments (registration_id) where registration_id is not null and status = 'PAID';
create index if not exists payments_paid_at_idx on public.payments (paid_at desc) where status = 'PAID';

-- ------------------------------------------------------------
-- Seat accounting
-- ------------------------------------------------------------
create or replace function public.event_seats_taken(p_event_id uuid)
returns integer language sql stable security definer set search_path = public as $$
    select count(*)::int from public.event_participants
     where event_id = p_event_id and registration_status in ('PENDING', 'CONFIRMED');
$$;
revoke all on function public.event_seats_taken(uuid) from public, anon, authenticated;

-- Redefine V0 count helpers on the V1 seat definition (signatures unchanged).
create or replace function public.get_public_event_participant_count(p_event_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
    select count(*)::int from public.event_participants ep
      join public.events e on e.id = ep.event_id
     where ep.event_id = p_event_id and e.is_public and e.status in ('PUBLISHED', 'CANCELLED')
       and ep.registration_status in ('PENDING', 'CONFIRMED');
$$;
create or replace function public.get_public_event_participant_counts()
returns table (event_id uuid, active_count bigint) language sql stable security definer set search_path = '' as $$
    select ep.event_id, count(*) from public.event_participants ep
      join public.events e on e.id = ep.event_id
     where e.is_public and e.status in ('PUBLISHED', 'CANCELLED')
       and ep.registration_status in ('PENDING', 'CONFIRMED')
     group by ep.event_id;
$$;
create or replace function public.get_staff_event_participant_counts()
returns table (event_id uuid, active_count bigint) language plpgsql stable security definer set search_path = '' as $$
begin
    if not public.is_admin_or_coach() then return; end if;
    return query select ep.event_id, count(*) from public.event_participants ep
     where ep.registration_status in ('PENDING', 'CONFIRMED') group by ep.event_id;
end;
$$;
-- Seat count for an event the caller can see (members: public or invited).
create or replace function public.get_event_seats_taken(p_event_id uuid)
returns integer language sql stable security definer set search_path = public as $$
    select case when exists (
        select 1 from public.events e where e.id = p_event_id and (
            public.is_admin_or_coach()
            or (e.status in ('PUBLISHED','CANCELLED') and (e.is_public or exists (
                select 1 from public.event_invitations i where i.event_id = e.id and i.member_id = auth.uid()))))
    ) then public.event_seats_taken(p_event_id) else null end;
$$;
revoke all on function public.get_event_seats_taken(uuid) from public;
grant execute on function public.get_event_seats_taken(uuid) to anon, authenticated;

create or replace function public.get_event_joined_participants(p_event_id uuid)
returns table (member_id uuid, email text, full_name text) language sql stable security definer set search_path = '' as $$
    select ep.member_id, p.email, p.full_name from public.event_participants ep
      join public.profiles p on p.id = ep.member_id
     where ep.event_id = p_event_id and ep.registration_status = 'CONFIRMED';
$$;
create or replace function public.get_events_in_range(p_start timestamptz, p_end timestamptz)
returns table (id uuid, title text, description text, start_at timestamptz, end_at timestamptz, location text,
               event_type public.event_type, is_public boolean, max_participants integer, is_free boolean,
               price_tnd numeric, created_by uuid, participant_count bigint)
language sql stable security definer set search_path = '' as $$
    select e.id, e.title, e.description, e.start_at, e.end_at, e.location, e.event_type, e.is_public,
           e.max_participants, e.is_free, e.price_tnd, e.created_by,
           count(ep.id) filter (where ep.registration_status in ('PENDING','CONFIRMED'))
      from public.events e
      left join public.event_participants ep on ep.event_id = e.id
     where e.start_at >= p_start and e.start_at < p_end and e.status = 'PUBLISHED'
     group by e.id order by e.start_at;
$$;
create or replace function public.get_event_fingerprint(p_event_id uuid)
returns table (id uuid, title text, description text, start_at timestamptz, end_at timestamptz, location text,
               event_type public.event_type, is_public boolean, max_participants integer, is_free boolean,
               price_tnd numeric, created_by uuid, participant_count bigint)
language sql stable security definer set search_path = '' as $$
    select e.id, e.title, e.description, e.start_at, e.end_at, e.location, e.event_type, e.is_public,
           e.max_participants, e.is_free, e.price_tnd, e.created_by,
           count(ep.id) filter (where ep.registration_status in ('PENDING','CONFIRMED'))
      from public.events e
      left join public.event_participants ep on ep.event_id = e.id
     where e.id = p_event_id group by e.id;
$$;

-- Capacity reduction guard (V1 seat definition).
create or replace function public.guard_event_capacity_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_taken integer;
begin
    if new.max_participants is null
       or (old.max_participants is not null and new.max_participants >= old.max_participants) then
        return new;
    end if;
    v_taken := public.event_seats_taken(new.id);
    if v_taken > new.max_participants then
        raise exception 'Cannot reduce capacity to % — % places are already taken. Cancel or move registrations first.',
            new.max_participants, v_taken using errcode = '42501';
    end if;
    return new;
end;
$$;

-- ------------------------------------------------------------
-- Internal helpers
-- ------------------------------------------------------------
create or replace function public.event_date_label(p_start timestamptz)
returns text language sql stable set search_path = public as $$
    select to_char(p_start at time zone coalesce((select timezone from public.site_settings where id = 1), 'Africa/Tunis'),
                   'Dy DD Mon YYYY, HH24:MI');
$$;

create or replace function public.require_staff()
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
    if auth.uid() is null or not public.is_admin_or_coach() then
        raise exception 'Only Coach Seif can do this.' using errcode = '42501';
    end if;
    return auth.uid();
end;
$$;
revoke all on function public.require_staff() from public, anon, authenticated;

-- Promote waitlisted members (oldest first) while seats are free.
create or replace function public.promote_waitlist(p_event_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
    v_event  record;
    v_next   record;
    v_count  integer := 0;
    v_status public.registration_status;
begin
    select id, title, start_at, max_participants, requires_approval, status
      into v_event from public.events where id = p_event_id for update;
    if v_event is null or v_event.status <> 'PUBLISHED' or v_event.start_at <= now() then
        return 0;
    end if;
    loop
        exit when v_event.max_participants is not null
              and public.event_seats_taken(p_event_id) >= v_event.max_participants;
        select id, member_id into v_next from public.event_participants
         where event_id = p_event_id and registration_status = 'WAITLISTED'
         order by waitlisted_at nulls last, created_at limit 1 for update skip locked;
        exit when v_next is null;
        v_status := case when v_event.requires_approval then 'PENDING' else 'CONFIRMED' end;
        update public.event_participants
           set registration_status = v_status, decided_at = now()
         where id = v_next.id;
        perform public.notify_user(v_next.member_id, 'EVENT',
            case when v_status = 'CONFIRMED' then 'A place opened up — you''re in!' else 'A place opened up' end,
            v_event.title, 'event', p_event_id, 'reg:' || v_next.id || ':promoted:' || extract(epoch from now())::bigint);
        perform public.send_system_message(v_next.member_id,
            case when v_status = 'CONFIRMED' then 'registration_confirmed' else 'registration_pending' end,
            jsonb_build_object('event_title', v_event.title, 'event_date', public.event_date_label(v_event.start_at)),
            'reg:' || v_next.id || ':promoted:' || extract(epoch from now())::bigint);
        v_count := v_count + 1;
    end loop;
    return v_count;
end;
$$;
revoke all on function public.promote_waitlist(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Member RPCs
-- ------------------------------------------------------------

-- Capacity-safe registration. Returns the registration's three states.
create or replace function public.register_for_event(p_event_id uuid)
returns table (registration_id uuid, registration_status public.registration_status,
               payment_status public.event_payment_status, amount_due_tnd numeric)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
    v_uid    uuid := auth.uid();
    v_event  record;
    v_own    record;
    v_status public.registration_status;
    v_pay    public.event_payment_status;
    v_amount numeric(10,3);
    v_id     uuid;
    v_tpl    text;
begin
    if v_uid is null then
        raise exception 'Please sign in to register.' using errcode = '42501';
    end if;
    if not exists (select 1 from public.profiles where id = v_uid and is_active) then
        raise exception 'Your account is not active.' using errcode = '42501';
    end if;

    -- Row lock serializes concurrent registrations for the same event.
    select * into v_event from public.events where id = p_event_id for update;
    if v_event is null or v_event.status <> 'PUBLISHED'
       or (not v_event.is_public and not exists (
            select 1 from public.event_invitations i where i.event_id = p_event_id and i.member_id = v_uid)) then
        raise exception 'This event is not available.' using errcode = 'P0002';
    end if;
    if v_event.start_at <= now() then
        raise exception 'Registration is closed — this event has already started.' using errcode = '42501';
    end if;
    if v_event.registration_opens_at is not null and now() < v_event.registration_opens_at then
        raise exception 'Registration has not opened yet.' using errcode = '42501';
    end if;
    if v_event.registration_closes_at is not null and now() >= v_event.registration_closes_at then
        raise exception 'Registration for this event is closed.' using errcode = '42501';
    end if;

    select id, registration_status into v_own from public.event_participants
     where event_id = p_event_id and member_id = v_uid for update;
    if v_own is not null and v_own.registration_status in ('PENDING', 'CONFIRMED', 'WAITLISTED') then
        raise exception 'You are already registered for this event.' using errcode = '23505';
    end if;

    if v_event.max_participants is not null
       and public.event_seats_taken(p_event_id) >= v_event.max_participants then
        if not v_event.waitlist_enabled then
            raise exception 'This event is fully booked.' using errcode = '42501';
        end if;
        v_status := 'WAITLISTED';
    elsif v_event.requires_approval then
        v_status := 'PENDING';
    else
        v_status := 'CONFIRMED';
    end if;

    -- Amount snapshot: later price edits never change what this member owes.
    v_amount := case when v_event.is_free then 0 else coalesce(v_event.price_tnd, 0) end;
    v_pay := case when v_event.is_free or v_amount = 0 then 'NOT_REQUIRED' else 'UNPAID' end;

    perform public.ensure_member_profile(v_uid);
    if v_own is null then
        insert into public.event_participants (event_id, member_id, registration_status, payment_status,
                                               amount_due_tnd, joined_at, waitlisted_at)
        values (p_event_id, v_uid, v_status, v_pay, v_amount, now(),
                case when v_status = 'WAITLISTED' then now() end)
        returning id into v_id;
    else
        -- Re-registration after cancel/reject reuses the unique row.
        update public.event_participants set
            registration_status = v_status, payment_status = v_pay, amount_due_tnd = v_amount,
            attendance_status = 'UNMARKED', joined_at = now(), decided_at = null, decided_by = null,
            decision_reason = null, cancelled_at = null, cancelled_by = null,
            waitlisted_at = case when v_status = 'WAITLISTED' then now() end,
            payment_confirmed_at = null, payment_confirmed_by = null
        where id = v_own.id
        returning id into v_id;
    end if;

    v_tpl := case v_status when 'CONFIRMED' then 'registration_confirmed'
                           when 'PENDING' then 'registration_pending' else 'registration_waitlisted' end;
    perform public.notify_user(v_uid, 'EVENT',
        case v_status when 'CONFIRMED' then 'Registration confirmed'
                      when 'PENDING' then 'Registration received' else 'Added to the waitlist' end,
        v_event.title, 'event', p_event_id, 'reg:' || v_id || ':' || v_status || ':' || extract(epoch from now())::bigint);
    perform public.send_system_message(v_uid, v_tpl,
        jsonb_build_object('event_title', v_event.title, 'event_date', public.event_date_label(v_event.start_at)),
        'reg:' || v_id || ':' || v_status || ':' || extract(epoch from now())::bigint);
    if v_pay = 'UNPAID' and v_status <> 'WAITLISTED' then
        perform public.send_system_message(v_uid, 'payment_instructions',
            jsonb_build_object('event_title', v_event.title, 'amount', public.format_tnd(v_amount)),
            'reg:' || v_id || ':payinfo:' || extract(epoch from now())::bigint);
    end if;
    -- Seif is told about requests needing a decision.
    if v_status = 'PENDING' then
        perform public.notify_user(public.platform_owner_id(), 'EVENT', 'New registration request',
            v_event.title, 'event', p_event_id, 'reg:' || v_id || ':staff:' || extract(epoch from now())::bigint);
    end if;

    return query select v_id, v_status, v_pay, v_amount;
end;
$$;
revoke all on function public.register_for_event(uuid) from public, anon;
grant execute on function public.register_for_event(uuid) to authenticated;

-- Member cancels their own active registration (before the deadline).
create or replace function public.cancel_my_registration(p_registration_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
    v_uid   uuid := auth.uid();
    v_reg   record;
    v_event record;
begin
    if v_uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
    select * into v_reg from public.event_participants where id = p_registration_id and member_id = v_uid;
    if v_reg is null then raise exception 'Registration not found.' using errcode = 'P0002'; end if;

    select * into v_event from public.events where id = v_reg.event_id for update;
    select * into v_reg from public.event_participants where id = p_registration_id for update;
    if v_reg.registration_status not in ('PENDING', 'CONFIRMED', 'WAITLISTED') then
        raise exception 'This registration is not active.' using errcode = '42501';
    end if;
    if v_event.start_at <= now() + make_interval(hours => v_event.cancellation_deadline_hours) then
        raise exception 'The cancellation deadline for this event has passed. Please message Coach Seif.' using errcode = '42501';
    end if;
    if v_reg.payment_status = 'PAID' then
        raise exception 'Your payment was already confirmed — please message Coach Seif to cancel.' using errcode = '42501';
    end if;

    update public.event_participants set registration_status = 'CANCELLED', cancelled_at = now(), cancelled_by = v_uid
     where id = p_registration_id;
    -- An open proof becomes moot.
    update public.payment_submissions set status = 'REJECTED', rejection_reason = 'Registration cancelled by member.',
           reviewed_at = now()
     where registration_id = p_registration_id and status = 'SUBMITTED';
    if v_reg.payment_status = 'PROOF_SUBMITTED' then
        update public.event_participants set payment_status = 'UNPAID' where id = p_registration_id;
    end if;

    perform public.notify_user(public.platform_owner_id(), 'EVENT', 'Registration cancelled by member',
        v_event.title, 'event', v_event.id, 'reg:' || p_registration_id || ':member-cancel:' || extract(epoch from now())::bigint);
    perform public.promote_waitlist(v_event.id);
end;
$$;
revoke all on function public.cancel_my_registration(uuid) from public, anon;
grant execute on function public.cancel_my_registration(uuid) to authenticated;

-- Member submits bank-transfer evidence for their own registration. The
-- file must already be uploaded under <uid>/payments/ in the private bucket.
create or replace function public.submit_payment_proof(
    p_registration_id uuid, p_proof_path text, p_amount numeric,
    p_reference text default null, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public, storage as $$
declare
    v_uid   uuid := auth.uid();
    v_reg   record;
    v_event record;
    v_obj   record;
    v_id    uuid;
    v_allow boolean;
begin
    if v_uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
    select * into v_reg from public.event_participants where id = p_registration_id and member_id = v_uid for update;
    if v_reg is null then raise exception 'Registration not found.' using errcode = 'P0002'; end if;
    if v_reg.registration_status not in ('PENDING', 'CONFIRMED') then
        raise exception 'Payment can only be submitted for an active registration.' using errcode = '42501';
    end if;
    if v_reg.payment_status not in ('UNPAID', 'REJECTED') then
        raise exception using errcode = '42501', message = case v_reg.payment_status
            when 'NOT_REQUIRED' then 'This event is free — no payment is needed.'
            when 'PROOF_SUBMITTED' then 'Your proof is already awaiting review.'
            else 'Payment for this registration is already settled.' end;
    end if;
    if v_reg.payment_status = 'REJECTED' then
        select proof_resubmission_allowed into v_allow from public.payment_settings where id = 1;
        if not coalesce(v_allow, true) then
            raise exception 'Please message Coach Seif about your payment.' using errcode = '42501';
        end if;
    end if;
    if p_amount is null or p_amount < 0 or p_amount > 100000 then
        raise exception 'Enter the amount you transferred.' using errcode = '22023';
    end if;
    if p_proof_path is null or p_proof_path not like v_uid::text || '/payments/%' or p_proof_path like '%..%' then
        raise exception 'Invalid proof file.' using errcode = '42501';
    end if;

    select name, metadata into v_obj from storage.objects
     where bucket_id = 'fightzone-private' and name = p_proof_path and owner_id = v_uid::text;
    if v_obj is null then raise exception 'Upload the proof file first.' using errcode = 'P0002'; end if;
    if coalesce(v_obj.metadata->>'mimetype', '') not in ('image/png','image/jpeg','image/webp','application/pdf') then
        raise exception 'Proof must be a PNG, JPEG, WebP image or a PDF.' using errcode = '22023';
    end if;
    if coalesce((v_obj.metadata->>'size')::bigint, 0) not between 1 and 5242880 then
        raise exception 'Proof file must be 5 MB or smaller.' using errcode = '22023';
    end if;
    if exists (select 1 from public.payment_submissions where proof_path = p_proof_path) then
        raise exception 'This file was already submitted.' using errcode = '23505';
    end if;

    insert into public.payment_submissions (registration_id, member_id, amount_declared, transfer_reference,
                                            member_note, proof_path, proof_mime, proof_size)
    values (p_registration_id, v_uid, round(p_amount, 3), nullif(trim(p_reference), ''), nullif(trim(p_note), ''),
            p_proof_path, v_obj.metadata->>'mimetype', (v_obj.metadata->>'size')::int)
    returning id into v_id;

    update public.event_participants set payment_status = 'PROOF_SUBMITTED' where id = p_registration_id;

    select title into v_event from public.events where id = v_reg.event_id;
    perform public.notify_user(public.platform_owner_id(), 'PAYMENT', 'Payment proof to review',
        v_event.title || ' — ' || public.format_tnd(p_amount), 'payment', v_id, 'proof:' || v_id || ':staff');
    perform public.notify_user(v_uid, 'PAYMENT', 'Payment proof received',
        'Awaiting Coach Seif''s review — ' || v_event.title, 'event', v_reg.event_id, 'proof:' || v_id || ':member');
    perform public.send_system_message(v_uid, 'payment_proof_received',
        jsonb_build_object('event_title', v_event.title), 'proof:' || v_id || ':received');
    return v_id;
end;
$$;
revoke all on function public.submit_payment_proof(uuid, text, numeric, text, text) from public, anon;
grant execute on function public.submit_payment_proof(uuid, text, numeric, text, text) to authenticated;

-- ------------------------------------------------------------
-- Staff RPCs (Seif)
-- ------------------------------------------------------------

-- CONFIRM / REJECT a pending or waitlisted request; CANCEL any active one.
create or replace function public.decide_registration(p_registration_id uuid, p_decision text, p_reason text default null)
returns public.registration_status
language plpgsql security definer set search_path = public as $$
declare
    v_actor uuid := public.require_staff();
    v_reg   record;
    v_event record;
    v_new   public.registration_status;
    v_tpl   text;
    v_reason text := nullif(trim(p_reason), '');
begin
    select event_id into v_reg from public.event_participants where id = p_registration_id;
    if v_reg is null then raise exception 'Registration not found.' using errcode = 'P0002'; end if;
    select * into v_event from public.events where id = v_reg.event_id for update;
    select * into v_reg from public.event_participants where id = p_registration_id for update;

    if p_decision = 'CONFIRM' then
        if v_reg.registration_status not in ('PENDING', 'WAITLISTED') then
            raise exception 'Only pending or waitlisted registrations can be confirmed.' using errcode = '42501';
        end if;
        if v_reg.registration_status = 'WAITLISTED' and v_event.max_participants is not null
           and public.event_seats_taken(v_event.id) >= v_event.max_participants then
            raise exception 'The event is full. Increase capacity or free a place first.' using errcode = '42501';
        end if;
        v_new := 'CONFIRMED'; v_tpl := 'registration_confirmed';
    elsif p_decision = 'REJECT' then
        if v_reg.registration_status not in ('PENDING', 'WAITLISTED') then
            raise exception 'Only pending or waitlisted registrations can be declined.' using errcode = '42501';
        end if;
        v_new := 'REJECTED'; v_tpl := 'registration_rejected';
    elsif p_decision = 'CANCEL' then
        if v_reg.registration_status not in ('PENDING', 'CONFIRMED', 'WAITLISTED') then
            raise exception 'This registration is not active.' using errcode = '42501';
        end if;
        if v_reason is null then
            raise exception 'Give the member a reason for the cancellation.' using errcode = '22023';
        end if;
        v_new := 'CANCELLED'; v_tpl := 'registration_cancelled';
    else
        raise exception 'Unknown decision.' using errcode = '22023';
    end if;

    update public.event_participants set
        registration_status = v_new, decided_at = now(), decided_by = v_actor, decision_reason = v_reason,
        cancelled_at = case when v_new = 'CANCELLED' then now() else cancelled_at end,
        cancelled_by = case when v_new = 'CANCELLED' then v_actor else cancelled_by end
     where id = p_registration_id;
    if v_new in ('REJECTED', 'CANCELLED') then
        update public.payment_submissions set status = 'REJECTED', reviewed_by = v_actor, reviewed_at = now(),
               rejection_reason = 'Registration ' || lower(v_new::text) || '.'
         where registration_id = p_registration_id and status = 'SUBMITTED';
        if v_reg.payment_status = 'PROOF_SUBMITTED' then
            update public.event_participants set payment_status = 'UNPAID' where id = p_registration_id;
        end if;
    end if;

    perform public.log_audit('registration.' || lower(p_decision), 'registration', p_registration_id,
        jsonb_build_object('event_id', v_event.id, 'from', v_reg.registration_status, 'to', v_new, 'reason', v_reason));
    perform public.notify_user(v_reg.member_id, 'EVENT',
        case v_new when 'CONFIRMED' then 'Registration confirmed' when 'REJECTED' then 'Registration declined'
                   else 'Registration cancelled' end,
        v_event.title, 'event', v_event.id, 'reg:' || p_registration_id || ':' || v_new || ':' || extract(epoch from now())::bigint);
    perform public.send_system_message(v_reg.member_id, v_tpl,
        jsonb_build_object('event_title', v_event.title, 'event_date', public.event_date_label(v_event.start_at),
                           'reason', case when v_reason is null then '' else ' Reason: ' || v_reason || '.' end),
        'reg:' || p_registration_id || ':' || v_new || ':' || extract(epoch from now())::bigint);
    if v_new = 'CONFIRMED' and v_reg.payment_status = 'UNPAID' then
        perform public.send_system_message(v_reg.member_id, 'payment_instructions',
            jsonb_build_object('event_title', v_event.title, 'amount', public.format_tnd(v_reg.amount_due_tnd)),
            'reg:' || p_registration_id || ':payinfo:' || extract(epoch from now())::bigint);
    end if;
    if v_new in ('REJECTED', 'CANCELLED') and v_reg.registration_status in ('PENDING', 'CONFIRMED') then
        perform public.promote_waitlist(v_event.id);
    end if;
    return v_new;
end;
$$;
revoke all on function public.decide_registration(uuid, text, text) from public, anon;
grant execute on function public.decide_registration(uuid, text, text) to authenticated;

-- Internal: write the income ledger row exactly once and settle the registration.
create or replace function public.settle_registration_payment(
    p_registration_id uuid, p_amount numeric, p_method public.payment_method,
    p_paid_at timestamptz, p_submission_id uuid, p_note text
) returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_member uuid;
begin
    select member_id into v_member from public.event_participants where id = p_registration_id;
    insert into public.payments (member_id, registration_id, submission_id, amount, currency, status,
                                 payment_method, paid_at, recorded_by, note)
    values (v_member, p_registration_id, p_submission_id, round(p_amount, 3), 'TND', 'PAID',
            p_method, coalesce(p_paid_at, now()), v_actor, p_note);
    update public.event_participants set payment_status = 'PAID', payment_confirmed_at = now(),
           payment_confirmed_by = v_actor where id = p_registration_id;
exception when unique_violation then
    raise exception 'This registration''s payment is already recorded.' using errcode = '23505';
end;
$$;
revoke all on function public.settle_registration_payment(uuid, numeric, public.payment_method, timestamptz, uuid, text)
    from public, anon, authenticated;

-- Seif reviews bank-transfer evidence. CONFIRM records income; REJECT needs a reason.
create or replace function public.review_payment_submission(
    p_submission_id uuid, p_decision text, p_amount numeric default null, p_reason text default null
) returns public.payment_submission_status
language plpgsql security definer set search_path = public as $$
declare
    v_actor  uuid := public.require_staff();
    v_sub    record;
    v_reg    record;
    v_event  record;
    v_amount numeric(10,3);
    v_reason text := nullif(trim(p_reason), '');
begin
    select * into v_sub from public.payment_submissions where id = p_submission_id for update;
    if v_sub is null then raise exception 'Submission not found.' using errcode = 'P0002'; end if;
    if v_sub.status <> 'SUBMITTED' then
        raise exception 'This proof was already reviewed.' using errcode = '23505';
    end if;
    select * into v_reg from public.event_participants where id = v_sub.registration_id for update;
    select * into v_event from public.events where id = v_reg.event_id;

    if p_decision = 'CONFIRM' then
        if v_reg.registration_status not in ('PENDING', 'CONFIRMED') then
            raise exception 'The registration is no longer active.' using errcode = '42501';
        end if;
        v_amount := round(coalesce(p_amount, v_sub.amount_declared), 3);
        if v_amount <= 0 then raise exception 'Enter the amount received.' using errcode = '22023'; end if;
        update public.payment_submissions set status = 'CONFIRMED', reviewed_by = v_actor, reviewed_at = now()
         where id = p_submission_id;
        perform public.settle_registration_payment(v_reg.id, v_amount, 'BANK_TRANSFER', now(), p_submission_id, null);
        perform public.log_audit('payment.confirm', 'payment_submission', p_submission_id,
            jsonb_build_object('registration_id', v_reg.id, 'amount', v_amount, 'declared', v_sub.amount_declared,
                               'amount_due', v_reg.amount_due_tnd));
        perform public.notify_user(v_reg.member_id, 'PAYMENT', 'Payment confirmed', v_event.title,
            'event', v_event.id, 'proof:' || p_submission_id || ':confirmed');
        perform public.send_system_message(v_reg.member_id, 'payment_confirmed',
            jsonb_build_object('event_title', v_event.title, 'amount', public.format_tnd(v_amount)),
            'proof:' || p_submission_id || ':confirmed');
        return 'CONFIRMED';
    elsif p_decision = 'REJECT' then
        if v_reason is null then
            raise exception 'Tell the member why the proof was rejected.' using errcode = '22023';
        end if;
        update public.payment_submissions set status = 'REJECTED', reviewed_by = v_actor, reviewed_at = now(),
               rejection_reason = v_reason where id = p_submission_id;
        update public.event_participants set payment_status = 'REJECTED' where id = v_reg.id;
        perform public.log_audit('payment.reject', 'payment_submission', p_submission_id,
            jsonb_build_object('registration_id', v_reg.id, 'reason', v_reason));
        perform public.notify_user(v_reg.member_id, 'PAYMENT', 'Payment proof rejected', v_reason,
            'event', v_event.id, 'proof:' || p_submission_id || ':rejected');
        perform public.send_system_message(v_reg.member_id, 'payment_rejected',
            jsonb_build_object('event_title', v_event.title, 'reason', ' Reason: ' || v_reason || '.'),
            'proof:' || p_submission_id || ':rejected');
        return 'REJECTED';
    end if;
    raise exception 'Unknown decision.' using errcode = '22023';
end;
$$;
revoke all on function public.review_payment_submission(uuid, text, numeric, text) from public, anon;
grant execute on function public.review_payment_submission(uuid, text, numeric, text) to authenticated;

-- Seif records a cash / in-person payment (no proof upload needed).
create or replace function public.record_in_person_payment(
    p_registration_id uuid, p_amount numeric, p_paid_at timestamptz default null, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
    v_actor uuid := public.require_staff();
    v_reg   record;
    v_event record;
begin
    select * into v_reg from public.event_participants where id = p_registration_id for update;
    if v_reg is null then raise exception 'Registration not found.' using errcode = 'P0002'; end if;
    if v_reg.registration_status not in ('PENDING', 'CONFIRMED') then
        raise exception 'The registration is not active.' using errcode = '42501';
    end if;
    if v_reg.payment_status not in ('UNPAID', 'REJECTED', 'PROOF_SUBMITTED') then
        raise exception 'Nothing to collect: payment is %.', lower(v_reg.payment_status::text) using errcode = '42501';
    end if;
    if p_amount is null or p_amount <= 0 or p_amount > 100000 then
        raise exception 'Enter the amount received.' using errcode = '22023';
    end if;
    if p_paid_at is not null and p_paid_at > now() + interval '1 day' then
        raise exception 'The payment date cannot be in the future.' using errcode = '22023';
    end if;
    -- An open proof is superseded by the in-person receipt.
    update public.payment_submissions set status = 'REJECTED', reviewed_by = v_actor, reviewed_at = now(),
           rejection_reason = 'Superseded: paid in person.'
     where registration_id = p_registration_id and status = 'SUBMITTED';
    perform public.settle_registration_payment(p_registration_id, p_amount, 'CASH', p_paid_at, null, nullif(trim(p_note), ''));
    select title, id into v_event from public.events where id = v_reg.event_id;
    perform public.log_audit('payment.record_in_person', 'registration', p_registration_id,
        jsonb_build_object('amount', round(p_amount, 3), 'amount_due', v_reg.amount_due_tnd));
    perform public.notify_user(v_reg.member_id, 'PAYMENT', 'Payment confirmed', v_event.title,
        'event', v_event.id, 'reg:' || p_registration_id || ':paid');
    perform public.send_system_message(v_reg.member_id, 'payment_confirmed',
        jsonb_build_object('event_title', v_event.title, 'amount', public.format_tnd(p_amount)),
        'reg:' || p_registration_id || ':paid');
end;
$$;
revoke all on function public.record_in_person_payment(uuid, numeric, timestamptz, text) from public, anon;
grant execute on function public.record_in_person_payment(uuid, numeric, timestamptz, text) to authenticated;

-- Invitations for private events.
create or replace function public.set_event_invitation(p_event_id uuid, p_member_id uuid, p_invited boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.require_staff(); v_title text; v_public boolean;
begin
    select title, is_public into v_title, v_public from public.events where id = p_event_id;
    if v_title is null then raise exception 'Event not found.' using errcode = 'P0002'; end if;
    if not exists (select 1 from public.profiles where id = p_member_id) then
        raise exception 'Member not found.' using errcode = 'P0002';
    end if;
    if p_invited then
        insert into public.event_invitations (event_id, member_id, invited_by) values (p_event_id, p_member_id, v_actor)
        on conflict do nothing;
        if found then
            perform public.notify_user(p_member_id, 'EVENT', 'You''re invited', v_title, 'event', p_event_id,
                'invite:' || p_event_id || ':' || p_member_id);
        end if;
    else
        delete from public.event_invitations where event_id = p_event_id and member_id = p_member_id;
    end if;
    perform public.log_audit(case when p_invited then 'event.invite' else 'event.uninvite' end, 'event', p_event_id,
        jsonb_build_object('member_id', p_member_id));
end;
$$;
revoke all on function public.set_event_invitation(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_event_invitation(uuid, uuid, boolean) to authenticated;

-- Lifecycle changes (publish / unpublish to draft / cancel / archive).
create or replace function public.set_event_status(p_event_id uuid, p_status public.event_status, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
    v_actor uuid := public.require_staff();
    v_event record;
    v_reg   record;
    v_reason text := nullif(trim(p_reason), '');
begin
    select * into v_event from public.events where id = p_event_id for update;
    if v_event is null then raise exception 'Event not found.' using errcode = 'P0002'; end if;
    if v_event.status = p_status then return; end if;
    if v_event.status = 'ARCHIVED' and p_status <> 'DRAFT' then
        raise exception 'Restore an archived event to draft first.' using errcode = '42501';
    end if;
    if v_event.status = 'CANCELLED' and p_status = 'PUBLISHED' then
        raise exception 'A cancelled event cannot be re-published. Duplicate it instead.' using errcode = '42501';
    end if;
    if p_status = 'DRAFT' and public.event_seats_taken(p_event_id) > 0 then
        raise exception 'This event has active registrations. Cancel the event instead of unpublishing it.' using errcode = '42501';
    end if;

    update public.events set status = p_status,
        cancelled_at = case when p_status = 'CANCELLED' then now() else cancelled_at end,
        cancellation_reason = case when p_status = 'CANCELLED' then v_reason else cancellation_reason end
     where id = p_event_id;

    if p_status = 'CANCELLED' then
        for v_reg in select id, member_id from public.event_participants
                      where event_id = p_event_id and registration_status in ('PENDING', 'CONFIRMED', 'WAITLISTED') loop
            perform public.notify_user(v_reg.member_id, 'EVENT', 'Event cancelled', v_event.title,
                'event', p_event_id, 'event:' || p_event_id || ':cancelled');
            perform public.send_system_message(v_reg.member_id, 'event_cancelled',
                jsonb_build_object('event_title', v_event.title, 'event_date', public.event_date_label(v_event.start_at),
                                   'reason', case when v_reason is null then '' else ' Reason: ' || v_reason || '.' end),
                'event:' || p_event_id || ':cancelled:' || v_reg.member_id);
        end loop;
    end if;
    perform public.log_audit('event.status', 'event', p_event_id,
        jsonb_build_object('from', v_event.status, 'to', p_status, 'reason', v_reason));
end;
$$;
revoke all on function public.set_event_status(uuid, public.event_status, text) from public, anon;
grant execute on function public.set_event_status(uuid, public.event_status, text) to authenticated;

-- Audit + member notice when price/capacity/date/location/visibility change.
create or replace function public.audit_event_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_changes jsonb := '{}'::jsonb; v_reg record;
begin
    if new.price_tnd is distinct from old.price_tnd or new.is_free is distinct from old.is_free then
        v_changes := v_changes || jsonb_build_object('price', jsonb_build_array(old.price_tnd, new.price_tnd), 'is_free', new.is_free);
    end if;
    if new.max_participants is distinct from old.max_participants then
        v_changes := v_changes || jsonb_build_object('capacity', jsonb_build_array(old.max_participants, new.max_participants));
    end if;
    if new.start_at is distinct from old.start_at or new.end_at is distinct from old.end_at then
        v_changes := v_changes || jsonb_build_object('start_at', jsonb_build_array(old.start_at, new.start_at));
    end if;
    if new.location is distinct from old.location then
        v_changes := v_changes || jsonb_build_object('location', true);
    end if;
    if new.is_public is distinct from old.is_public then
        v_changes := v_changes || jsonb_build_object('is_public', new.is_public);
    end if;
    if v_changes = '{}'::jsonb then return new; end if;
    perform public.log_audit('event.update', 'event', new.id, v_changes);

    if (v_changes ? 'start_at' or v_changes ? 'location') and new.status = 'PUBLISHED' then
        for v_reg in select id, member_id from public.event_participants
                      where event_id = new.id and registration_status in ('PENDING', 'CONFIRMED', 'WAITLISTED') loop
            perform public.notify_user(v_reg.member_id, 'EVENT', 'Event updated', new.title, 'event', new.id,
                'event:' || new.id || ':updated:' || extract(epoch from now())::bigint);
            perform public.send_system_message(v_reg.member_id, 'event_updated',
                jsonb_build_object('event_title', new.title, 'event_date', public.event_date_label(new.start_at)),
                'event:' || new.id || ':updated:' || v_reg.member_id || ':' || extract(epoch from now())::bigint);
        end loop;
    end if;
    return new;
end;
$$;
drop trigger if exists events_audit_update on public.events;
create trigger events_audit_update after update on public.events
    for each row execute function public.audit_event_update();

-- When capacity grows, waitlisted members move up automatically.
create or replace function public.events_capacity_promote()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.status = 'PUBLISHED' and (new.max_participants is null
        or (old.max_participants is not null and new.max_participants > old.max_participants)) then
        perform public.promote_waitlist(new.id);
    end if;
    return new;
end;
$$;
drop trigger if exists events_capacity_promote on public.events;
create trigger events_capacity_promote after update of max_participants on public.events
    for each row execute function public.events_capacity_promote();
