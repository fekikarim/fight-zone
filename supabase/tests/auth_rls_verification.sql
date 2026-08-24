-- ============================================================
-- FIGHT ZONE — RLS & authorization verification suite
-- ============================================================
-- Prompt #2 (auth/authz audit) test matrix.
--
-- Run AFTER `supabase db reset --local` (seed users must exist):
--
--   supabase start
--   supabase db reset --local
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--       -f supabase/tests/auth_rls_verification.sql
--
-- The whole suite runs inside a transaction that ROLLS BACK, so it is safe
-- to run repeatedly against local data.
--
-- Seed identities:
--   admin  = 00000000-0000-0000-0000-000000000001 (ADMIN + COACH)
--   member = 00000000-0000-0000-0000-000000000002 (MEMBER)
--
-- `auth.uid()` / `auth.role()` are simulated via `request.jwt.claims`,
-- mirroring exactly what PostgREST sends for anon/authenticated requests.
--
-- Notes on RLS semantics used by these assertions:
--   * INSERT that fails a WITH CHECK policy  -> raises insufficient_privilege
--   * UPDATE/DELETE on rows hidden by USING  -> silently affects 0 rows
--   * SELECT on hidden rows                  -> silently returns 0 rows

begin;

set role postgres;
reset request.jwt.claims;

-- ------------------------------------------------------------
-- Helpers
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

-- Asserts the number of rows returned by `body` (used for privacy reads).
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

-- Asserts the number of rows affected by a DML statement.
-- RLS-denied UPDATE/DELETE affect 0 rows (no exception), so `0` means denied.
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

-- ------------------------------------------------------------
-- Anonymous context
-- ------------------------------------------------------------
select tests_set_auth(null, false);

-- CASE 12 — anonymous must NOT read contact messages
select tests_expect_rows(
  'anon cannot read contact_messages',
  $$select * from public.contact_messages$$,
  0
);
select tests_expect_affected(
  'anon cannot update contact_messages',
  $$update public.contact_messages set status = 'READ'$$,
  0
);
select tests_expect_affected(
  'anon cannot delete contact_messages',
  $$delete from public.contact_messages$$,
  0
);

-- CASE 11 — anonymous CAN create a contact message (documented decision)
select tests_expect_allowed(
  'anon can insert contact_messages (member_id null)',
  $$insert into public.contact_messages (name, email, subject, message)
    values ('Test', 'test@example.com', 'Hello', 'This is a test message body.')$$
);

-- anonymous must NOT attach a spoofed member_id
select tests_expect_denied(
  'anon cannot insert contact_messages with a member_id',
  $$insert into public.contact_messages (member_id, name, email, subject, message)
    values ('00000000-0000-0000-0000-000000000002', 'Test', 'test@example.com', 'Hello', 'This is a test message body.')$$
);

-- Public content remains readable by anonymous
select tests_expect_allowed('anon can read sessions', $$select * from public.sessions$$);
select tests_expect_allowed('anon can read achievements', $$select * from public.achievements$$);
select tests_expect_allowed('anon can read public events', $$select * from public.events where is_public$$);
select tests_expect_allowed('anon can read published news', $$select * from public.news where is_published$$);
select tests_expect_allowed('anon can read media', $$select * from public.media where is_public$$);
select tests_expect_allowed('anon can read coach_profiles', $$select * from public.coach_profiles$$);

-- Private/management tables stay closed to anonymous
select tests_expect_rows('anon cannot read profiles', $$select * from public.profiles$$, 0);
select tests_expect_rows('anon cannot read bookings', $$select * from public.bookings$$, 0);
select tests_expect_rows('anon cannot read notifications', $$select * from public.notifications$$, 0);
select tests_expect_rows('anon cannot read user_role_assignments', $$select * from public.user_role_assignments$$, 0);

-- ------------------------------------------------------------
-- Seed a foreign member's data (as admin) so ownership tests are meaningful
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);

select tests_expect_allowed(
  'admin can create a member_profile',
  $$insert into public.member_profiles (id, skill_level)
    values ('00000000-0000-0000-0000-000000000001', 'ADVANCED')
    on conflict (id) do nothing$$
);
select tests_expect_allowed(
  'admin can create a booking for a member',
  $$insert into public.bookings (member_id, session_id, coach_id, scheduled_at, status)
    select '00000000-0000-0000-0000-000000000001', s.id, s.coach_id,
           now() + interval '1 day', 'PENDING'
    from public.sessions s
    limit 1$$
);

-- ------------------------------------------------------------
-- Member context
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);

-- CASE 9 / CASE 10 — member must NOT self-assign ADMIN / COACH
select tests_expect_denied(
  'member cannot assign themselves ADMIN',
  $$insert into public.user_role_assignments (user_id, role_id)
    select '00000000-0000-0000-0000-000000000002', r.id
    from public.roles r where r.name = 'ADMIN'$$
);
select tests_expect_denied(
  'member cannot assign themselves COACH',
  $$insert into public.user_role_assignments (user_id, role_id)
    select '00000000-0000-0000-0000-000000000002', r.id
    from public.roles r where r.name = 'COACH'$$
);
select tests_expect_denied(
  'member cannot grant another user a role',
  $$insert into public.user_role_assignments (user_id, role_id)
    select '00000000-0000-0000-0000-000000000001', r.id
    from public.roles r where r.name = 'ADMIN'$$
);

-- coach_profiles self-promotion must be denied (hardening migration)
select tests_expect_denied(
  'member cannot create their own coach_profile',
  $$insert into public.coach_profiles (id, experience_years, specialization, biography)
    values ('00000000-0000-0000-0000-000000000002', 1, 'x', 'y')$$
);

-- CASE 7 — member cannot read another member''s private booking
-- (the row exists; RLS must filter it out)
select tests_expect_rows(
  'member cannot read another member bookings',
  $$select b.* from public.bookings b
    where b.member_id = '00000000-0000-0000-0000-000000000001'$$,
  0
);

-- CASE 8 — member cannot modify another member''s booking
select tests_expect_affected(
  'member cannot update another member booking',
  $$update public.bookings set status = 'CANCELLED'
    where member_id = '00000000-0000-0000-0000-000000000001'$$,
  0
);

-- member cannot create a booking with a spoofed member_id (IDOR)
select tests_expect_denied(
  'member cannot create a booking for another member',
  $$insert into public.bookings (member_id, session_id, coach_id, scheduled_at, status)
    select '00000000-0000-0000-0000-000000000001', s.id, s.coach_id,
           now() + interval '2 days', 'PENDING'
    from public.sessions s
    limit 1$$
);

-- member cannot modify another user''s profile
select tests_expect_affected(
  'member cannot update another user profile',
  $$update public.profiles set full_name = 'Hacked'
    where id = '00000000-0000-0000-0000-000000000001'$$,
  0
);

-- member CAN read/update their own data
select tests_expect_allowed(
  'member can read their own profile',
  $$select * from public.profiles where id = '00000000-0000-0000-0000-000000000002'$$
);
select tests_expect_affected(
  'member can update their own profile',
  $$update public.profiles set phone = '+21600000000'
    where id = '00000000-0000-0000-0000-000000000002'$$,
  1
);

-- ------------------------------------------------------------
-- Admin context
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);

select tests_expect_allowed(
  'admin can grant a role',
  $$insert into public.user_role_assignments (user_id, role_id)
    select '00000000-0000-0000-0000-000000000002', r.id
    from public.roles r where r.name = 'COACH'$$
);
select tests_expect_allowed(
  'admin can create a coach_profile',
  $$insert into public.coach_profiles (id, experience_years, specialization, biography)
    values ('00000000-0000-0000-0000-000000000001', 15, 'Boxing', 'Head coach')$$
);
select tests_expect_affected(
  'admin can manage contact messages',
  $$update public.contact_messages set status = 'READ'$$,
  1
);
select tests_expect_allowed(
  'admin can read all profiles',
  $$select * from public.profiles$$
);
select tests_expect_allowed(
  'admin can read all bookings',
  $$select * from public.bookings$$
);

-- Helper semantics
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
do $$
begin
  if public.has_role('ADMIN') then
    raise exception 'FAIL — member unexpectedly has ADMIN role';
  end if;
  raise notice 'PASS — member has_role ADMIN = false';
end $$;
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);
do $$
begin
  if not public.is_admin_or_coach() then
    raise exception 'FAIL — admin is_admin_or_coach = false';
  end if;
  raise notice 'PASS — admin is_admin_or_coach = true';
end $$;

rollback;
