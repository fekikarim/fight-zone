-- ============================================================
-- FIGHT ZONE — Member ↔ Coach messaging suite
-- ============================================================
-- Prompt #5 test matrix: conversation authorization (booking relationship),
-- participant-only read scope (no admin-wide access, no is_admin_or_coach
-- shortcuts), immutable message history, recipient-derived sender, atomic
-- read state, cursor pagination and recipient-only notifications.
--
-- Run AFTER `supabase db reset --local` (seed users must exist), same as the
-- other suites:
--
--   supabase start
--   supabase db reset --local
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--       -f supabase/tests/messaging_rls.sql
--
-- The whole suite runs inside a transaction that ROLLS BACK, so it is safe
-- to run repeatedly against local data. Demo identities (never production):
--   coach1  = ...001 (ADMIN + COACH, seeded as Seif Dridi)
--   member2 = ...002 (MEMBER, seeded as Karim Feki)
--   coach2  = ...003 (COACH only, created here)
--   member5 = ...005 (MEMBER, has bookings with both coaches)
--   member6 = ...006 (MEMBER, no bookings at all)
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
--   * SECURITY DEFINER RPCs guard themselves -> raise 42501

begin;

set role postgres;
reset request.jwt.claims;

-- ------------------------------------------------------------
-- Helpers (mirror member_platform_rls.sql / coach_booking_management.sql)
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
declare
  v_s1 uuid;
  v_s2 uuid;
begin
  -- coach2: pure COACH (no ADMIN role) for coach-ownership tests.
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

  -- A second coach needs a session of their own.
  insert into public.sessions (coach_id, title, description, type, duration_min, price, is_active)
  values ('00000000-0000-0000-0000-000000000003',
          'Muay Thai Private Coaching',
          'One-on-one Muay Thai technique work.',
          'COMBO', 60, 45.00, true);

  -- member5: has bookings with both coaches (established relationship).
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000',
          '00000000-0000-0000-0000-000000000005',
          'authenticated', 'authenticated', 'member5@fightzone.example',
          crypt('Member5-1234', gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}',
          '{"full_name":"Member Five"}',
          now(), now())
  on conflict (id) do nothing;

  insert into public.member_profiles (id, skill_level, is_verified)
  values ('00000000-0000-0000-0000-000000000005', 'BEGINNER', true)
  on conflict (id) do nothing;

  -- member6: completely isolated (no bookings, no relationships).
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000',
          '00000000-0000-0000-0000-000000000006',
          'authenticated', 'authenticated', 'member6@fightzone.example',
          crypt('Member6-1234', gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}',
          '{"full_name":"Member Six"}',
          now(), now())
  on conflict (id) do nothing;

  insert into public.member_profiles (id, skill_level, is_verified)
  values ('00000000-0000-0000-0000-000000000006', 'BEGINNER', true)
  on conflict (id) do nothing;

  -- Sessions owned by each coach (for booking fixtures).
  select s.id into v_s1 from public.sessions s
  where s.coach_id = '00000000-0000-0000-0000-000000000001' limit 1;
  select s.id into v_s2 from public.sessions s
  where s.coach_id = '00000000-0000-0000-0000-000000000003' limit 1;

  -- Booking relationships:
  --   b1  member2 <-> coach1 (seed member ↔ seed coach)
  --   b2  member2 <-> coach2
  --   b3  member5 <-> coach1
  --   b4  member5 <-> coach2
  insert into public.bookings (id, member_id, session_id, coach_id, scheduled_at, status)
  values
    ('a0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', v_s1, '00000000-0000-0000-0000-000000000001', now() + interval '1 day',  'PENDING'),
    ('a0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', v_s2, '00000000-0000-0000-0000-000000000003', now() + interval '1 day',  'PENDING'),
    ('a0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000005', v_s1, '00000000-0000-0000-0000-000000000001', now() + interval '2 days', 'PENDING'),
    ('a0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000005', v_s2, '00000000-0000-0000-0000-000000000003', now() + interval '2 days', 'PENDING');
end $$;

-- Conversations (explicit ids for stable assertions).
--   conv1  member2 <-> coach1
--   conv2  member2 <-> coach2
insert into public.conversations (id, member_id, coach_id)
values
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');

-- Messages (immutable history; ids keep order stable).
--   m1 member2 -> coach1 (UNREAD for coach1)
--   m2 coach1  -> member2 (UNREAD for member2)
--   m3 coach2  -> member2 (UNREAD for member2)
insert into public.messages (id, conversation_id, sender_id, body)
values
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Good morning coach!'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ready when you are.'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'First session confirmed.');

-- ------------------------------------------------------------
-- CASE 1 — Anonymous cannot access private conversations
-- ------------------------------------------------------------
-- Supabase's default privileges let `anon` reference public tables; RLS is
-- the real boundary, so an anonymous client reads 0 rows (never a leak).
set role anon;
select tests_set_auth(null, false);
select tests_expect_rows('CASE 1 — anon cannot read conversations', $$select * from public.conversations$$, 0);

-- ------------------------------------------------------------
-- CASE 2 — Anonymous cannot access messages
-- ------------------------------------------------------------
select tests_expect_rows('CASE 2 — anon cannot read messages', $$select * from public.messages$$, 0);

-- ------------------------------------------------------------
-- CASE 3 — Anonymous cannot invoke private RPCs
-- ------------------------------------------------------------
select tests_expect_denied('CASE 3 — anon cannot call get_my_conversations', $$select * from public.get_my_conversations()$$);
select tests_expect_denied('CASE 3 — anon cannot call get_unread_message_count', $$select public.get_unread_message_count()$$);
select tests_expect_denied('CASE 3 — anon cannot call get_conversation_messages', $$select * from public.get_conversation_messages('b0000000-0000-0000-0000-000000000001')$$);
select tests_expect_denied('CASE 3 — anon cannot call mark_conversation_read', $$select public.mark_conversation_read('b0000000-0000-0000-0000-000000000001')$$);

-- ------------------------------------------------------------
-- CASE 4 — Member can list their own conversations
-- ------------------------------------------------------------
set role authenticated;
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
select tests_expect_rows(
  'CASE 4 — member2 lists own conversations',
  $$select * from public.get_my_conversations()$$,
  2
);

-- ------------------------------------------------------------
-- CASE 5 — Member can read their own conversation
-- ------------------------------------------------------------
select tests_expect_rows(
  'CASE 5 — member2 reads own conversation',
  $$select * from public.conversations where id = 'b0000000-0000-0000-0000-000000000001'$$,
  1
);

-- ------------------------------------------------------------
-- CASE 6 — Member cannot read another member's conversation
-- ------------------------------------------------------------
-- conv1/conv2 belong to member2; member5 and member6 must see nothing.
select tests_set_auth('00000000-0000-0000-0000-000000000005', true);
select tests_expect_rows(
  'CASE 6 — member5 cannot read member2 conversation',
  $$select * from public.conversations where id = 'b0000000-0000-0000-0000-000000000001'$$,
  0
);
select tests_set_auth('00000000-0000-0000-0000-000000000006', true);
select tests_expect_rows(
  'CASE 6 — member6 cannot read any conversation',
  $$select * from public.conversations$$,
  0
);

-- ------------------------------------------------------------
-- CASE 7 — Member can read their own messages
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
select tests_expect_rows(
  'CASE 7 — member2 reads own messages',
  $$select * from public.messages where conversation_id = 'b0000000-0000-0000-0000-000000000001'$$,
  2
);

-- ------------------------------------------------------------
-- CASE 8 — Member cannot read another member's messages
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000005', true);
select tests_expect_rows(
  'CASE 8 — member5 cannot read member2 messages',
  $$select * from public.messages where conversation_id = 'b0000000-0000-0000-0000-000000000001'$$,
  0
);

-- ------------------------------------------------------------
-- CASE 9 — Coach reads only the conversations they participate in
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);
select tests_expect_rows(
  'CASE 9 — coach1 reads own conversation',
  $$select * from public.conversations where id = 'b0000000-0000-0000-0000-000000000001'$$,
  1
);
select tests_expect_rows(
  'CASE 9 — coach1 lists only own conversations',
  $$select * from public.get_my_conversations()$$,
  1
);

-- ------------------------------------------------------------
-- CASE 10 — Coach cannot read another coach's conversation
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000003', true);
select tests_expect_rows(
  'CASE 10 — coach2 cannot read coach1 conversation',
  $$select * from public.conversations where id = 'b0000000-0000-0000-0000-000000000001'$$,
  0
);
select tests_expect_rows(
  'CASE 10 — coach2 cannot read coach1 messages',
  $$select * from public.messages where conversation_id = 'b0000000-0000-0000-0000-000000000001'$$,
  0
);

-- ------------------------------------------------------------
-- CASE 11 — ADMIN has NO admin-wide read (participant-only, like any coach)
-- ------------------------------------------------------------
-- coach1 is ADMIN+COACH and IS the coach participant of conv1, but must NOT
-- see conv2 (member2 <-> coach2). COACH membership must never be widened to
-- ADMIN-wide messaging through shortcuts.
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);
select tests_expect_rows(
  'CASE 11 — admin cannot read non-participant conversation',
  $$select * from public.conversations where id = 'b0000000-0000-0000-0000-000000000002'$$,
  0
);
select tests_expect_rows(
  'CASE 11 — admin RPC only returns own (coach) conversations',
  $$select * from public.get_my_conversations()$$,
  1
);

-- ------------------------------------------------------------
-- CASE 12 — Member can send a message in their own conversation
-- ------------------------------------------------------------
-- Sent into conv2 (member2 <-> coach2) so conv1 keeps exactly two fixture
-- messages for the read-state assertions in CASE 23-28.
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
select tests_expect_allowed(
  'CASE 12 — member2 sends a message in own conversation',
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('b0000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000002',
            'See you at the gym tonight.')$$
);

-- ------------------------------------------------------------
-- CASE 13 — Sender identity is derived, never client-forged
-- ------------------------------------------------------------
select tests_expect_denied(
  'CASE 13 — member2 cannot send as the coach (forged sender)',
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('b0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001',
            'Impersonation attempt.')$$
);
select tests_expect_denied(
  'CASE 13 — member2 cannot send with a null sender',
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('b0000000-0000-0000-0000-000000000001', null, 'Null sender.')$$
);

-- ------------------------------------------------------------
-- CASE 14 — Member cannot send into a conversation they are not part of
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000005', true);
select tests_expect_denied(
  'CASE 14 — member5 cannot send into member2 conversation',
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('b0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000005',
            'Should not be allowed.')$$
);

-- ------------------------------------------------------------
-- CASE 15 — Conversation creation requires a booking relationship
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000006', true);
select tests_expect_denied(
  'CASE 15 — member without any booking cannot start a conversation',
  $$insert into public.conversations (member_id, coach_id)
    values ('00000000-0000-0000-0000-000000000006',
            '00000000-0000-0000-0000-000000000001')$$
);

-- ------------------------------------------------------------
-- CASE 16 — Member with a booking can start a conversation
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000005', true);
select tests_expect_allowed(
  'CASE 16 — member5 starts conversation with coach1 (has booking)',
  $$insert into public.conversations (member_id, coach_id)
    values ('00000000-0000-0000-0000-000000000005',
            '00000000-0000-0000-0000-000000000001')$$
);

-- ------------------------------------------------------------
-- CASE 17 — Coach can start a conversation with a member who booked them
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000003', true);
select tests_expect_allowed(
  'CASE 17 — coach2 starts conversation with member5 (has booking)',
  $$insert into public.conversations (member_id, coach_id)
    values ('00000000-0000-0000-0000-000000000005',
            '00000000-0000-0000-0000-000000000003')$$
);

-- ------------------------------------------------------------
-- CASE 18 — Coach cannot start a conversation without a relationship
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000003', true);
select tests_expect_denied(
  'CASE 18 — coach2 cannot start conversation with member6 (no booking)',
  $$insert into public.conversations (member_id, coach_id)
    values ('00000000-0000-0000-0000-000000000006',
            '00000000-0000-0000-0000-000000000003')$$
);

-- ------------------------------------------------------------
-- CASE 19 — Duplicate conversations are impossible (race-proof)
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
select tests_expect_error(
  'CASE 19 — duplicate member/coach conversation rejected',
  $$insert into public.conversations (member_id, coach_id)
    values ('00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000001')$$,
  '23505'
);

-- ------------------------------------------------------------
-- CASE 20 — Messages are immutable: no client UPDATE
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
select tests_expect_affected(
  'CASE 20 — member cannot UPDATE a message',
  $$update public.messages set body = 'rewritten'
    where id = 'c0000000-0000-0000-0000-000000000001'$$,
  0
);

-- ------------------------------------------------------------
-- CASE 21 — Messages are immutable: no DELETE
-- ------------------------------------------------------------
select tests_expect_affected(
  'CASE 21 — member cannot DELETE a message',
  $$delete from public.messages where id = 'c0000000-0000-0000-0000-000000000001'$$,
  0
);

-- ------------------------------------------------------------
-- CASE 22 — Body constraints (plain text, trimmed, 1..4000 chars)
-- ------------------------------------------------------------
select tests_expect_error(
  'CASE 22 — empty/whitespace body rejected',
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('b0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002', '   ')$$,
  '23514'
);
select tests_expect_error(
  'CASE 22 — body with trailing whitespace rejected',
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('b0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002', 'Hello there ')$$,
  '23514'
);
select tests_expect_error(
  'CASE 22 — body over 4000 chars rejected',
  $$insert into public.messages (conversation_id, sender_id, body)
    values ('b0000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
            repeat('a', 4001))$$,
  '23514'
);

-- ------------------------------------------------------------
-- CASE 23 — Initial unread counts per participant
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
do $$
declare
  v_unread bigint;
begin
  select public.get_unread_message_count() into v_unread;
  if v_unread <> 2 then
    raise exception 'FAIL CASE 23 — member2 unread %, expected 2', v_unread;
  end if;
  raise notice 'PASS CASE 23 — member2 initial unread count (%)', v_unread;
end $$;
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);
do $$
declare
  v_unread bigint;
begin
  select public.get_unread_message_count() into v_unread;
  if v_unread <> 1 then
    raise exception 'FAIL CASE 23 — coach1 unread %, expected 1', v_unread;
  end if;
  raise notice 'PASS CASE 23 — coach1 initial unread count (%)', v_unread;
end $$;

-- ------------------------------------------------------------
-- CASE 24 — Recipient-only read marking (never touches sender's messages)
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000001', true);
do $$
declare
  v_marked integer;
  v_status text;
  v_m2_status text;
begin
  select public.mark_conversation_read('b0000000-0000-0000-0000-000000000001') into v_marked;
  if v_marked <> 1 then
    raise exception 'FAIL CASE 24 — coach marked %, expected 1', v_marked;
  end if;

  -- m1 (sent to coach1) is READ; m2 (sent by coach1) stays UNREAD for member2.
  select status into v_status from public.messages
  where id = 'c0000000-0000-0000-0000-000000000001';
  if v_status is distinct from 'READ' then
    raise exception 'FAIL CASE 24 — m1 status %, expected READ', v_status;
  end if;
  select status into v_m2_status from public.messages
  where id = 'c0000000-0000-0000-0000-000000000002';
  if v_m2_status is distinct from 'UNREAD' then
    raise exception 'FAIL CASE 24 — m2 status %, expected UNREAD (recipient was member2)', v_m2_status;
  end if;
  raise notice 'PASS CASE 24 — coach read marking is recipient-only';
end $$;

-- ------------------------------------------------------------
-- CASE 25 — Read marking is idempotent; unread drops to 0
-- ------------------------------------------------------------
do $$
declare
  v_marked integer;
  v_unread bigint;
begin
  select public.mark_conversation_read('b0000000-0000-0000-0000-000000000001') into v_marked;
  if v_marked <> 0 then
    raise exception 'FAIL CASE 25 — repeat mark affected %, expected 0', v_marked;
  end if;
  select public.get_unread_message_count() into v_unread;
  if v_unread <> 0 then
    raise exception 'FAIL CASE 25 — coach1 unread after marking %, expected 0', v_unread;
  end if;
  raise notice 'PASS CASE 25 — read marking is idempotent';
end $$;

-- ------------------------------------------------------------
-- CASE 26 — Member marks their received messages read
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
do $$
declare
  v_marked integer;
  v_status text;
  v_unread bigint;
begin
  select public.mark_conversation_read('b0000000-0000-0000-0000-000000000001') into v_marked;
  if v_marked <> 1 then
    raise exception 'FAIL CASE 26 — member marked %, expected 1', v_marked;
  end if;
  select status into v_status from public.messages
  where id = 'c0000000-0000-0000-0000-000000000002';
  if v_status is distinct from 'READ' then
    raise exception 'FAIL CASE 26 — m2 status %, expected READ', v_status;
  end if;
  select public.get_unread_message_count() into v_unread;
  if v_unread <> 1 then
    raise exception 'FAIL CASE 26 — member2 unread %, expected 1 (m3 in conv2)', v_unread;
  end if;
  raise notice 'PASS CASE 26 — member read marking works per conversation';
end $$;

-- ------------------------------------------------------------
-- CASE 27 — Read marking on a foreign conversation is denied
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000005', true);
select tests_expect_error(
  'CASE 27 — member5 cannot mark member2 conversation read',
  $$select public.mark_conversation_read('b0000000-0000-0000-0000-000000000001')$$,
  '42501'
);

-- ------------------------------------------------------------
-- CASE 28 — Message history is cursor-paginated and owned
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
-- Latest page includes both fixture messages (m1, m2).
select tests_expect_rows(
  'CASE 28 — member2 fetches latest page of own conversation',
  $$select * from public.get_conversation_messages('b0000000-0000-0000-0000-000000000001', null, 50)$$,
  2
);
-- Page strictly older than m1 (the oldest) is empty.
select tests_expect_rows(
  'CASE 28 — cursor at oldest message yields no older rows',
  $$select * from public.get_conversation_messages('b0000000-0000-0000-0000-000000000001',
      'c0000000-0000-0000-0000-000000000001', 50)$$,
  0
);
-- Cursor at m2 returns exactly m1 (the single older message).
select tests_expect_rows(
  'CASE 28 — cursor at m2 returns older page (m1)',
  $$select * from public.get_conversation_messages('b0000000-0000-0000-0000-000000000001',
      'c0000000-0000-0000-0000-000000000002', 50)$$,
  1
);
-- Foreign conversation raises for a participant of a DIFFERENT thread.
select tests_set_auth('00000000-0000-0000-0000-000000000005', true);
select tests_expect_error(
  'CASE 28 — foreign conversation history is denied',
  $$select * from public.get_conversation_messages('b0000000-0000-0000-0000-000000000001', null, 50)$$,
  '42501'
);
-- Limit clamp: out-of-range limits still behave (never leak, never crash).
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
select tests_expect_rows(
  'CASE 28 — out-of-range limit is clamped safely',
  $$select * from public.get_conversation_messages('b0000000-0000-0000-0000-000000000001', null, -5)$$,
  2
);

-- ------------------------------------------------------------
-- CASE 29 — New message notifies the recipient ONLY (never the sender)
-- ------------------------------------------------------------
do $$
declare
  v_coach_before bigint;
  v_coach_after bigint;
  v_member_before bigint;
  v_member_after bigint;
  v_conv_id uuid := 'b0000000-0000-0000-0000-000000000002';
  v_member2 uuid := '00000000-0000-0000-0000-000000000002';
  v_coach2 uuid := '00000000-0000-0000-0000-000000000003';
begin
  -- Switch to admin to count notifications for BOTH participants.
  perform tests_set_auth('00000000-0000-0000-0000-000000000001', true);

  select count(*) into v_coach_before
  from public.notifications
  where user_id = v_coach2 and type = 'MESSAGE' and title = 'New message from Karim Feki';
  select count(*) into v_member_before
  from public.notifications
  where user_id = v_member2 and type = 'MESSAGE' and title = 'New message from Coach Two';

  -- member2 sends a message in conv2 (coach2 is the recipient).
  perform tests_set_auth(v_member2, true);
  insert into public.messages (conversation_id, sender_id, body)
  values (v_conv_id, v_member2, 'Confirming my Friday slot.');

  -- Back to admin to verify the notification was created for coach2 only.
  perform tests_set_auth('00000000-0000-0000-0000-000000000001', true);
  select count(*) into v_coach_after
  from public.notifications
  where user_id = v_coach2 and type = 'MESSAGE' and title = 'New message from Karim Feki';
  select count(*) into v_member_after
  from public.notifications
  where user_id = v_member2 and type = 'MESSAGE' and title = 'New message from Coach Two';

  if v_coach_after <> v_coach_before + 1 then
    raise exception 'FAIL CASE 29 — recipient notification missing (before %, after %)', v_coach_before, v_coach_after;
  end if;
  if v_member_after <> v_member_before then
    raise exception 'FAIL CASE 29 — sender was notified (before %, after %)', v_member_before, v_member_after;
  end if;
  raise notice 'PASS CASE 29 — new message notifies recipient only';
end $$;

-- ------------------------------------------------------------
-- CASE 30 — Per-conversation unread counts from the list RPC
-- ------------------------------------------------------------
select tests_set_auth('00000000-0000-0000-0000-000000000002', true);
do $$
declare
  v_total bigint;
  v_conv2_unread bigint;
begin
  select count(*) into v_total
  from public.get_my_conversations()
  where conversation_id = 'b0000000-0000-0000-0000-000000000002';

  if v_total <> 1 then
    raise exception 'FAIL CASE 30 — conv2 missing from member2 list';
  end if;

  select unread_count into v_conv2_unread
  from public.get_my_conversations()
  where conversation_id = 'b0000000-0000-0000-0000-000000000002';

  -- Only m3 (from coach2) is unread for member2; member2's own sent messages
  -- (CASE 12 and CASE 29) are never counted against themselves.
  if v_conv2_unread <> 1 then
    raise exception 'FAIL CASE 30 — conv2 unread %, expected 1', v_conv2_unread;
  end if;
  raise notice 'PASS CASE 30 — per-conversation unread counts (%)', v_conv2_unread;
end $$;

rollback;
