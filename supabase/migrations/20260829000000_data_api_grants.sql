-- ============================================================
-- FIGHT ZONE — Corrective Migration: Data API Grants
-- ============================================================
-- Root cause of production query failures: tables introduced by
-- migrations 20260824000000+ were created without Data API grants.
-- Supabase does NOT auto-grant table privileges to anon/authenticated;
-- every table must be granted explicitly (pattern established in
-- 20260815000500_rls.sql).
--
-- Affected tables returned PostgREST error 42501 "permission denied":
--   membership_plans, member_subscriptions, reviews, transformation_stories
--
-- Privileges follow least-privilege + RLS-as-boundary policy:
--   - Public read surfaces get anon SELECT (RLS filters rows).
--   - Member-owned workflows get authenticated DML (RLS restricts).
--   - service_role bypasses RLS and needs full access for admin jobs.

-- ---------------------------------------------------------------------------
-- membership_plans — public pricing catalog
-- Readable by everyone; writes restricted to ADMIN/COACH via RLS.
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.membership_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.membership_plans TO authenticated;

-- ---------------------------------------------------------------------------
-- member_subscriptions — billing lifecycle records
-- Members read/cancel their own; staff manage all (both via RLS).
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_subscriptions TO authenticated;

-- ---------------------------------------------------------------------------
-- payments — transaction history
-- Base migration granted these in 20260815000500 but re-assert here for idempotency.
-- Members read their own; staff record/reconcile (via RLS).
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

-- ---------------------------------------------------------------------------
-- reviews — social proof
-- Anon reads APPROVED reviews only (RLS); members author own; staff moderate.
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

-- ---------------------------------------------------------------------------
-- transformation_stories — before/after showcase
-- Anon reads PUBLISHED stories only (RLS); members submit own; staff publish.
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.transformation_stories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.transformation_stories TO authenticated;

-- ---------------------------------------------------------------------------
-- service_role — full data-plane access for background/admin jobs
-- (bypasses RLS; kept explicit so new tables never break server tooling)
-- ---------------------------------------------------------------------------
GRANT ALL ON public.membership_plans TO service_role;
GRANT ALL ON public.member_subscriptions TO service_role;
GRANT ALL ON public.payments TO service_role;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.transformation_stories TO service_role;

-- Reload PostgREST schema cache so the API layer sees updated privileges.
NOTIFY pgrst, 'reload schema';
