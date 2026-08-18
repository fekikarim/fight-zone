-- ============================================================
-- FIGHT ZONE — Notification Center RLS + security suite
-- ============================================================
-- Prompt #6: Validates notification read scope (owner-only),
-- mark-read narrow update policy, deny-all insert/delete,
-- unread-count owner scoping, resource_id integrity, and
-- trigger-function regressions (booking + message inserts).
--
-- Run AFTER `supabase db reset --local` (seed users must exist):
--
--   supabase start
--   supabase db reset --local
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--       -f supabase/tests/notifications_rls.sql
--
-- Demo identities (never production):
--   member2 = ...002 (MEMBER, seeded as Karim Feki)
--   coach1  = ...001 (ADMIN + COACH, seeded as Seif Dridi)
--   member6 = ...006 (MEMBER, no bookings, no notification overlap)
--
-- The suite runs in a transaction that ROLLS BACK.
-- ============================================================

begin;

set role postgres;
reset request.jwt.claims;

-- ------------------------------------------------------------
-- Helpers (same pattern as messaging_rls.sql)
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

create or replace function tests_expect_error(label text, body text, expected_state text)
returns void
language plpgsql
as $$
begin
  begin
    execute body;
    raise exception 'FAIL % — expected error %, but succeeded', label, expected_state;
  exception
    when others then
      if sqlstate = expected_state then
        raise notice 'PASS % (raised %)', label, expected_state;
      else
        raise exception 'FAIL % — expected %, got % (%)', label, expected_state, sqlstate, sqlerrm;
      end if;
  end;
end;
$$;

-- ------------------------------------------------------------
-- Fixture IDs
-- ------------------------------------------------------------
\set member2 '00000000-0000-0000-0000-000000000002'
\set coach1  '00000000-0000-0000-0000-000000000001'
\set member6 '00000000-0000-0000-0000-000000000006'

-- Seed a notification owned by member2
insert into public.notifications (id, user_id, type, title, content, is_read, resource_type, resource_id)
values (
  'aaaa0000-0000-0000-0000-000000000001',
  :'member2',
  'BOOKING',
  'Test notification for member2',
  'Body of the test notification',
  false,
  'booking',
  '11111111-1111-1111-1111-111111111111'
);

-- Seed an already-read notification for member2
insert into public.notifications (id, user_id, type, title, content, is_read)
values (
  'aaaa0000-0000-0000-0000-000000000002',
  :'member2',
  'SYSTEM',
  'Already read notification',
  'This one is already read',
  true
);

-- Seed a notification for coach1
insert into public.notifications (id, user_id, type, title, content, is_read, resource_type, resource_id)
values (
  'aaaa0000-0000-0000-0000-000000000003',
  :'coach1',
  'MESSAGE',
  'Coach notification',
  'A coaching message',
  false,
  'conversation',
  '22222222-2222-2222-2222-222222222222'
);

-- ============================================================
-- SELECT: owner-only read scope
-- ============================================================

-- 1. anon cannot SELECT notifications
select tests_set_auth(null, false);
select tests_expect_rows(
  'NT-01: anon sees 0 notifications',
  'select * from public.notifications',
  0
);

-- 2. authenticated user sees only their own notifications
select tests_set_auth(:'member2', true);
select tests_expect_rows(
  'NT-02: member2 sees own notifications only (2 rows)',
  'select * from public.notifications',
  2
);

-- 3. IDOR: member2 cannot see coach1's notification
select tests_expect_rows(
  'NT-03: member2 cannot see coach1 notifications',
  'select * from public.notifications where user_id = ''coach1''::uuid',
  0
);

-- 4. unread count is owner-scoped
select tests_expect_rows(
  'NT-04: member2 unread count is 1 (owner-scoped)',
  'select * from public.notifications where user_id = :' || quote_literal(:'member2') || '::uuid and is_read = false',
  1
);

-- 5. member6 sees zero notifications (no rows seeded for them)
select tests_set_auth(:'member6', true);
select tests_expect_rows(
  'NT-05: member6 sees 0 notifications',
  'select * from public.notifications',
  0
);

-- ============================================================
-- UPDATE: mark-read own notification (narrow policy)
-- ============================================================

-- 6. member2 can mark own unread notification as read
select tests_set_auth(:'member2', true);
select tests_expect_affected(
  'NT-06: member2 marks own unread notification as read',
  'update public.notifications set is_read = true where id = ''aaaa0000-0000-0000-0000-000000000001''::uuid',
  1
);

-- 7. revert is_read back to false is blocked by WITH CHECK (is_read must be true after update)
select tests_set_auth(:'member2', true);
select tests_expect_affected(
  'NT-07: member2 cannot revert is_read to false (WITH CHECK blocks)',
  'update public.notifications set is_read = false where id = ''aaaa0000-0000-0000-0000-000000000001''::uuid',
  0
);

-- 8. member2 cannot change user_id
select tests_set_auth(:'member2', true);
select tests_expect_affected(
  'NT-08: member2 cannot change notification user_id',
  'update public.notifications set user_id = :' || quote_literal(:'member6') || '::uuid where id = ''aaaa0000-0000-0000-0000-000000000001''::uuid',
  0
);

-- 9. member2 cannot change title or content
select tests_set_auth(:'member2', true);
select tests_expect_affected(
  'NT-09: member2 cannot change title or content',
  'update public.notifications set title = ''HACKED'', content = ''pwned'' where id = ''aaaa0000-0000-0000-0000-000000000001''::uuid',
  0
);

-- 10. member2 cannot mark coach1's notification as read
select tests_set_auth(:'member2', true);
select tests_expect_affected(
  'NT-10: member2 cannot mark coach1 notification as read (IDOR)',
  'update public.notifications set is_read = true where id = ''aaaa0000-0000-0000-0000-000000000003''::uuid',
  0
);

-- 11. idempotent: marking already-read notification is no-op (0 affected)
select tests_set_auth(:'member2', true);
select tests_expect_affected(
  'NT-11: marking already-read notification is idempotent (0 affected)',
  'update public.notifications set is_read = true where id = ''aaaa0000-0000-0000-0000-000000000002''::uuid',
  0
);

-- ============================================================
-- mark-all: bulk update only touches own unread
-- ============================================================

-- 12. mark-all only affects member2's unread (1 row, not coach1's)
select tests_set_auth(:'member2', true);
select tests_expect_affected(
  'NT-12: mark-all only affects own unread (1 affected for member2)',
  'update public.notifications set is_read = true where is_read = false and user_id = :' || quote_literal(:'member2') || '::uuid',
  1
);

-- 13. after mark-all, member2 unread count is 0
select tests_set_auth(:'member2', true);
select tests_expect_rows(
  'NT-13: member2 unread count is 0 after mark-all',
  'select * from public.notifications where user_id = :' || quote_literal(:'member2') || '::uuid and is_read = false',
  0
);

-- 14. coach1 still has 1 unread (mark-all was scoped to member2)
select tests_set_auth(:'coach1', true);
select tests_expect_rows(
  'NT-14: coach1 still has 1 unread after member2 mark-all',
  'select * from public.notifications where user_id = :' || quote_literal(:'coach1') || '::uuid and is_read = false',
  1
);

-- ============================================================
-- INSERT / DELETE: deny-all for members
-- ============================================================

-- 15. member cannot INSERT notifications (RLS blocks)
select tests_set_auth(:'member2', true);
select tests_expect_error(
  'NT-15: member cannot INSERT notifications',
  $$insert into public.notifications (user_id, type, title, content) values ('00000000-0000-0000-0000-000000000002'::uuid, 'SYSTEM', 'Forged', 'Hack')$$,
  '42501'
);

-- 16. member cannot DELETE notifications
select tests_set_auth(:'member2', true);
select tests_expect_error(
  'NT-16: member cannot DELETE notifications',
  'delete from public.notifications where id = ''aaaa0000-0000-0000-0000-000000000001''::uuid',
  '42501'
);

-- ============================================================
-- resource columns: index + data integrity
-- ============================================================

-- 17. resource_type and resource_id are populated on seeded rows
select tests_set_auth(:'member2', true);
select tests_expect_rows(
  'NT-17: resource_type and resource_id are populated',
  'select * from public.notifications where id = ''aaaa0000-0000-0000-0000-000000000001''::uuid and resource_type = ''booking'' and resource_id is not null',
  1
);

-- 18. resource columns are nullable (system notification has null resource)
insert into public.notifications (user_id, type, title, content, resource_type, resource_id)
values (:'member2', 'SYSTEM', 'System test', 'No resource', null, null);
select tests_set_auth(:'member2', true);
select tests_expect_rows(
  'NT-18: null resource_type and resource_id are valid',
  'select * from public.notifications where resource_type is null and resource_id is null and title = ''System test''',
  1
);

-- ============================================================
-- Regression: trigger functions still fire correctly
-- ============================================================

-- 19. booking INSERT trigger still creates notifications for both parties
--     (both coach_id and member_id). Uses existing seed booking.
select tests_set_auth(null, false);
-- Switch to postgres superuser for trigger verification (triggers run as
-- the definer, but we want to verify the row exists after insert).
-- Insert a test booking using existing session + member + coach.
-- Session fixture: 11111111-1111-1111-1111-111111111111
-- coach1 = 001, member2 = 002
-- Use a unique booking id to avoid collisions.
insert into public.bookings (id, session_id, member_id, coach_id, status, scheduled_at)
values (
  'cccc0000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  :'member2',
  :'coach1',
  'PENDING',
  now() + interval '1 day'
);

-- Verify trigger created notifications for both coach and member
select tests_set_auth(null, false);
select tests_expect_rows(
  'NT-19: booking INSERT trigger creates notifications for both coach and member',
  'select * from public.notifications where resource_type = ''booking'' and resource_id = ''cccc0000-0000-0000-0000-000000000001''::uuid',
  2
);

-- 20. booking status change trigger still notifies member on CONFIRMED
update public.bookings set status = 'CONFIRMED' where id = 'cccc0000-0000-0000-0000-000000000001'::uuid;
select tests_set_auth(null, false);
select tests_expect_rows(
  'NT-20: booking CONFIRMED status change creates member notification',
  'select * from public.notifications where resource_type = ''booking'' and resource_id = ''cccc0000-0000-0000-0000-000000000001''::uuid and title = ''Booking confirmed''',
  1
);

-- 21. message INSERT trigger still notifies recipient (not sender)
-- Insert a conversation and message between member2 and coach1
insert into public.conversations (id, member_id, coach_id)
values ('33333333-3333-3333-3333-333333333333', :'member2', :'coach1');

insert into public.messages (id, conversation_id, sender_id, body)
values (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  :'member2',
  'Test message body'
);

-- Coach1 (recipient) should have a MESSAGE notification
select tests_set_auth(null, false);
select tests_expect_rows(
  'NT-21: message INSERT trigger notifies recipient (coach) with resource_type=conversation',
  'select * from public.notifications where user_id = :' || quote_literal(:'coach1') || '::uuid and resource_type = ''conversation'' and resource_id = ''33333333-3333-3333-3333-333333333333''::uuid',
  1
);

-- ============================================================
-- Rollback — no data persisted
-- ============================================================
rollback;

-- If all tests pass, only PASS notices appear.  A FAIL stops the suite.
-- Final output: expect 21 PASS lines.
