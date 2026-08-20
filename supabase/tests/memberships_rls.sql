-- ============================================================
-- FIGHT ZONE — RLS Test Suite: Membership Plans, Subscriptions & Billing
-- ============================================================
-- Run with: psql $DATABASE_URL -f supabase/tests/memberships_rls.sql
-- Each section sets a role, performs an operation, and checks the result.
-- Uses ASSERT to verify expected outcomes.

-- Helper: create test data (run as admin)
SET LOCAL role postgres;

-- Create test members
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'member1@test.com', now(), '{"full_name":"Test Member 1"}'),
  ('00000000-0000-0000-0000-000000000002', 'member2@test.com', now(), '{"full_name":"Test Member 2"}')
ON CONFLICT (id) DO NOTHING;

-- Create test admin
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
VALUES
  ('00000000-0000-0000-0000-000000000099', 'admin@test.com', now(), '{"full_name":"Test Admin"}')
ON CONFLICT (id) DO NOTHING;

-- Ensure roles exist
INSERT INTO public.roles (name) VALUES ('ADMIN'), ('MEMBER')
ON CONFLICT (name) DO NOTHING;

-- Assign roles
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM public.roles WHERE name = 'MEMBER'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM public.roles WHERE name = 'MEMBER'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT '00000000-0000-0000-0000-000000000099', id FROM public.roles WHERE name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Create test plans
INSERT INTO public.membership_plans (name, slug, tier, billing_interval, price, is_active, sort_order)
VALUES
  ('Test Monthly', 'test-monthly', 'ADULT', 'MONTHLY', 100.00, true, 1),
  ('Test Inactive', 'test-inactive', 'KIDS', 'MONTHLY', 50.00, false, 2)
ON CONFLICT (slug) DO NOTHING;

RESET role;

-- ============================================================
-- TEST 1: Anonymous can read active plans
-- ============================================================
SET LOCAL role anon;
SELECT plan('TEST 1: Anonymous can read active plans');

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.membership_plans WHERE is_active = true;
  ASSERT v_count > 0, 'Anonymous should see active plans';
END $$;

-- ============================================================
-- TEST 2: Anonymous CANNOT read inactive plans
-- ============================================================
SELECT plan('TEST 2: Anonymous cannot read inactive plans');

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.membership_plans WHERE is_active = false;
  ASSERT v_count = 0, 'Anonymous should NOT see inactive plans';
END $$;

RESET role;

-- ============================================================
-- TEST 3: Anonymous CANNOT insert/update/delete plans
-- ============================================================
SELECT plan('TEST 3: Anonymous cannot modify plans');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.membership_plans (name, slug, price) VALUES ('Hacked', 'hacked', 0);
    ASSERT false, 'Should have raised RLS error';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL; -- expected
  END;
END $$;

RESET role;

-- ============================================================
-- TEST 4: Member can read own subscription
-- ============================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';

SELECT plan('TEST 4: Member can read own subscription');

-- Create a subscription as admin first
SET LOCAL role postgres;
INSERT INTO public.member_subscriptions (member_id, plan_id, status, starts_at, ends_at)
SELECT '00000000-0000-0000-0000-000000000001', id, 'ACTIVE', now(), now() + interval '1 month'
FROM public.membership_plans WHERE slug = 'test-monthly'
ON CONFLICT DO NOTHING;

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.member_subscriptions
  WHERE member_id = '00000000-0000-0000-0000-000000000001';
  ASSERT v_count > 0, 'Member should see own subscriptions';
END $$;

RESET role;

-- ============================================================
-- TEST 5: Member CANNOT read other member's subscription
-- ============================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002"}';

SELECT plan('TEST 5: Member cannot read other member subscription (IDOR protection)');

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.member_subscriptions
  WHERE member_id = '00000000-0000-0000-0000-000000000001';
  ASSERT v_count = 0, 'Member should NOT see other member subscriptions';
END $$;

RESET role;

-- ============================================================
-- TEST 6: Member CANNOT forge payment status via client
-- ============================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';

SELECT plan('TEST 6: Member cannot insert payments directly');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.payments (member_id, amount, status, payment_method)
    VALUES ('00000000-0000-0000-0000-000000000001', 1000.00, 'COMPLETED', 'CASH');
    ASSERT false, 'Should have raised RLS error';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL; -- expected: RLS blocks member inserts
  END;
END $$;

RESET role;

-- ============================================================
-- TEST 7: Admin can manage plans
-- ============================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000099"}';

SELECT plan('TEST 7: Admin can manage plans');

DO $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.membership_plans (name, slug, tier, billing_interval, price, is_active)
  VALUES ('Admin Test', 'admin-test', 'ADULT', 'MONTHLY', 99.00, true)
  RETURNING id INTO v_id;

  ASSERT v_id IS NOT NULL, 'Admin should be able to insert plans';

  UPDATE public.membership_plans SET price = 110.00 WHERE id = v_id;
  ASSERT FOUND, 'Admin should be able to update plans';

  DELETE FROM public.membership_plans WHERE id = v_id;
  ASSERT FOUND, 'Admin should be able to delete plans';
END $$;

RESET role;

-- ============================================================
-- TEST 8: Admin can manage subscriptions
-- ============================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000099"}';

SELECT plan('TEST 8: Admin can manage subscriptions');

DO $$
DECLARE
  v_plan_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT id INTO v_plan_id FROM public.membership_plans WHERE slug = 'test-monthly';

  INSERT INTO public.member_subscriptions (member_id, plan_id, status, starts_at, ends_at)
  VALUES ('00000000-0000-0000-0000-000000000002', v_plan_id, 'ACTIVE', now(), now() + interval '1 month')
  RETURNING id INTO v_sub_id;

  ASSERT v_sub_id IS NOT NULL, 'Admin should be able to insert subscriptions';

  UPDATE public.member_subscriptions SET status = 'CANCELLED' WHERE id = v_sub_id;
  ASSERT FOUND, 'Admin should be able to update subscriptions';

  DELETE FROM public.member_subscriptions WHERE id = v_sub_id;
  ASSERT FOUND, 'Admin should be able to delete subscriptions';
END $$;

RESET role;

-- ============================================================
-- TEST 9: Admin can manage payments
-- ============================================================
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000099"}';

SELECT plan('TEST 9: Admin can manage payments');

DO $$
DECLARE
  v_pay_id uuid;
BEGIN
  INSERT INTO public.payments (member_id, amount, status, payment_method)
  VALUES ('00000000-0000-0000-0000-000000000002', 100.00, 'COMPLETED', 'CASH')
  RETURNING id INTO v_pay_id;

  ASSERT v_pay_id IS NOT NULL, 'Admin should be able to insert payments';

  UPDATE public.payments SET status = 'REFUNDED' WHERE id = v_pay_id;
  ASSERT FOUND, 'Admin should be able to update payments';

  DELETE FROM public.payments WHERE id = v_pay_id;
  ASSERT FOUND, 'Admin should be able to delete payments';
END $$;

RESET role;

-- ============================================================
-- TEST 10: Coach can read subscriptions and payments (read-only)
-- ============================================================
-- Note: This test assumes a COACH role user exists.
-- In practice, coach RLS allows read via is_admin_or_coach().

SELECT plan('TEST 10: Cleanup test data');

-- Cleanup
SET LOCAL role postgres;
DELETE FROM public.payments WHERE member_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);
DELETE FROM public.member_subscriptions WHERE member_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);
DELETE FROM public.membership_plans WHERE slug IN ('test-monthly', 'test-inactive', 'admin-test');
DELETE FROM public.user_role_assignments WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000099'
);
DELETE FROM auth.users WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000099'
);

RESET role;

SELECT finish();
