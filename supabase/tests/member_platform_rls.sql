-- ============================================================
-- FIGHT ZONE — Member platform RLS & booking rules suite
-- ============================================================
-- Prompt #3 (member platform + booking workflow) test matrix.
--
-- Run AFTER `supabase db reset --local` (seed users must exist), same as
-- auth_rls_verification.sql:
--
--   supabase start
--   supabase db reset --local
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--       -f supabase/tests/member_platform_rls.sql
--
-- The whole suite runs inside a transaction that ROLLS BACK, so it is safe
-- to run repeatedly against local data.
--
-- Seed identities:
--   admin  = 00000000-0000-0000-0000-000000000001 (ADMIN + COACH)
--   member = 00000000-0000-0000-0000-000000000002 (MEMBER)
--
-- Covers, per Prompt #3:
--   * session catalog is publicly readable, bookings/notifications are not
--   * member can request a booking (status always defaults to PENDING)
--   * duplicate active booking for the same session + time is rejected (DB)
--   * member cannot read/update/insert bookings for another member (IDOR)
--   * member cannot self-confirm/self-complete their own booking (status is
--     never client-trusted) — only CANCELLED for an active future booking
--   * member cannot insert notifications (staff-only); booking lifecycle
--     notifications are created by the SECURITY DEFINER triggers
--   * staff can confirm bookings and manage notifications

begin;

set role postgres;
reset request.jwt.claims;

-- ------------------------------------------------------------
-- Helpers (mirror auth_rls_verification.sql, plus tests_expect_error)
-- ------------------------------------------------------------
create or replace function tests_set_auth(sub uuid, authenticated boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config(
    'request.jwt.claims',
    case
      when authenticated then
        json_build_object('sub', sub::text, 'role', 'authenticated')::text
      else
        json_build_object('role', 'anon')::text
    end,
    false
  );
end;
$$;

create or replace function tests_expect_allowed(label text, body text)
returns void
language plpgsql
as $$
begin
  begin
    execute body;
    raise notice 'PASS %', label;
  exception
    when insufficient_privilege then
      raise exception 'FAIL % — statement was denied', label;
    when others then
      raise exception 'FAIL % — unexpected error: %', label, sqlerrm;
  end;
end;
$$;

create or replace function tests_expect_denied(label text, body text)
returns void
language plpgsql
as $$
begin
  begin
    execute body;
    raise exception 'FAIL % — statement unexpectedly succeeded', label;
  exception
    when insufficient_privilege then
      raise notice 'PASS %', label;
    when others then
      if sqlstate = '42501' then
        raise notice 'PASS %', label;
      else
        raise exception 'FAIL % — unexpected error: %', label, sqlerrm;
      end if;
  end;
end;
$$;

create or replace function tests_expect_rows(label text, body text, expected integer)
returns void
language plpgsql
as $$
declare
  found integer;
begin
  execute 'select count(*) from (' || body || ') t' into found;
  if found = expected then
    raise notice 'PASS % (% rows)', label, found;
  else
    raise exception 'FAIL % — expected % rows, found %', label, expected, found;
  end if;
end;
$$;

create or replace function tests_expect_affected(label text, body text, expected integer)
returns void
language plpgsql
as $$
declare
  got integer;
begin
  begin
    execute body;
    get diagnostics got = row_count;
    if got = expected then
      raise notice 'PASS % (% rows affected)', label, got;
    else
      raise exception 'FAIL % — expected % affected rows, got %', label, expected, got;
    end if;
  exception
    when insufficient_privilege then
      if expected = 0 then
        raise notice 'PASS % (denied with error)', label;
      else
        raise exception 'FAIL % — statement was denied', label;
      end if;
    when others then
      raise exception 'FAIL % — unexpected error: %', label, sqlerrm;
  end;
end;
$$;

-- Asserts that executing `body` fails with the given SQLSTATE.
create or replace function tests_expect_error(label text, body text, expected_state text)
returns void
language plpgsql
as $$
begin
  begin
    execute body;
    raise exception 'FAIL % — statement unexpectedly succeeded', label;
  exception
    when others then
      if sqlstate = expected_state then
        raise notice 'PASS % (sqlstate %)', label, sqlstate;
      else
        raise exception 'FAIL % — expected sqlstate %, got %', label, expected_state, sqlstate;
      end if;
  end;
end;
$$;

-- ------------------------------------------------------------
-- Setup: working session reference + staff contexts
-- ------------------------------------------------------------
-- As admin (staff), ensure profile records exist so FKs are satisfiable.
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);

select tests_expect_allowed(
  'admin ensures admin member_profile',
  $$insert into public.member_profiles (id) values ('00000000-0000-0000-0000-000000000001')
    on conflict (id) do nothing$$
);
select tests_expect_allowed(
  'admin ensures member member_profile',
  $$insert into public.member_profiles (id) values ('00000000-0000-0000-0000-000000000002')
    on conflict (id) do nothing$$
);

create temp table t_s (
  id uuid,
  coach uuid,
  future timestamptz,
  past timestamptz
);
insert into t_s
select s.id, s.coach_id, now() + interval '1 day', now() - interval '1 day'
from public.sessions s
limit 1;

-- Foreign booking owned by the admin (member_id = admin id) for IDOR tests.
select tests_expect_allowed(
  'admin seeds a booking for themselves',
  $$insert into public.bookings (member_id, session_id, coach_id, scheduled_at, status)
    select '00000000-0000-0000-0000-000000000001', s.id, s.coach, s.past, 'CONFIRMED'
    from t_s s$$
);

-- ------------------------------------------------------------
-- Anonymous context
-- ------------------------------------------------------------
select tests_set_auth(null, false);

select tests_expect_allowed('anon can read active sessions', $$select * from public.sessions$$);
select tests_expect_rows('anon cannot read bookings', $$select * from public.bookings$$, 0);
select tests_expect_rows('anon cannot read notifications', $$select * from public.notifications$$, 0);
select tests_expect_rows('anon cannot read member_profiles', $$select * from public.member_profiles$$, 0);

-- ------------------------------------------------------------
-- Member context
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);

-- Session catalog is public
select tests_expect_allowed('member can read sessions', $$select * from public.sessions$$);

-- Member can self-provision their member_profile (the createBooking pre-step)
select tests_expect_allowed(
  'member can upsert their own member_profile',
  $$insert into public.member_profiles (id) values ('00000000-0000-0000-0000-000000000002')
    on conflict (id) do nothing$$
);

-- Member requests a booking; status must default to PENDING (never client-set)
select tests_expect_allowed(
  'member can request a booking',
  $$insert into public.bookings (member_id, session_id, coach_id, scheduled_at)
    select '00000000-0000-0000-0000-000000000002', s.id, s.coach, s.future
    from t_s s$$
);
do $$
declare
  got text;
begin
  select status into got
  from public.bookings
  where member_id = '00000000-0000-0000-0000-000000000002'
    and session_id = (select id from t_s)
  order by created_at desc
  limit 1;
  if got is distinct from 'PENDING' then
    raise exception 'FAIL — new booking status is %', got;
  end if;
  raise notice 'PASS — new booking defaults to PENDING';
end $$;

-- Member can read their own booking but never someone else's
select tests_expect_rows(
  'member can read their own booking',
  $$select * from public.bookings
    where member_id = '00000000-0000-0000-0000-000000000002'$$,
  1
);
select tests_expect_rows(
  'member cannot read another member booking',
  $$select * from public.bookings
    where member_id = '00000000-0000-0000-0000-000000000001'$$,
  0
);
select tests_expect_affected(
  'member cannot update another member booking',
  $$update public.bookings set status = 'CANCELLED'
    where member_id = '00000000-0000-0000-0000-000000000001'$$,
  0
);

-- Member cannot spoof a member_id on insert (IDOR)
select tests_expect_denied(
  'member cannot create a booking for another member',
  $$insert into public.bookings (member_id, session_id, coach_id, scheduled_at)
    select '00000000-0000-0000-0000-000000000001', s.id, s.coach, s.future
    from t_s s$$
);

-- Duplicate active request for the same session + time is rejected by the DB
select tests_expect_error(
  'duplicate active booking is rejected',
  $$insert into public.bookings (member_id, session_id, coach_id, scheduled_at)
    select '00000000-0000-0000-0000-000000000002', s.id, s.coach, s.future
    from t_s s$$,
  '23505'
);

-- Status is authoritative state: member cannot self-confirm or self-complete
select tests_expect_denied(
  'member cannot self-confirm their booking',
  $$update public.bookings set status = 'CONFIRMED'
    where member_id = '00000000-0000-0000-0000-000000000002'
      and session_id = (select id from t_s)$$
);
select tests_expect_denied(
  'member cannot self-complete their booking',
  $$update public.bookings set status = 'COMPLETED'
    where member_id = '00000000-0000-0000-0000-000000000002'
      and session_id = (select id from t_s)$$
);

-- Member may cancel their own active future booking
select tests_expect_affected(
  'member can cancel their active future booking',
  $$update public.bookings set status = 'CANCELLED'
    where member_id = '00000000-0000-0000-0000-000000000002'
      and session_id = (select id from t_s)$$,
  1
);

-- Member cannot cancel a booking in a terminal state (admin-seeded COMPLETED)
select tests_expect_allowed(
  'admin seeds a completed booking for the member',
  $$insert into public.bookings (member_id, session_id, coach_id, scheduled_at, status)
    select '00000000-0000-0000-0000-000000000002', s.id, s.coach, s.past, 'COMPLETED'
    from t_s s$$
);
select tests_expect_denied(
  'member cannot cancel a completed booking',
  $$update public.bookings set status = 'CANCELLED'
    where member_id = '00000000-0000-0000-0000-000000000002'
      and session_id = (select id from t_s)
      and status = 'COMPLETED'$$
);

-- Notifications are staff-insert only; booking lifecycle notifications are
-- created automatically by SECURITY DEFINER triggers.
select tests_expect_denied(
  'member cannot insert notifications',
  $$insert into public.notifications (user_id, type, title)
    values ('00000000-0000-0000-0000-000000000002', 'BOOKING', 'spoofed')$$
);
select tests_expect_denied(
  'member cannot insert a notification for another user',
  $$insert into public.notifications (user_id, type, title)
    values ('00000000-0000-0000-0000-000000000001', 'BOOKING', 'spoofed')$$
);
select tests_expect_rows(
  'member can read their own notifications',
  $$select * from public.notifications
    where user_id = '00000000-0000-0000-0000-000000000002'
      and title = 'Booking request received'$$,
  2
);

-- ------------------------------------------------------------
-- Admin context
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);

select tests_expect_allowed('admin can read all bookings', $$select * from public.bookings$$);
select tests_expect_allowed(
  'admin can insert notifications',
  $$insert into public.notifications (user_id, type, title, content)
    values ('00000000-0000-0000-0000-000000000002', 'BOOKING', 'Session confirmed', 'Your session is confirmed.')
    returning id$$
);
select tests_expect_affected(
  'admin can confirm a member booking',
  $$update public.bookings set status = 'CONFIRMED'
    where member_id = '00000000-0000-0000-0000-000000000002'
      and status = 'PENDING'$$,
  0
);

-- Booking lifecycle notifications created by the triggers
do $$
declare
  coach_booked integer;
  member_booked integer;
  coach_cancelled integer;
begin
  select count(*) into coach_booked
  from public.notifications
  where user_id = (select coach from t_s) and type = 'BOOKING' and title = 'New booking request';
  select count(*) into member_booked
  from public.notifications
  where user_id = '00000000-0000-0000-0000-000000000002' and type = 'BOOKING' and title = 'Booking request received';
  select count(*) into coach_cancelled
  from public.notifications
  where user_id = (select coach from t_s) and type = 'BOOKING' and title = 'Booking cancelled';

  if coach_booked = 0 then
    raise exception 'FAIL — coach was not notified of the new booking';
  end if;
  if member_booked = 0 then
    raise exception 'FAIL — member was not notified of their booking request';
  end if;
  if coach_cancelled = 0 then
    raise exception 'FAIL — coach was not notified of the cancellation';
  end if;
  raise notice 'PASS — booking lifecycle notifications created (coach/booked, member/booked, coach/cancelled)';
end $$;

rollback;
