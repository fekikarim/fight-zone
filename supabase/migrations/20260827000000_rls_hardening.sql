-- ============================================================
-- FIGHT ZONE — RLS Hardening (Prompt #12)
-- Corrective migration for confirmed RLS defects
-- ============================================================
-- Date: 2026-08-21
-- Purpose:
--   1. Remove self-subscribe/fabricate-payment INSERT policies
--      (memberships are presentation-only; no self-service flow)
--   2. Remove self-update on member_subscriptions (status, credits, etc.)
--   3. Add member INSERT policy for transformation_stories
--      (submitTransformation was always failing for members)
--   4. Drop legacy payments_manage_staff FOR ALL policy that
--      inadvertently gave COACH full payments access
-- ============================================================

-- 1. Drop self-subscribe policy (billing_hardening added this)
DROP POLICY IF EXISTS "member_subscriptions_owner_insert"
  ON public.member_subscriptions;

-- 2. Drop self-fabricate-payment policy (billing_hardening added this)
DROP POLICY IF EXISTS "payments_owner_insert"
  ON public.payments;

-- 3. Drop self-update on member_subscriptions
--    Members should not be able to modify status, credits, dates, etc.
--    Replace with admin-only UPDATE + member cancel-only UPDATE
DROP POLICY IF EXISTS "member_subscriptions_owner_update"
  ON public.member_subscriptions;

-- Admin can update any field on any subscription
CREATE POLICY "member_subscriptions_staff_update"
  ON public.member_subscriptions
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Members can only cancel their own active subscription (status → CANCELLED, auto_renew → false)
-- The WITH CHECK ensures the resulting row matches the cancel pattern
CREATE POLICY "member_subscriptions_member_cancel"
  ON public.member_subscriptions
  FOR UPDATE
  USING (member_id = auth.uid() AND status = 'ACTIVE')
  WITH CHECK (
    member_id = auth.uid()
    AND status = 'CANCELLED'
    AND auto_renew = false
  );

-- 4. Add member INSERT for transformation_stories
--    Without this, submitTransformation() always fails for regular members
CREATE POLICY "transformations_member_insert"
  ON public.transformation_stories
  FOR INSERT
  WITH CHECK (member_id = auth.uid() OR public.is_admin_or_coach());

-- 5. Drop legacy permissive FOR ALL policy on payments
--    The 20260824 migration added specific staff-only INSERT/UPDATE/DELETE
--    policies. The original FOR ALL policy inadvertently grants COACH
--    full write access beyond what the business model requires.
--    COACH access to payments is not part of the current single-coach model.
DROP POLICY IF EXISTS "payments_manage_staff"
  ON public.payments;
