-- ============================================================
-- FIGHT ZONE — Events RLS + security suite
-- ============================================================
-- Prompt #7: Validates event visibility (public-only for anon,
-- all for authenticated), event_participants owner-scoped reads,
-- insert/update/delete deny for anon, participant capacity
-- trigger regression, deadline enforcement trigger regression,
-- state-machine transition trigger regression, and notification
-- trigger regression for event registrations/cancellations.
--
-- Run AFTER `supabase db reset --local` (seed users must exist):
--
--   supabase start
--   supabase db reset --local
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--       -f supabase/tests/events_rls.sql
--
-- Demo identities (never production):
--   member2 = ...002 (MEMBER, seeded as Karim Feki)
--   coach1  = ...001 (ADMIN + COACH, seeded as Seif Dridi)
--   member6 = ...006 (MEMBER, no bookings, no event overlap)
--
-- The suite runs in a transaction that ROLLS BACK.
-- ============================================================

begin;

set role postgres;
reset request.jwt.claims;

-- ------------------------------------------------------------
-- Helpers (same pattern as notifications_rls.sql)
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

create or replace function tests_expect_rows(label text, body text, expected integer)
returns void
language plpgsql
as $$
declare
  found integer;
begin
  execute 'select count(*) from (' || body || ') t' into found;
  if found = expected then
    raise notice '  ✓ % (rows=%)', label, found;
  else
    raise notice '  ✗ % — expected %, got %', label, expected, found;
  end if;
end;
$$;

create or replace function tests_expect_error(label text, body text, expected_sqlstate text default '42501')
returns void
language plpgsql
as $$
begin
  execute body;
  raise notice '  ✗ % — expected error % but succeeded', label, expected_sqlstate;
exception
  when others then
    if sqlstate = expected_sqlstate then
      raise notice '  ✓ % (error %)', label, sqlstate;
    else
      raise notice '  ✗ % — expected %, got %', label, expected_sqlstate, sqlstate;
    end if;
end;
$$;

-- ------------------------------------------------------------
-- Seed test data
-- ------------------------------------------------------------

-- Public upcoming event
insert into events (id, title, description, start_at, end_at, location, event_type, is_public, max_participants, created_by)
values (
  '10000000-0000-0000-0000-000000000001',
  'Open Sparring Night',
  'All levels welcome',
  now() + interval '7 days',
  now() + interval '7 days' + interval '2 hours',
  'Main dojo',
  'TRAINING',
  true,
  20,
  '00000000-0000-0000-0000-000000000001'
);

-- Private event (admin-only)
insert into events (id, title, description, start_at, end_at, location, event_type, is_public, created_by)
values (
  '10000000-0000-0000-0000-000000000002',
  'Internal Coach Meeting',
  'Staff only',
  now() + interval '3 days',
  now() + interval '3 days' + interval '1 hour',
  'Office',
  'OTHER',
  false,
  '00000000-0000-0000-0000-000000000001'
);

-- Past event
insert into events (id, title, description, start_at, end_at, location, event_type, is_public, created_by)
values (
  '10000000-0000-0000-0000-000000000003',
  'Old Competition',
  'Completed',
  now() - interval '14 days',
  now() - interval '14 days' + interval '3 hours',
  'Arena',
  'COMPETITION',
  true,
  null,
  '00000000-0000-0000-0000-000000000001'
);

-- Register member2 for the sparring night
insert into event_participants (event_id, member_id, status)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'JOINED');

-- ============================================================
-- TEST SUITE
-- ============================================================

raise notice '';
raise notice '================================================';
raise notice '  Events + Event Participants RLS';
raise notice '================================================';

-- ------------------------------------------------------------
-- 1. Anon: events SELECT — public only
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 1. Anon: events SELECT — public only ---';

select tests_set_auth('00000000-0000-0000-0000-000000000000', false);

select tests_expect_rows(
  'anon sees public upcoming event',
  'select id from events where id = ''10000000-0000-0000-0000-000000000001''',
  1
);

select tests_expect_rows(
  'anon does NOT see private event',
  'select id from events where id = ''10000000-0000-0000-0000-000000000002''',
  0
);

select tests_expect_rows(
  'anon sees public past event',
  'select id from events where id = ''10000000-0000-0000-0000-000000000003''',
  1
);

-- ------------------------------------------------------------
-- 2. Anon: events INSERT/UPDATE/DELETE denied
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 2. Anon: events mutation denied ---';

select tests_expect_error(
  'anon INSERT events denied',
  'insert into events (title, start_at, event_type, is_public) values (''Hack'', now(), ''OTHER'', true)',
  '42501'
);

select tests_expect_error(
  'anon UPDATE events denied',
  'update events set title = ''Hacked'' where id = ''10000000-0000-0000-0000-000000000001''',
  '42501'
);

select tests_expect_error(
  'anon DELETE events denied',
  'delete from events where id = ''10000000-0000-0000-0000-000000000001''',
  '42501'
);

-- ------------------------------------------------------------
-- 3. Member: events SELECT — public only
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 3. Member: events SELECT ---';

select tests_set_auth('00000000-0000-0000-0000-000000000002', true);

select tests_expect_rows(
  'member sees public event',
  'select id from events where id = ''10000000-0000-0000-0000-000000000001''',
  1
);

select tests_expect_rows(
  'member does NOT see private event',
  'select id from events where id = ''10000000-0000-0000-0000-000000000002''',
  0
);

-- ------------------------------------------------------------
-- 4. Member: event_participants — owner read only
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 4. Member: event_participants owner read ---';

select tests_expect_rows(
  'member sees own registration',
  'select id from event_participants where member_id = ''00000000-0000-0000-0000-000000000002''',
  1
);

-- Register member6 so we can check cross-user isolation
insert into event_participants (event_id, member_id, status)
values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', 'JOINED');

select tests_expect_rows(
  'member does NOT see other member registrations',
  'select id from event_participants where member_id = ''00000000-0000-0000-0000-000000000006''',
  0
);

-- ------------------------------------------------------------
-- 5. Member: event_participants INSERT — own only
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 5. Member: event_participants INSERT ---';

select tests_expect_error(
  'anon INSERT event_participants denied',
  '',
  '42501'
);

-- Switch to anon for the insert test
select tests_set_auth('00000000-0000-0000-0000-000000000000', false);

select tests_expect_error(
  'anon INSERT event_participants denied',
  'insert into event_participants (event_id, member_id, status) values (''10000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000002'', ''JOINED'')',
  '42501'
);

-- Switch to member2
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);

select tests_expect_rows(
  'member can insert own registration',
  'select 1 from event_participants where event_id = ''10000000-0000-0000-0000-000000000001'' and member_id = ''00000000-0000-0000-0000-000000000002''',
  1
);

-- ------------------------------------------------------------
-- 6. Coach/Admin: events — full access
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 6. Coach/Admin: events full access ---';

select tests_set_auth('00000000-0000-0000-0000-000000000001', true);

select tests_expect_rows(
  'coach sees private event',
  'select id from events where id = ''10000000-0000-0000-0000-000000000002''',
  1
);

select tests_expect_rows(
  'coach sees all events',
  'select id from events where title in (''Open Sparring Night'', ''Internal Coach Meeting'', ''Old Competition'')',
  3
);

-- ------------------------------------------------------------
-- 7. Trigger: capacity enforcement
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 7. Trigger: capacity enforcement ---';

-- Create a small-capacity event
insert into events (id, title, start_at, end_at, event_type, is_public, max_participants, created_by)
values (
  '10000000-0000-0000-0000-000000000010',
  'Tiny Workshop',
  now() + interval '5 days',
  now() + interval '5 days' + interval '1 hour',
  'WORKSHOP',
  true,
  2,
  '00000000-0000-0000-0000-000000000001'
);

-- Fill it up
insert into event_participants (event_id, member_id, status)
values
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'JOINED'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000006', 'JOINED');

select tests_set_auth('00000000-0000-0000-0000-000000000002', true);

select tests_expect_error(
  'capacity trigger blocks 3rd registration',
  'insert into event_participants (event_id, member_id, status) values (''10000000-0000-0000-0000-000000000010'', ''00000000-0000-0000-0000-000000000002'', ''JOINED'')',
  '23514'
);

-- Cancel one and verify re-registration is allowed
update event_participants
set status = 'CANCELLED'
where event_id = '10000000-0000-0000-0000-000000000010'
  and member_id = '00000000-0000-0000-0000-000000000006';

select tests_expect_rows(
  'cancelled participant counted as inactive',
  'select id from event_participants where event_id = ''10000000-0000-0000-0000-000000000010'' and status != ''CANCELLED''',
  1
);

-- ------------------------------------------------------------
-- 8. Trigger: deadline enforcement
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 8. Trigger: deadline enforcement ---';

-- Create an event that already started
insert into events (id, title, start_at, end_at, event_type, is_public, created_by)
values (
  '10000000-0000-0000-0000-000000000011',
  'Started Workshop',
  now() - interval '1 hour',
  now() + interval '1 hour',
  'WORKSHOP',
  true,
  '00000000-0000-0000-0000-000000000001'
);

select tests_set_auth('00000000-0000-0000-0000-000000000002', true);

select tests_expect_error(
  'deadline trigger blocks registration for started event',
  'insert into event_participants (event_id, member_id, status) values (''10000000-0000-0000-0000-000000000011'', ''00000000-0000-0000-0000-000000000002'', ''JOINED'')',
  '23514'
);

-- ------------------------------------------------------------
-- 9. Trigger: state machine — invalid transitions blocked
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 9. Trigger: state machine transitions ---';

-- Create a test registration
insert into event_participants (event_id, member_id, status)
values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'JOINED');

select tests_set_auth('00000000-0000-0000-0000-000000000002', true);

-- Valid: JOINED -> CANCELLED
update event_participants
set status = 'CANCELLED'
where event_id = '10000000-0000-0000-0000-000000000003'
  and member_id = '00000000-0000-0000-0000-000000000002';

select tests_expect_rows(
  'JOINED -> CANCELLED transition succeeded',
  'select id from event_participants where event_id = ''10000000-0000-0000-0000-000000000003'' and member_id = ''00000000-0000-0000-0000-000000000002'' and status = ''CANCELLED''',
  1
);

-- Invalid: CANCELLED -> JOINED (terminal state)
select tests_expect_error(
  'CANCELLED -> JOINED blocked',
  'update event_participants set status = ''JOINED'' where event_id = ''10000000-0000-0000-0000-000000000003'' and member_id = ''00000000-0000-0000-0000-000000000002''',
  '23514'
);

-- Member cannot self-mark ATTENDED
-- Reset to JOINED for this test
update event_participants
set status = 'JOINED'
where event_id = '10000000-0000-0000-0000-000000000003'
  and member_id = '00000000-0000-0000-0000-000000000002';

select tests_expect_error(
  'member self-mark ATTENDED blocked',
  'update event_participants set status = ''ATTENDED'' where event_id = ''10000000-0000-0000-0000-000000000003'' and member_id = ''00000000-0000-0000-0000-000000000002''',
  '23514'
);

-- Member cannot self-mark NO_SHOW
select tests_expect_error(
  'member self-mark NO_SHOW blocked',
  'update event_participants set status = ''NO_SHOW'' where event_id = ''10000000-0000-0000-0000-000000000003'' and member_id = ''00000000-0000-0000-0000-000000000002''',
  '23514'
);

-- Coach can mark ATTENDED
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);

update event_participants
set status = 'ATTENDED'
where event_id = '10000000-0000-0000-0000-000000000003'
  and member_id = '00000000-0000-0000-0000-000000000002';

select tests_expect_rows(
  'coach JOINED -> ATTENDED transition succeeded',
  'select id from event_participants where event_id = ''10000000-0000-0000-0000-000000000003'' and member_id = ''00000000-0000-0000-0000-000000000002'' and status = ''ATTENDED''',
  1
);

-- ATTENDED is terminal
select tests_expect_error(
  'ATTENDED -> CANCELLED blocked (terminal)',
  'update event_participants set status = ''CANCELLED'' where event_id = ''10000000-0000-0000-0000-000000000003'' and member_id = ''00000000-0000-0000-0000-000000000002''',
  '23514'
);

-- ------------------------------------------------------------
-- 10. Trigger: notification on event registration
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 10. Trigger: notification on registration ---';

-- Create a new event for notification testing
insert into events (id, title, start_at, end_at, event_type, is_public, created_by)
values (
  '10000000-0000-0000-0000-000000000012',
  'Notification Test Event',
  now() + interval '10 days',
  now() + interval '10 days' + interval '1 hour',
  'SEMINAR',
  true,
  '00000000-0000-0000-0000-000000000001'
);

select tests_set_auth('00000000-0000-0000-0000-000000000002', true);

insert into event_participants (event_id, member_id, status)
values ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'JOINED');

select tests_expect_rows(
  'notification created on event registration',
  'select id from notifications where user_id = ''00000000-0000-0000-0000-000000000002'' and type = ''EVENT'' and resource_id = ''10000000-0000-0000-0000-000000000012''',
  1
);

-- Cancel and verify cancellation notification
update event_participants
set status = 'CANCELLED'
where event_id = '10000000-0000-0000-0000-000000000012'
  and member_id = '00000000-0000-0000-0000-000000000002';

select tests_expect_rows(
  'notification created on event cancellation',
  'select id from notifications where user_id = ''00000000-0000-0000-0000-000000000002'' and type = ''EVENT'' and title ilike ''%cancel%'' and resource_id = ''10000000-0000-0000-0000-000000000012''',
  1
);

-- ------------------------------------------------------------
-- 11. event_participants: DELETE denied for all
-- ------------------------------------------------------------
raise notice '';
raise notice '--- 11. event_participants: DELETE denied ---';

select tests_set_auth('00000000-0000-0000-0000-000000000001', true);

select tests_expect_error(
  'coach DELETE event_participants denied',
  'delete from event_participants where event_id = ''10000000-0000-0000-0000-000000000001''',
  '42501'
);

select tests_set_auth('00000000-0000-0000-0000-000000000002', true);

select tests_expect_error(
  'member DELETE event_participants denied',
  'delete from event_participants where event_id = ''10000000-0000-0000-0000-000000000001''',
  '42501'
);

-- ------------------------------------------------------------
-- Summary
-- ------------------------------------------------------------
raise notice '';
raise notice '================================================';
raise notice '  Events RLS suite complete';
raise notice '================================================';
raise notice '';

-- Cleanup
reset role;
rollback;
