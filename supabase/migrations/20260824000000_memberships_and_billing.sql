-- ============================================================
-- FIGHT ZONE — Migration 0011: Membership Plans, Subscriptions & Billing
-- ============================================================
-- Adds the core monetization layer: membership plans, subscriptions,
-- and billing payments. The existing `payments` table (from 0003)
-- is ALTERed to support membership payments alongside booking payments.

-- ------------------------------------------------------------
-- 1. New enums (additive only)
-- ------------------------------------------------------------
CREATE TYPE public.billing_interval AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM');
CREATE TYPE public.plan_tier AS ENUM ('STUDENT', 'ADULT', 'KIDS', 'FAMILY', 'PRO_FIGHTER', 'UNLIMITED');
CREATE TYPE public.subscription_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'TRIAL');

-- Extend existing enums with new values (PostgreSQL 10+ supports ADD VALUE)
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'CARD';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'COMPLETED';

-- ------------------------------------------------------------
-- 2. membership_plans
-- ------------------------------------------------------------
CREATE TABLE public.membership_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    tier            public.plan_tier NOT NULL DEFAULT 'ADULT',
    billing_interval public.billing_interval NOT NULL DEFAULT 'MONTHLY',
    price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    currency        TEXT NOT NULL DEFAULT 'TND',
    session_credits INTEGER CHECK (session_credits IS NULL OR session_credits >= 0),
    features        TEXT[] NOT NULL DEFAULT '{}',
    is_popular      BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX membership_plans_active_idx ON public.membership_plans (is_active, sort_order);

CREATE TRIGGER membership_plans_set_updated_at
    BEFORE UPDATE ON public.membership_plans
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ------------------------------------------------------------
-- 3. member_subscriptions
-- ------------------------------------------------------------
CREATE TABLE public.member_subscriptions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id        UUID NOT NULL REFERENCES public.member_profiles (id) ON DELETE CASCADE,
    plan_id          UUID NOT NULL REFERENCES public.membership_plans (id) ON DELETE RESTRICT,
    status           public.subscription_status NOT NULL DEFAULT 'ACTIVE',
    starts_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at          TIMESTAMPTZ NOT NULL,
    renews_at        TIMESTAMPTZ,
    auto_renew       BOOLEAN NOT NULL DEFAULT false,
    remaining_credits INTEGER NOT NULL DEFAULT 0 CHECK (remaining_credits >= 0),
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subscription_ends_after_starts CHECK (ends_at > starts_at)
);

CREATE INDEX member_subscriptions_member_idx ON public.member_subscriptions (member_id, status);
CREATE INDEX member_subscriptions_ends_at_idx ON public.member_subscriptions (ends_at) WHERE status = 'ACTIVE';

CREATE TRIGGER member_subscriptions_set_updated_at
    BEFORE UPDATE ON public.member_subscriptions
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ------------------------------------------------------------
-- 4. Alter existing `payments` table
--    (created in 0003_coaching.sql with booking_id NOT NULL)
-- ------------------------------------------------------------

-- Drop the unique constraint on booking_id (allows multiple payments per booking + membership payments)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_booking_unique;

-- Make booking_id nullable (membership payments won't have a booking_id)
ALTER TABLE public.payments ALTER COLUMN booking_id DROP NOT NULL;

-- Change currency from CHAR(3) to TEXT for flexibility
ALTER TABLE public.payments ALTER COLUMN currency TYPE text;

-- Add membership-related columns
ALTER TABLE public.payments ADD COLUMN member_id UUID REFERENCES public.member_profiles (id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN subscription_id UUID REFERENCES public.member_subscriptions (id) ON DELETE SET NULL;

-- Add the new payment_method column (copying from existing `method`)
ALTER TABLE public.payments ADD COLUMN payment_method public.payment_method;

-- Migrate data from `method` to `payment_method`
UPDATE public.payments SET payment_method = method WHERE payment_method IS NULL;

-- Drop the old `method` column
ALTER TABLE public.payments DROP COLUMN method;

-- Add constraint: every payment must reference either a booking or a member
ALTER TABLE public.payments
    ADD CONSTRAINT payments_must_have_reference
    CHECK (member_id IS NOT NULL OR booking_id IS NOT NULL);

-- ------------------------------------------------------------
-- 5. Updated indexes for payments
-- ------------------------------------------------------------
DROP INDEX IF EXISTS public.payments_status_idx;
CREATE INDEX payments_member_idx ON public.payments (member_id, paid_at DESC);
CREATE INDEX payments_subscription_idx ON public.payments (subscription_id);
CREATE INDEX payments_booking_new_idx ON public.payments (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX payments_status_new_idx ON public.payments (status);

-- ------------------------------------------------------------
-- 6. RLS policies
-- ------------------------------------------------------------
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_subscriptions ENABLE ROW LEVEL SECURITY;
-- payments RLS already enabled from 0003

-- membership_plans: public read active plans, admin full manage
CREATE POLICY "membership_plans_public_read"
    ON public.membership_plans FOR SELECT
    USING (is_active = true OR public.is_admin_or_coach());

CREATE POLICY "membership_plans_staff_manage"
    ON public.membership_plans FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- member_subscriptions: owner sees own, staff sees all
CREATE POLICY "member_subscriptions_owner_select"
    ON public.member_subscriptions FOR SELECT
    USING (member_id = auth.uid() OR public.is_admin_or_coach());

CREATE POLICY "member_subscriptions_staff_insert"
    ON public.member_subscriptions FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "member_subscriptions_owner_update"
    ON public.member_subscriptions FOR UPDATE
    USING (member_id = auth.uid() OR public.is_admin())
    WITH CHECK (member_id = auth.uid() OR public.is_admin());

CREATE POLICY "member_subscriptions_staff_delete"
    ON public.member_subscriptions FOR DELETE
    USING (public.is_admin());

-- payments: owner sees own, staff sees all, admin inserts
CREATE POLICY "payments_owner_select"
    ON public.payments FOR SELECT
    USING (member_id = auth.uid() OR public.is_admin_or_coach());

CREATE POLICY "payments_staff_insert"
    ON public.payments FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "payments_staff_update"
    ON public.payments FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "payments_staff_delete"
    ON public.payments FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------
-- 7. Notification trigger for new subscriptions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_subscription_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, content, type, resource_type, resource_id)
    VALUES (
        NEW.member_id,
        'Membership Activated',
        'Your Fight Zone membership has been successfully registered.',
        'SYSTEM',
        'subscription',
        NEW.id
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_created
    AFTER INSERT ON public.member_subscriptions
    FOR EACH ROW EXECUTE PROCEDURE public.handle_subscription_notification();

-- ------------------------------------------------------------
-- 8. Seed default membership plans
-- ------------------------------------------------------------
INSERT INTO public.membership_plans (name, slug, description, tier, billing_interval, price, currency, session_credits, features, is_popular, sort_order) VALUES
(
    'Monthly All-Access',
    'monthly-all-access',
    'Full access to all group sessions and open gym hours.',
    'ADULT',
    'MONTHLY',
    120.00,
    'TND',
    NULL,
    ARRAY['Unlimited group sessions', 'Open gym access', 'Locker room access', 'Basic fitness assessment'],
    false,
    1
),
(
    'Student Monthly',
    'student-monthly',
    'Discounted monthly plan for students with valid student ID.',
    'STUDENT',
    'MONTHLY',
    80.00,
    'TND',
    NULL,
    ARRAY['Unlimited group sessions', 'Open gym access', 'Student discount applied'],
    false,
    2
),
(
    'Kids Boxing Monthly',
    'kids-boxing-monthly',
    'Weekly boxing classes designed for children ages 8-15.',
    'KIDS',
    'MONTHLY',
    70.00,
    'TND',
    12,
    ARRAY['12 sessions per month', 'Age-appropriate training', 'Progress tracking', 'Certificate of achievement'],
    false,
    3
),
(
    'Quarterly Fighter',
    'quarterly-fighter',
    '3-month commitment with 10% savings. Ideal for serious trainees.',
    'ADULT',
    'QUARTERLY',
    324.00,
    'TND',
    NULL,
    ARRAY['Unlimited group sessions', 'Open gym access', '10% savings vs monthly', 'Priority booking', 'Quarterly progress review'],
    true,
    4
),
(
    'Annual VIP',
    'annual-vip',
    '12-month membership with 20% savings and exclusive perks.',
    'UNLIMITED',
    'ANNUAL',
    1152.00,
    'TND',
    NULL,
    ARRAY['Unlimited all sessions', '24/7 gym access', '20% savings vs monthly', 'Priority booking', 'Monthly 1-on-1 with coach', 'Guest passes (2/month)', 'Exclusive merchandise'],
    false,
    5
),
(
    'Pro Fighter Annual',
    'pro-fighter-annual',
    'Elite membership for competitive fighters. Includes sparring, strategy sessions, and competition prep.',
    'PRO_FIGHTER',
    'ANNUAL',
    1800.00,
    'TND',
    NULL,
    ARRAY['All VIP benefits', 'Unlimited private sessions', 'Competition preparation', 'Nutrition planning', 'Video analysis', 'Sparring sessions', 'Competition entry support'],
    false,
    6
);
