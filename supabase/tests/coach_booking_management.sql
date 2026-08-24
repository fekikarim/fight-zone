-- ============================================================
-- FIGHT ZONE — Coach/Admin booking management suite
-- ============================================================
-- Prompt #4 test matrix: DB-authoritative booking lifecycle, coach-ownership
-- RLS, atomic transitions and lifecycle notifications.
--
-- Run AFTER `supabase db reset --local` (seed users must exist), same as the
-- other suites:
--
--   supabase start
--   supabase db reset --local
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--       -f supabase/tests/coach_booking_management.sql
--
-- The whole suite runs inside a transaction that ROLLS BACK, so it is safe
-- to run repeatedly against local data. Demo identities (never production):
--   admin   = 00000000-0000-0000-0000-000000000001 (ADMIN + COACH)
--   member  = 00000000-0000-0000-0000-000000000002 (MEMBER)
--   coach2  = 00000000-0000-0000-0000-000000000003 (COACH only, created here)
--
-- Role model: connect as `postgres` (superuser) and impersonate the API
-- roles (`anon` / `authenticated`) via SET ROLE — exactly the roles PostgREST
-- uses — so ROW LEVEL SECURITY is genuinely enforced. `auth.uid()` is
-- simulated through `request.jwt.claims`, mirroring PostgREST's requests.
--
-- RLS semantics used by these assertions:
--   * INSERT that fails a WITH CHECK policy  -> raises insufficient_privilege
--   * UPDATE/DELETE on rows hidden by USING  -> silently affects 0 rows
--   * SELECT on hidden rows                  -> silently returns 0 rows
--   * `enforce_booking_transition` trigger   -> raises 42501 (P0001 path)

begin;

set role postgres;
reset request.jwt.claims;

-- ------------------------------------------------------------
-- Helpers (mirror member_platform_rls.sql)
-- ------------------------------------------------------------
create or replace function tests_set_auth(sub uuid, authenticated boolean)
returns void
language plpgsql
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
  -- Phase 14 fix: GUC-only simulation bypasses RLS when the session role owns
  -- tables (relforcerowsecurity = false). Switch the actual role so every
  -- subsequent statement in the transaction is evaluated under real RLS.
  if authenticated then
    execute 'set local role authenticated';
  else
    execute 'set local role anon';
  end if;
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
  begin
    execute 'select count(*) from (' || body || ') t' into found;
  exception
    when insufficient_privilege then
      if expected = 0 then
        raise notice 'PASS % (denied — stricter than empty)', label;
        return;
      else
        raise exception 'FAIL % — denied', label;
      end if;
  end;
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
-- Fixtures (as postgres; the whole block rolls back at the end)
-- ------------------------------------------------------------
do $$
begin
  -- Second, pure coach (no ADMIN role) for coach-ownership tests.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000',
          '00000000-0000-0000-0000-000000000003',
          'authenticated', 'authenticated', 'coach2@fightzone.example',
          crypt('Coach2-1234', gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}',
          '{"full_name":"Coach Two"}',
          now(), now())
  on conflict (id) do nothing;

  insert into public.user_role_assignments (user_id, role_id)
  select '00000000-0000-0000-0000-000000000003', r.id
  from public.roles r where r.name = 'COACH'
  on conflict (user_id, role_id) do nothing;

  insert into public.coach_profiles (id, experience_years, specialization, is_available)
  values ('00000000-0000-0000-0000-000000000003', 5, 'Muay Thai', true)
  on conflict (id) do nothing;

  -- A session owned by coach2 (coach1's sessions come from the seed).
  insert into public.sessions (coach_id, title, description, type, duration_min, price, is_active)
  values ('00000000-0000-0000-0000-000000000003',
          'Muay Thai Private Coaching',
          'One-on-one Muay Thai technique work.',
          'COMBO', 60, 45.00, true);
end $$;

-- Session references: s1 belongs to coach1, s2 to coach2.
create temp table t_s (id uuid, coach uuid, future timestamptz, past timestamptz);
insert into t_s
select s.id, s.coach_id,
       now() + interval '1 day',
       now() - interval '1 day'
from public.sessions s
where s.coach_id = '00000000-0000-0000-0000-000000000001'
limit 1;

create temp table t_s2 (id uuid, coach uuid, future timestamptz, past timestamptz);
insert into t_s2
select s.id, s.coach_id,
       now() + interval '1 day',
       now() - interval '1 day'
from public.sessions s
where s.coach_id = '00000000-0000-0000-0000-000000000003'
limit 1;

-- Booking fixtures (explicit ids for stable assertions).
--   b_pending            member 2, s1, future      -> PENDING
--   b_confirmed_future   member 2, s1, future+1d   -> CONFIRMED
--   b_confirmed_past     member 2, s1, past        -> CONFIRMED
--   b_completed          member 2, s1, past        -> COMPLETED
--   b_no_show            member 2, s1, past-1d     -> NO_SHOW
--   b_admin_owned        member 1, s1, past        -> CONFIRMED
--   b_cancel             member 2, s1, future+2d   -> CONFIRMED
--   b_stale              member 2, s1, past        -> PENDING
--   b_coach2             member 2, s2, future      -> PENDING
--   b_coach2_two         member 2, s2, future+1d   -> PENDING
insert into public.bookings (id, member_id, session_id, coach_id, scheduled_at, status)
select 'a0000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, s.id, s.coach, s.future, 'PENDING'::booking_status      from t_s s
union all
select 'a0000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, s.id, s.coach, s.future + interval '1 day', 'CONFIRMED'::booking_status from t_s s
union all
select 'a0000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, s.id, s.coach, s.past, 'COMPLETED'::booking_status   from t_s s
union all
select 'a0000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, s.id, s.coach, s.past, 'NO_SHOW'::booking_status     from t_s s
union all
select 'a0000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, s.id, s.coach, s.past, 'CONFIRMED'::booking_status   from t_s s
union all
select 'a0000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, s.id, s.coach, s.future + interval '2 days', 'CONFIRMED'::booking_status from t_s s
union all
select 'a0000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, s.id, s.coach, s.past - interval '2 hours', 'PENDING'::booking_status from t_s s
union all
select 'a0000000-0000-0000-0000-00000000000b'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, s.id, s.coach, s.past, 'CONFIRMED'::booking_status   from t_s s
union all
select 'a0000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, s2.id, s2.coach, s2.future, 'PENDING'::booking_status  from t_s2 s2
union all
select 'a0000000-0000-0000-0000-000000000009'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, s2.id, s2.coach, s2.future + interval '1 day', 'PENDING'::booking_status from t_s2 s2;

-- ------------------------------------------------------------
-- CASE 1 — Anonymous cannot read private booking data
-- ------------------------------------------------------------
set role anon;
select tests_set_auth(null, false);
select tests_expect_rows('CASE 1 — anon cannot read bookings', $$select * from public.bookings$$, 0);
select tests_expect_rows('CASE 1 — anon cannot read notifications', $$select * from public.notifications$$, 0);

-- ------------------------------------------------------------
-- CASE 2 — Member can read own booking
-- ------------------------------------------------------------
set role authenticated;
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
select tests_expect_rows(
  'CASE 2 — member can read own booking',
  $$select * from public.bookings where id = 'a0000000-0000-0000-0000-000000000001'$$,
  1
);

-- ------------------------------------------------------------
-- CASE 3 — Member cannot read another member's booking
-- ------------------------------------------------------------
select tests_expect_rows(
  'CASE 3 — member cannot read another member booking',
  $$select * from public.bookings where id = 'a0000000-0000-0000-0000-000000000005'$$,
  0
);
select tests_expect_affected(
  'CASE 3 — member cannot update another member booking',
  $$update public.bookings set status = 'CANCELLED'
    where id = 'a0000000-0000-0000-0000-000000000005'$$,
  0
);

-- ------------------------------------------------------------
-- CASE 4 — Member cannot confirm
-- ------------------------------------------------------------
select tests_expect_denied(
  'CASE 4 — member cannot confirm their booking',
  $$update public.bookings set status = 'CONFIRMED'
    where id = 'a0000000-0000-0000-0000-000000000001'$$
);

-- ------------------------------------------------------------
-- CASE 5 — Member cannot complete
-- ------------------------------------------------------------
select tests_expect_denied(
  'CASE 5 — member cannot complete their booking',
  $$update public.bookings set status = 'COMPLETED'
    where id = 'a0000000-0000-0000-0000-000000000001'$$
);

-- ------------------------------------------------------------
-- CASE 6 — Member cannot mark NO_SHOW
-- ------------------------------------------------------------
select tests_expect_denied(
  'CASE 6 — member cannot mark NO_SHOW',
  $$update public.bookings set status = 'NO_SHOW'
    where id = 'a0000000-0000-0000-0000-000000000001'$$
);

-- ------------------------------------------------------------
-- CASE 7 — Member can cancel only when rules permit
-- ------------------------------------------------------------
-- Active future booking: allowed.
select tests_expect_affected(
  'CASE 7 — member can cancel active future booking',
  $$update public.bookings set status = 'CANCELLED'
    where id = 'a0000000-0000-0000-0000-000000000002'$$,
  1
);
-- Terminal booking: denied.
select tests_expect_error(
  'CASE 7 — member cannot cancel a completed booking',
  $$update public.bookings set status = 'CANCELLED'
    where id = 'a0000000-0000-0000-0000-000000000003'$$,
  '42501'
);
-- Past (already started) confirmed booking: denied.
select tests_expect_error(
  'CASE 7 — member cannot cancel a started booking',
  $$update public.bookings set status = 'CANCELLED'
    where id = 'a0000000-0000-0000-0000-00000000000b'$$,
  '42501'
);

-- ------------------------------------------------------------
-- CASE 8 — Coach can confirm an authorized booking
-- ------------------------------------------------------------
set role authenticated;
select tests_set_auth('00000000-0000-0000-0000-000000000003', true);
select tests_expect_affected(
  'CASE 8 — coach confirms their own pending booking',
  $$update public.bookings set status = 'CONFIRMED'
    where id = 'a0000000-0000-0000-0000-000000000008'$$,
  1
);

-- ------------------------------------------------------------
-- CASE 9 — Coach cannot manage another coach's booking
-- ------------------------------------------------------------
select tests_expect_rows(
  'CASE 9 — coach can read their own booking',
  $$select * from public.bookings where coach_id = '00000000-0000-0000-0000-000000000003'$$,
  2
);
select tests_expect_rows(
  'CASE 9 — coach cannot read another coach booking',
  $$select * from public.bookings where id = 'a0000000-0000-0000-0000-000000000001'$$,
  0
);
select tests_expect_affected(
  'CASE 9 — coach cannot update another coach booking',
  $$update public.bookings set status = 'CANCELLED'
    where id = 'a0000000-0000-0000-0000-000000000001'$$,
  0
);

-- ------------------------------------------------------------
-- CASE 10 — Admin can manage bookings (including cross-coach)
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);
select tests_expect_rows(
  'CASE 10 — admin can read any booking',
  $$select * from public.bookings where id = 'a0000000-0000-0000-0000-000000000001'$$,
  1
);
select tests_expect_affected(
  'CASE 10 — admin can confirm another coach booking',
  $$update public.bookings set status = 'CONFIRMED'
    where id = 'a0000000-0000-0000-0000-000000000009'$$,
  1
);

-- ------------------------------------------------------------
-- CASE 11 — Invalid transitions fail
-- ------------------------------------------------------------
select tests_expect_error(
  'CASE 11 — PENDING to COMPLETED is rejected',
  $$update public.bookings set status = 'COMPLETED'
    where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501'
);
select tests_expect_error(
  'CASE 11 — PENDING to NO_SHOW is rejected',
  $$update public.bookings set status = 'NO_SHOW'
    where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501'
);

-- ------------------------------------------------------------
-- CASE 12 — Completed booking cannot be cancelled
-- ------------------------------------------------------------
select tests_expect_error(
  'CASE 12 — completed booking cannot be cancelled',
  $$update public.bookings set status = 'CANCELLED'
    where id = 'a0000000-0000-0000-0000-000000000003'$$,
  '42501'
);

-- ------------------------------------------------------------
-- CASE 13 — No-show booking cannot be confirmed
-- ------------------------------------------------------------
select tests_expect_error(
  'CASE 13 — no-show booking cannot be confirmed',
  $$update public.bookings set status = 'CONFIRMED'
    where id = 'a0000000-0000-0000-0000-000000000004'$$,
  '42501'
);

-- ------------------------------------------------------------
-- CASE 14 — Confirmation generates the correct notification
-- ------------------------------------------------------------
do $$
declare
  affected integer;
  before_count integer;
  after_count integer;
begin
  select count(*) into before_count
  from public.notifications
  where user_id = '00000000-0000-0000-0000-000000000002'
    and title = 'Booking confirmed';

  update public.bookings set status = 'CONFIRMED'
  where id = 'a0000000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'FAIL CASE 14 — confirmation affected % rows, expected 1', affected;
  end if;

  select count(*) into after_count
  from public.notifications
  where user_id = '00000000-0000-0000-0000-000000000002'
    and title = 'Booking confirmed';

  if after_count <> before_count + 1 then
    raise exception 'FAIL CASE 14 — member notification missing (before %, after %)', before_count, after_count;
  end if;
  raise notice 'PASS CASE 14 — confirmation generates the correct notification';
end $$;

-- ------------------------------------------------------------
-- CASE 15 — Cancellation generates the correct notification
-- ------------------------------------------------------------
do $$
declare
  affected integer;
  member_before integer;
  member_after integer;
  coach_before integer;
  coach_after integer;
begin
  -- Admin identity can read both sides' notifications.
  perform tests_set_auth('00000000-0000-0000-0000-000000000001', true);
  select count(*) into member_before
  from public.notifications
  where user_id = '00000000-0000-0000-0000-000000000002'
    and title = 'Booking cancelled';
  select count(*) into coach_before
  from public.notifications
  where user_id = '00000000-0000-0000-0000-000000000001'
    and title = 'Booking cancelled';

  -- Member performs the cancellation (RLS + member transition rule apply).
  perform tests_set_auth('00000000-0000-0000-0000-000000000002', true);
  update public.bookings set status = 'CANCELLED'
  where id = 'a0000000-0000-0000-0000-000000000006';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'FAIL CASE 15 — cancellation affected % rows, expected 1', affected;
  end if;

  -- Back to admin to verify both notification sides were written.
  perform tests_set_auth('00000000-0000-0000-0000-000000000001', true);
  select count(*) into member_after
  from public.notifications
  where user_id = '00000000-0000-0000-0000-000000000002'
    and title = 'Booking cancelled';
  select count(*) into coach_after
  from public.notifications
  where user_id = '00000000-0000-0000-0000-000000000001'
    and title = 'Booking cancelled';

  if member_after <> member_before + 1 then
    raise exception 'FAIL CASE 15 — member cancellation notification missing (before %, after %)', member_before, member_after;
  end if;
  if coach_after <> coach_before + 1 then
    raise exception 'FAIL CASE 15 — coach cancellation notification missing (before %, after %)', coach_before, coach_after;
  end if;
  raise notice 'PASS CASE 15 — cancellation generates the correct notifications';
end $$;

-- ------------------------------------------------------------
-- CASE 16 — Concurrent/stale transition cannot overwrite newer state
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);
do $$
declare
  affected integer;
  status_now text;
begin
  -- Actor A completes the booking (PENDING -> CONFIRMED -> COMPLETED).
  update public.bookings set status = 'CONFIRMED'
  where id = 'a0000000-0000-0000-0000-000000000007' and status = 'PENDING';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'FAIL CASE 16 — first transition affected %, expected 1', affected;
  end if;

  update public.bookings set status = 'COMPLETED'
  where id = 'a0000000-0000-0000-0000-000000000007' and status = 'CONFIRMED';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'FAIL CASE 16 — completion affected %, expected 1', affected;
  end if;

  -- Actor B still holds the original PENDING snapshot and races to overwrite.
  update public.bookings set status = 'CANCELLED'
  where id = 'a0000000-0000-0000-0000-000000000007' and status = 'PENDING';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL CASE 16 — stale transition affected %, expected 0', affected;
  end if;

  select status into status_now
  from public.bookings where id = 'a0000000-0000-0000-0000-000000000007';
  if status_now is distinct from 'COMPLETED' then
    raise exception 'FAIL CASE 16 — booking ended as %, expected COMPLETED', status_now;
  end if;

  raise notice 'PASS CASE 16 — concurrent/stale transition cannot overwrite newer state';
end $$;

rollback;
