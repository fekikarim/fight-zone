-- ============================================================
-- UPDATE V3 — Durable email delivery log (idempotency)
--
-- Additive-only migration. Adds a durable record of every Fight Zone
-- email delivery (event reminders, daily coach report, cancellation
-- alerts, empty-event alerts) so scheduled/event-driven email jobs can
-- answer "was this reminder already sent?" without relying on
-- in-memory state. This is the idempotency + duplicate-prevention
-- mechanism required by Update V3 Parts 9/10/13.
--
-- Design:
--   * A unique (delivery_type, delivery_key, recipient_email) key makes
--     each logical delivery addressable. Re-running a job for the same
--     key+recipient is a no-op (duplicate prevented).
--   * `status` is PENDING -> SENT | FAILED. Failed deliveries can be
--     retried by the scheduler; SENT rows are terminal (never re-sent).
--   * The table is written ONLY by trusted server-side infrastructure
--     (cron jobs + server actions) via the ADMIN/service-role client.
--     Clients (anon/authenticated) get NO access, so members cannot
--     forge or inspect deliveries.
-- ============================================================

do $$
begin
    if not exists (select 1 from pg_type where typname = 'email_delivery_type') then
        create type public.email_delivery_type as enum (
            'EVENT_REMINDER_COACH',
            'EVENT_REMINDER_MEMBER',
            'DAILY_COACH_REPORT',
            'EVENT_CANCELLATION_ALERT',
            'EVENT_EMPTY_ALERT'
        );
    end if;
    if not exists (select 1 from pg_type where typname = 'email_delivery_status') then
        create type public.email_delivery_status as enum (
            'PENDING',
            'SENT',
            'FAILED'
        );
    end if;
end
$$;

create table public.email_deliveries (
    id             uuid primary key default gen_random_uuid(),
    delivery_type  public.email_delivery_type not null,
    -- Uniqueness scopes a logical message: event id for reminders /
    -- empty alerts; YYYY-MM-DD for the daily report (in business TZ);
    -- event-id:member-id for a specific cancellation alert.
    delivery_key   text not null,
    recipient_email text not null,
    status         public.email_delivery_status not null default 'PENDING',
    subject        text,
    attempts       integer not null default 0,
    message_id     text,
    error_message  text,
    created_at     timestamptz not null default now(),
    sent_at        timestamptz,
    constraint email_deliveries_key_unique
        unique (delivery_type, delivery_key, recipient_email)
);

create index email_deliveries_status_idx
    on public.email_deliveries (status);
create index email_deliveries_created_at_idx
    on public.email_deliveries (created_at);
create index email_deliveries_key_type_idx
    on public.email_deliveries (delivery_type, delivery_key);

-- No client access. Only trusted server-side code (service_role /
-- SECURITY DEFINER) writes and reads this table.
revoke all on public.email_deliveries from public, anon, authenticated;
grant all on public.email_deliveries to service_role;

-- ============================================================
-- Atomic delivery claim (idempotent) + completion marks.
--
-- These SECURITY DEFINER functions encapsulate the delivery state
-- machine so it is correct under concurrent cron invocations:
--   * BEGIN: try to claim an un-sent delivery. The first caller to
--     insert wins (ON CONFLICT DO NOTHING); a SENT row is terminal and
--     can never be claimed again; a FAILED row is re-claimed (flips to
--     PENDING, attempts+1). A claimed row is returned to exactly ONE
--     process, so duplicates are structurally impossible.
--   * success/failure: idempotent completion. success() only transitions
--     a PENDING row to SENT; failure() only a PENDING row to FAILED. A
--     later success call never rewrites a FAILED row, and double
--     completion is a no-op.
-- Calls come exclusively from trusted server-side infrastructure
-- (cron jobs + server actions) holding the service_role key.
-- ============================================================

create or replace function public.claim_email_delivery(
    p_type      public.email_delivery_type,
    p_key       text,
    p_recipient text,
    p_subject   text
) returns public.email_deliveries
language plpgsql
security definer
set search_path = public
as $fn$
declare
    v_row public.email_deliveries;
begin
    insert into public.email_deliveries
        (delivery_type, delivery_key, recipient_email, status, subject, attempts)
    values
        (p_type, p_key, p_recipient, 'PENDING', p_subject, 1)
    on conflict (delivery_type, delivery_key, recipient_email) do nothing;

    select * into v_row
      from public.email_deliveries
     where delivery_type = p_type
       and delivery_key   = p_key
       and recipient_email = p_recipient;

    -- Terminal state: already sent. Never re-send.
    if not found or v_row.status = 'SENT' then
        return null;
    end if;

    -- A previously FAILED delivery is retried.
    if v_row.status = 'FAILED' then
        update public.email_deliveries
           set status = 'PENDING', attempts = attempts + 1, error_message = null
         where id = v_row.id
        returning * into v_row;
    end if;

    return v_row;
end;
$fn$;

create or replace function public.mark_email_delivery_sent(
    p_id        uuid,
    p_message_id text
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
    update public.email_deliveries
       set status = 'SENT', message_id = p_message_id, sent_at = now()
     where id = p_id and status = 'PENDING';
end;
$fn$;

create or replace function public.mark_email_delivery_failed(
    p_id           uuid,
    p_error_message text
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
    update public.email_deliveries
       set status = 'FAILED', error_message = p_error_message
     where id = p_id and status = 'PENDING';
end;
$fn$;

-- These functions run as the owning (superuser/admin) role already, so
-- they read/write email_deliveries directly. No extra grants are needed
-- for service_role (which invokes them); PUBLIC/anon/authenticated are
-- deliberately excluded via the revokes above and the default deny.
revoke all on function public.claim_email_delivery(public.email_delivery_type, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_email_delivery_sent(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_email_delivery_failed(uuid, text) from public, anon, authenticated;

-- ============================================================
-- Read helpers for email automation.
--
-- SECURITY DEFINER so headless jobs (which have no user session) can read
-- the exact data needed to render emails: which staff to notify, whether
-- a member is JOINED, event fingerprints + active participant counts.
-- They return only the columns the templates need (never passwords, and
-- no broad `select *` from callers), are marked STABLE, and are gated so
-- clients (anon/authenticated) cannot invoke them — only server-side code
-- with the service_role key.
-- ============================================================

-- Staff recipients: COACH first (single-coach model), then ADMIN.
create or replace function public.get_staff_recipients()
returns table (id uuid, email text, full_name text)
language sql
security definer
set search_path = ''
stable
as $fn$
    select p.id, p.email, p.full_name
      from public.profiles p
      join public.user_role_assignments ura on ura.user_id = p.id
      join public.roles r on r.id = ura.role_id
     where p.is_active = true
       and r.name in ('ADMIN', 'COACH')
     order by (r.name = 'COACH') desc;
$fn$;

-- Contact info for a single profile (members map 1:1 via member_profiles).
create or replace function public.get_profile_contact(p_profile_id uuid)
returns table (id uuid, email text, full_name text)
language sql
security definer
set search_path = ''
stable
as $fn$
    select p.id, p.email, p.full_name
      from public.profiles p
     where p.id = p_profile_id
       and p.is_active = true;
$fn$;

-- JOINED participants of an event, with contact info (for reminders).
create or replace function public.get_event_joined_participants(p_event_id uuid)
returns table (member_id uuid, email text, full_name text)
language sql
security definer
set search_path = ''
stable
as $fn$
    select ep.member_id, p.email, p.full_name
      from public.event_participants ep
      join public.profiles p on p.id = ep.member_id
     where ep.event_id = p_event_id
       and ep.status = 'JOINED';
$fn$;

-- Event fingerprints (start..end inclusive on start_at) with active
-- (non-CANCELLED) participant counts, for the 30-min reminder window, the
-- daily report, and empty-event detection. Ordered by start time.
create or replace function public.get_events_in_range(
    p_start timestamptz,
    p_end   timestamptz
) returns table (
    id               uuid,
    title            text,
    description      text,
    start_at         timestamptz,
    end_at           timestamptz,
    location         text,
    event_type       public.event_type,
    is_public        boolean,
    max_participants integer,
    is_free          boolean,
    price_tnd        numeric,
    created_by       uuid,
    participant_count bigint
)
language sql
security definer
set search_path = ''
stable
as $fn$
    select e.id, e.title, e.description, e.start_at, e.end_at, e.location,
           e.event_type, e.is_public, e.max_participants, e.is_free, e.price_tnd,
           e.created_by,
           count(ep.id) filter (where ep.status <> 'CANCELLED') as participant_count
      from public.events e
      left join public.event_participants ep on ep.event_id = e.id
     where e.start_at >= p_start
       and e.start_at <  p_end
     group by e.id
     order by e.start_at asc;
$fn$;

-- Single-event fingerprint with active participant count (for the
-- cancellation alert, which needs the post-commit state).
create or replace function public.get_event_fingerprint(p_event_id uuid)
returns table (
    id               uuid,
    title            text,
    description      text,
    start_at         timestamptz,
    end_at           timestamptz,
    location         text,
    event_type       public.event_type,
    is_public        boolean,
    max_participants integer,
    is_free          boolean,
    price_tnd        numeric,
    created_by       uuid,
    participant_count bigint
)
language sql
security definer
set search_path = ''
stable
as $fn$
    select e.id, e.title, e.description, e.start_at, e.end_at, e.location,
           e.event_type, e.is_public, e.max_participants, e.is_free, e.price_tnd,
           e.created_by,
           count(ep.id) filter (where ep.status <> 'CANCELLED') as participant_count
      from public.events e
      left join public.event_participants ep on ep.event_id = e.id
     where e.id = p_event_id
     group by e.id;
$fn$;

revoke all on function public.get_staff_recipients() from public, anon, authenticated;
revoke all on function public.get_profile_contact(uuid) from public, anon, authenticated;
revoke all on function public.get_event_joined_participants(uuid) from public, anon, authenticated;
revoke all on function public.get_events_in_range(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.get_event_fingerprint(uuid) from public, anon, authenticated;
grant execute on function public.get_staff_recipients() to service_role;
grant execute on function public.get_profile_contact(uuid) to service_role;
grant execute on function public.get_event_joined_participants(uuid) to service_role;
grant execute on function public.get_events_in_range(timestamptz, timestamptz) to service_role;
grant execute on function public.get_event_fingerprint(uuid) to service_role;
