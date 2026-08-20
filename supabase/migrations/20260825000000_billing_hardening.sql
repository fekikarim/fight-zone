-- ============================================================
-- FIGHT ZONE — Billing Hardening (Prompt #11 Phase 1)
-- Corrective migration for RLS insert policies
-- ============================================================

-- Allow authenticated members to self-subscribe
-- Previously only admin could insert (member_subscriptions_staff_insert)
CREATE POLICY "member_subscriptions_owner_insert"
  ON public.member_subscriptions
  FOR INSERT
  WITH CHECK (member_id = auth.uid() OR public.is_admin());

-- Allow authenticated members to create their own payment records
-- Previously only admin could insert (payments_staff_insert)
CREATE POLICY "payments_owner_insert"
  ON public.payments
  FOR INSERT
  WITH CHECK (member_id = auth.uid() OR public.is_admin());
