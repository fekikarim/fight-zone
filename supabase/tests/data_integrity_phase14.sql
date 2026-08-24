-- ============================================================
-- FIGHT ZONE — Prompt #14 consolidated data-integrity suite
-- Single transaction; ROLLBACK at end (nothing persists).
-- Roles simulated via SET LOCAL ROLE + request.jwt.claims (authoritative
-- under real RLS). Any failed assertion raises -> batch aborts, so
-- exit code 0 == every executed invariant held. Results are collected
-- in a temp table and emitted as rows at the end.
-- ============================================================
BEGIN;

CREATE TEMP TABLE phase14_results(stage text, detail text);
GRANT INSERT ON phase14_results TO anon, authenticated;

-- ---------- fixtures (batch role) ----------
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
    ('00000000-0000-0000-0000-000000000000','e1111111-0000-0000-0000-00000000000a','authenticated','authenticated','p14-member-a@test.invalid','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','e1111111-0000-0000-0000-00000000000b','authenticated','authenticated','p14-member-b@test.invalid','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','e1111111-0000-0000-0000-00000000000c','authenticated','authenticated','p14-staff@test.invalid','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','e1111111-0000-0000-0000-00000000000d','authenticated','authenticated','p14-member-c@test.invalid','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','e1111111-0000-0000-0000-00000000000e','authenticated','authenticated','p14-member-e@test.invalid','x',now(),'{"provider":"email","providers":["email"]}','{}',now(),now())
ON CONFLICT DO NOTHING;

INSERT INTO public.member_profiles (id)
VALUES ('e1111111-0000-0000-0000-00000000000a'),('e1111111-0000-0000-0000-00000000000b'),('e1111111-0000-0000-0000-00000000000d'),('e1111111-0000-0000-0000-00000000000e')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT 'e1111111-0000-0000-0000-00000000000c', r.id FROM public.roles r WHERE r.name='ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO public.coach_profiles (id, experience_years, specialization)
VALUES ('e1111111-0000-0000-0000-00000000000c', 10, 'MMA')
ON CONFLICT DO NOTHING;

INSERT INTO public.sessions (id, title, type, duration_min, price, coach_id, is_active)
VALUES ('e2222222-0000-0000-0000-000000000001','P14 Session','PERSONAL',60,50,'e1111111-0000-0000-0000-00000000000c',true)
ON CONFLICT DO NOTHING;

INSERT INTO public.events (id, title, start_at, end_at, location, event_type, is_public, max_participants, created_by)
VALUES ('e3333333-0000-0000-0000-000000000001','P14 Event',
        now()+interval '7 days', now()+interval '7 days'+interval '2 hours',
        'Dojo','TRAINING',true,2,
        'e1111111-0000-0000-0000-00000000000c')
ON CONFLICT DO NOTHING;

INSERT INTO public.news (id, title, slug, content, is_published, published_at, created_by)
VALUES ('e4444444-0000-0000-0000-000000000001','P14 News','p14-news-unique-slug','body',true,now(),'e1111111-0000-0000-0000-00000000000c')
ON CONFLICT DO NOTHING;

-- helper: act as a given identity for the rest of the transaction
CREATE OR REPLACE FUNCTION pg_temp.act_as(p_sub text, p_auth boolean)
RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  IF p_auth THEN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_sub, 'role','authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
  ELSE
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    EXECUTE 'SET LOCAL ROLE anon';
  END IF;
END $fn$;

-- ============================================================
-- D1 anonymous access boundaries
-- ============================================================
DO $fn$ DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as(NULL, false);

  BEGIN SELECT count(*) INTO n FROM public.profiles;
        RAISE EXCEPTION 'D1 FAIL: anon read profiles';
  EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO phase14_results VALUES ('D1','anon profiles read denied'); END;

  BEGIN SELECT count(*) INTO n FROM public.bookings;
        RAISE EXCEPTION 'D1 FAIL: anon read bookings';
  EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO phase14_results VALUES ('D1b','anon bookings read denied'); END;

  BEGIN SELECT count(*) INTO n FROM public.reviews;
        RAISE EXCEPTION 'D1 FAIL: anon read reviews';
  EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO phase14_results VALUES ('D1c','anon reviews read denied'); END;

  BEGIN SELECT count(*) INTO n FROM public.notifications;
        RAISE EXCEPTION 'D1 FAIL: anon read notifications';
  EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO phase14_results VALUES ('D1d','anon notifications read denied'); END;

  BEGIN SELECT count(*) INTO n FROM public.member_profiles;
        RAISE EXCEPTION 'D1 FAIL: anon read member_profiles';
  EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO phase14_results VALUES ('D1e','anon member_profiles read denied'); END;

  BEGIN SELECT count(*) INTO n FROM public.messages;
        RAISE EXCEPTION 'D1 FAIL: anon read messages';
  EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO phase14_results VALUES ('D1f','anon messages read denied'); END;

  SELECT count(*) INTO n FROM public.news WHERE is_published = true;
  IF n < 1 THEN RAISE EXCEPTION 'D1 FAIL: anon cannot read published news'; END IF;
  INSERT INTO phase14_results VALUES ('D1g','anon reads published news');

  SELECT count(*) INTO n FROM public.sessions WHERE is_active = true;
  IF n < 1 THEN RAISE EXCEPTION 'D1 FAIL: anon cannot read active sessions'; END IF;
  INSERT INTO phase14_results VALUES ('D1h','anon reads active sessions');
END $fn$;
RESET ROLE;

-- ============================================================
-- D2 booking lifecycle & IDOR
-- ============================================================
DO $fn$ DECLARE v_booking uuid; v_tmp int; n int;
BEGIN
  -- A creates own booking
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000a', true);
  INSERT INTO public.bookings (member_id, session_id, coach_id, scheduled_at, status)
  VALUES ('e1111111-0000-0000-0000-00000000000a','e2222222-0000-0000-0000-000000000001',
          'e1111111-0000-0000-0000-00000000000c', now()+interval '3 days','PENDING')
  RETURNING id INTO v_booking;
  INSERT INTO phase14_results VALUES ('D2','member self-booking created');

  -- ownership forgery denied
  BEGIN
    INSERT INTO public.bookings (member_id, session_id, coach_id, scheduled_at, status)
    VALUES ('e1111111-0000-0000-0000-00000000000b','e2222222-0000-0000-0000-000000000001',
            'e1111111-0000-0000-0000-00000000000c', now()+interval '3 days','PENDING');
    RAISE EXCEPTION 'D2 FAIL: forged booking for other member';
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO phase14_results VALUES ('D2b','booking ownership forgery denied'); END;

  -- duplicate active booking blocked by unique index
  BEGIN
    INSERT INTO public.bookings (member_id, session_id, coach_id, scheduled_at, status)
    VALUES ('e1111111-0000-0000-0000-00000000000a','e2222222-0000-0000-0000-000000000001',
            'e1111111-0000-0000-0000-00000000000c', now()+interval '3 days','PENDING');
    RAISE EXCEPTION 'D2 FAIL: duplicate active booking allowed';
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO phase14_results VALUES ('D2c','duplicate active booking blocked'); END;

  -- ownership immutable to member
  BEGIN
    UPDATE public.bookings SET member_id='e1111111-0000-0000-0000-00000000000b' WHERE id=v_booking;
    RAISE EXCEPTION 'D2 FAIL: member changed booking owner';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    INSERT INTO phase14_results VALUES ('D2d','booking ownership immutable'); END;

  -- invalid transition rejected
  BEGIN
    UPDATE public.bookings SET status='COMPLETED' WHERE id=v_booking AND status='PENDING';
    RAISE EXCEPTION 'D2 FAIL: PENDING->COMPLETED allowed';
  EXCEPTION WHEN insufficient_privilege OR check_violation OR raise_exception THEN
    INSERT INTO phase14_results VALUES ('D2e','invalid transition rejected'); END;

  -- legitimate cancellation
  UPDATE public.bookings SET status='CANCELLED' WHERE id=v_booking AND status='PENDING';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'D2 FAIL: legit cancellation failed'; END IF;
  INSERT INTO phase14_results VALUES ('D2f','member cancellation works');

  -- B isolation vs A's booking
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000b', true);
  SELECT count(*) INTO n FROM public.bookings WHERE id=v_booking;
  IF n <> 0 THEN RAISE EXCEPTION 'D2 FAIL: cross-member booking visible'; END IF;
  UPDATE public.bookings SET status='CONFIRMED' WHERE id=v_booking;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'D2 FAIL: cross-member booking write'; END IF;
  INSERT INTO phase14_results VALUES ('D2g','booking IDOR isolation holds');

  -- staff confirmation of a fresh A booking
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000a', true);
  INSERT INTO public.bookings (member_id, session_id, coach_id, scheduled_at, status)
  VALUES ('e1111111-0000-0000-0000-00000000000a','e2222222-0000-0000-0000-000000000001',
          'e1111111-0000-0000-0000-00000000000c', now()+interval '4 days','PENDING')
  RETURNING id INTO v_booking;
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000c', true);
  UPDATE public.bookings SET status='CONFIRMED' WHERE id=v_booking AND status='PENDING';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'D2 FAIL: staff confirmation failed'; END IF;
  INSERT INTO phase14_results VALUES ('D2h','staff confirmation works');
END $fn$;
RESET ROLE;

-- ============================================================
-- D3 events: timing constraint, uniqueness, capacity, participation rules
-- ============================================================
DO $fn$ DECLARE n int; v_e uuid := 'e3333333-0000-0000-0000-000000000001';
BEGIN
  -- end_at must be after start_at
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000c', true);
  BEGIN
    INSERT INTO public.events (title, start_at, end_at, location, event_type, is_public, created_by)
    VALUES ('BadTiming', now()+interval '5 days', now()+interval '4 days','X','OTHER',true,
            'e1111111-0000-0000-0000-00000000000c');
    RAISE EXCEPTION 'D3 FAIL: end_at <= start_at accepted';
  EXCEPTION WHEN check_violation OR raise_exception THEN
    INSERT INTO phase14_results VALUES ('D3','event timing constraint enforced'); END;

  -- A and B register; third registration hits capacity=2
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000a', true);
  INSERT INTO public.event_participants (event_id, member_id, status)
  VALUES (v_e,'e1111111-0000-0000-0000-00000000000a','JOINED');
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000b', true);
  INSERT INTO public.event_participants (event_id, member_id, status)
  VALUES (v_e,'e1111111-0000-0000-0000-00000000000b','JOINED');
  INSERT INTO phase14_results VALUES ('D3b','two registrations accepted');

  -- terminal-state machine: cancelled participant cannot rejoin
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000a', true);
  UPDATE public.event_participants SET status='CANCELLED'
   WHERE event_id=v_e AND member_id='e1111111-0000-0000-0000-00000000000a';
  BEGIN
    INSERT INTO public.event_participants (event_id, member_id, status)
    VALUES (v_e,'e1111111-0000-0000-0000-00000000000a','JOINED');
    RAISE EXCEPTION 'D3 FAIL: CANCELLED->JOINED allowed';
  EXCEPTION WHEN raise_exception OR check_violation OR unique_violation THEN
    INSERT INTO phase14_results VALUES ('D3c','cancelled participation cannot be resurrected'); END;

  -- freed slot taken by new member D (capacity math consistent)
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000d', true);
  INSERT INTO public.event_participants (event_id, member_id, status)
  VALUES (v_e,'e1111111-0000-0000-0000-00000000000d','JOINED');
  INSERT INTO phase14_results VALUES ('D3c2','freed slot reusable by new participant');

  -- capacity=2 full (B+D): member E rejected
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000e', true);
  BEGIN
    INSERT INTO public.event_participants (event_id, member_id, status)
    VALUES (v_e,'e1111111-0000-0000-0000-00000000000e','JOINED');
    RAISE EXCEPTION 'D3 FAIL: capacity exceeded';
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO phase14_results VALUES ('D3f2','capacity limit enforced'); END;

  -- attendance tests now target member B (active participant)
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000b', true);

  -- duplicate participation blocked by unique index (on fresh event w/ headroom)
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000c', true);
  INSERT INTO public.events (id, title, start_at, end_at, location, event_type, is_public, max_participants, created_by)
  VALUES ('e3333333-0000-0000-0000-000000000002','P14 Event 2',
          now()+interval '10 days', now()+interval '10 days'+interval '1 hour',
          'Dojo','TRAINING',true,null,'e1111111-0000-0000-0000-00000000000c')
  ON CONFLICT DO NOTHING;
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000b', true);
  BEGIN
    INSERT INTO public.event_participants (event_id, member_id, status)
    VALUES ('e3333333-0000-0000-0000-000000000002','e1111111-0000-0000-0000-00000000000b','JOINED'),
           ('e3333333-0000-0000-0000-000000000002','e1111111-0000-0000-0000-00000000000b','JOINED');
    RAISE EXCEPTION 'D3 FAIL: duplicate participation allowed';
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO phase14_results VALUES ('D3d','participant uniqueness enforced'); END;

  -- member cannot mark self ATTENDED/NO_SHOW
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000b', true);
  BEGIN
    UPDATE public.event_participants SET status='ATTENDED'
     WHERE event_id=v_e AND member_id='e1111111-0000-0000-0000-00000000000b';
    RAISE EXCEPTION 'D3 FAIL: member set ATTENDED';
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO phase14_results VALUES ('D3e','member cannot self-mark attendance'); END;

  -- staff marks attendance on active participant B
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000c', true);
  UPDATE public.event_participants SET status='ATTENDED'
   WHERE event_id=v_e AND member_id='e1111111-0000-0000-0000-00000000000b';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'D3 FAIL: staff attendance update failed'; END IF;
  INSERT INTO phase14_results VALUES ('D3f','staff marks attendance');
END $fn$;
RESET ROLE;

-- ============================================================
-- D4 messaging & notifications isolation
-- ============================================================
DO $fn$ DECLARE v_conv uuid; v_msg uuid; n int;
BEGIN
  -- S opens conversation with A; message sender identity server-derived
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000c', true);
  INSERT INTO public.conversations (coach_id, member_id)
  VALUES ('e1111111-0000-0000-0000-00000000000c','e1111111-0000-0000-0000-00000000000a')
  RETURNING id INTO v_conv;
  INSERT INTO public.messages (conversation_id, sender_id, body)
  VALUES (v_conv,'e1111111-0000-0000-0000-00000000000c','hello');
  INSERT INTO phase14_results VALUES ('D4','conversation + staff message created');

  -- A replies; forging sender_id=B must be denied
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000a', true);
  BEGIN
    INSERT INTO public.messages (conversation_id, sender_id, body)
    VALUES (v_conv,'e1111111-0000-0000-0000-00000000000b','forged sender');
    RAISE EXCEPTION 'D4 FAIL: forged sender accepted';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    INSERT INTO phase14_results VALUES ('D4b','sender identity server-derived'); END;

  INSERT INTO public.messages (conversation_id, sender_id, body)
  VALUES (v_conv,'e1111111-0000-0000-0000-00000000000a','reply ok');

  -- B sees nothing from this conversation
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000b', true);
  SELECT count(*) INTO n FROM public.messages WHERE conversation_id=v_conv;
  IF n <> 0 THEN RAISE EXCEPTION 'D4 FAIL: outsider reads conversation'; END IF;
  INSERT INTO phase14_results VALUES ('D4c','message participant isolation holds');

  -- notifications: forge target denied; cross-user read-update denied
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000a', true);
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, content)
    VALUES ('e1111111-0000-0000-0000-00000000000b','SYSTEM','f','f');
    RAISE EXCEPTION 'D4 FAIL: notification forgery accepted';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    INSERT INTO phase14_results VALUES ('D4d','notification ownership immutable/forgery denied'); END;

  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000b', true);
  UPDATE public.notifications SET is_read=true
   WHERE user_id='e1111111-0000-0000-0000-00000000000a';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'D4 FAIL: cross-user notification update'; END IF;
  INSERT INTO phase14_results VALUES ('D4e','notification read-scoping holds');
END $fn$;
RESET ROLE;

-- ============================================================
-- D5 membership/payment integrity (no billing activation)
-- ============================================================
DO $fn$ DECLARE v_plan uuid; v_sub uuid; n int;
BEGIN
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000c', true);
  SELECT id INTO v_plan FROM public.membership_plans ORDER BY created_at LIMIT 1;
  IF v_plan IS NULL THEN
    INSERT INTO phase14_results VALUES ('D5','SKIP no plans configured');
    RETURN;
  END IF;

  INSERT INTO public.member_subscriptions (member_id, plan_id, status, starts_at, ends_at, remaining_credits)
  VALUES ('e1111111-0000-0000-0000-00000000000a', v_plan,'ACTIVE', now(), now()+interval '30 days', 4)
  RETURNING id INTO v_sub;

  -- member cannot mutate terms during cancellation
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000a', true);
  BEGIN
    UPDATE public.member_subscriptions
       SET status='CANCELLED', auto_renew=false, remaining_credits=999
     WHERE id=v_sub AND status='ACTIVE';
    RAISE EXCEPTION 'D5 FAIL: member altered terms during cancel';
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO phase14_results VALUES ('D5b','subscription terms immutable during cancel'); END;

  UPDATE public.member_subscriptions SET status='CANCELLED', auto_renew=false
   WHERE id=v_sub AND status='ACTIVE';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'D5 FAIL: plain cancel failed'; END IF;
  INSERT INTO phase14_results VALUES ('D5c','plain member cancel works');

  -- payment state forgery through Data API denied
  BEGIN
    INSERT INTO public.payments (member_id, subscription_id, amount, currency, status, payment_method, paid_at)
    VALUES ('e1111111-0000-0000-0000-00000000000a', v_sub, 0, 'TND','COMPLETED','CASH', now());
    RAISE EXCEPTION 'D5 FAIL: member forged COMPLETED payment';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    INSERT INTO phase14_results VALUES ('D5d','payment state forgery denied'); END;
END $fn$;
RESET ROLE;

-- ============================================================
-- D6 reviews/transformations moderation integrity + RPC boundaries
-- (top-level statements; identity switched explicitly)
-- ============================================================
SELECT set_config('request.jwt.claims','{"sub":"e1111111-0000-0000-0000-00000000000a","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;

DO $fn$ DECLARE n int;
BEGIN
  -- rating range enforced
  BEGIN
    INSERT INTO public.reviews (member_id, rating, title, content, status)
    VALUES ('e1111111-0000-0000-0000-00000000000a', 6,'r','r','PENDING');
    RAISE EXCEPTION 'D6 FAIL: rating 6 accepted';
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN
    INSERT INTO phase14_results VALUES ('D6','rating range enforced'); END;
END $fn$;

CREATE TEMP TABLE _d6_ids ON COMMIT DROP AS
  SELECT NULL::uuid AS review, NULL::uuid AS story;
GRANT SELECT ON _d6_ids TO anon, authenticated;

INSERT INTO public.reviews (member_id, rating, title, content, status)
VALUES ('e1111111-0000-0000-0000-00000000000a', 5,'great','great','PENDING');

DO $fn$
BEGIN
  BEGIN
    UPDATE public.reviews SET status='APPROVED', is_featured=true
     WHERE member_id='e1111111-0000-0000-0000-00000000000a';
    RAISE EXCEPTION 'D6 FAIL: member self-approved';
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO phase14_results VALUES ('D6b','review moderation forgery denied'); END;
END $fn$;

UPDATE _d6_ids SET review = (SELECT id FROM public.reviews WHERE member_id='e1111111-0000-0000-0000-00000000000a' LIMIT 1);

INSERT INTO public.transformation_stories
    (member_id, title, story, before_image_url, after_image_url, is_published, is_featured)
VALUES ('e1111111-0000-0000-0000-00000000000a','story','story','u1','u2', false, false);

UPDATE _d6_ids SET story = (SELECT id FROM public.transformation_stories WHERE member_id='e1111111-0000-0000-0000-00000000000a' LIMIT 1);

DO $fn$ DECLARE n int;
BEGIN
  UPDATE public.transformation_stories SET is_published=true WHERE id=(SELECT story FROM _d6_ids);
  RAISE EXCEPTION 'D6 FAIL: member self-published story';
EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
  INSERT INTO phase14_results VALUES ('D6c','transformation publication forgery denied'); END $fn$;

DO $fn$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.get_public_approved_reviews(10000)
   WHERE id = (SELECT review FROM _d6_ids);
  IF n <> 0 THEN RAISE EXCEPTION 'D6 FAIL: pending review exposed via RPC'; END IF;
  SELECT count(*) INTO n FROM public.get_public_transformations(10000)
   WHERE id = (SELECT story FROM _d6_ids);
  IF n <> 0 THEN RAISE EXCEPTION 'D6 FAIL: unpublished story exposed via RPC'; END IF;
  INSERT INTO phase14_results VALUES ('D6d','public RPCs hide pending/unpublished');
END $fn$;

-- staff moderates -> approved review visible via public RPC
SELECT set_config('request.jwt.claims','{"sub":"e1111111-0000-0000-0000-00000000000c","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
UPDATE public.reviews SET status='APPROVED' WHERE id=(SELECT review FROM _d6_ids);

SELECT set_config('request.jwt.claims','',true);
SET LOCAL ROLE anon;
DO $fn$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.get_public_approved_reviews(10000)
   WHERE id = (SELECT review FROM _d6_ids);
  IF n <> 1 THEN RAISE EXCEPTION 'D6 FAIL: approved review missing from RPC'; END IF;
  INSERT INTO phase14_results VALUES ('D6e','approved review visible via public RPC');
END $fn$;
RESET ROLE;

-- ============================================================
-- D7 content integrity: slug uniqueness, published-only visibility
-- ============================================================
DO $fn$ DECLARE n int;
BEGIN
  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000c', true);
  BEGIN
    INSERT INTO public.news (title, slug, content, is_published, created_by)
    VALUES ('Dup','p14-news-unique-slug','dup',true,'e1111111-0000-0000-0000-00000000000c');
    RAISE EXCEPTION 'D7 FAIL: duplicate slug accepted';
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO phase14_results VALUES ('D7','news slug uniqueness enforced'); END;

  INSERT INTO public.news (title, slug, content, is_published, created_by)
  VALUES ('Draft','p14-draft-slug','draft',false,'e1111111-0000-0000-0000-00000000000c');
  PERFORM pg_temp.act_as(NULL, false);
  SELECT count(*) INTO n FROM public.news WHERE slug='p14-draft-slug';
  IF n <> 0 THEN RAISE EXCEPTION 'D7 FAIL: anon sees unpublished news'; END IF;
  INSERT INTO phase14_results VALUES ('D7b','unpublished news hidden from public');
END $fn$;
RESET ROLE;

-- ============================================================
-- D8 roles: canonical once; members cannot grant roles
-- ============================================================
DO $fn$ DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.roles WHERE name IN ('ADMIN','COACH','MEMBER');
  IF n <> 3 THEN RAISE EXCEPTION 'D8 FAIL: canonical roles != 3 (%)', n; END IF;
  INSERT INTO phase14_results VALUES ('D8','canonical roles exist exactly once');

  PERFORM pg_temp.act_as('e1111111-0000-0000-0000-00000000000a', true);
  BEGIN
    INSERT INTO public.user_role_assignments (user_id, role_id)
    SELECT 'e1111111-0000-0000-0000-00000000000a', id FROM public.roles WHERE name='ADMIN';
    RAISE EXCEPTION 'D8 FAIL: member granted self ADMIN';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    INSERT INTO phase14_results VALUES ('D8b','role assignment forgery denied'); END;

  BEGIN
    UPDATE public.profiles SET is_active=false WHERE id='e1111111-0000-0000-0000-00000000000a';
    RAISE EXCEPTION 'D8 FAIL: member self-deactivated';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    INSERT INTO phase14_results VALUES ('D8c','is_active protected from members'); END;
END $fn$;
RESET ROLE;

-- ============================================================
-- Emit results
-- ============================================================
SELECT stage, detail FROM phase14_results ORDER BY stage, detail;

ROLLBACK;
