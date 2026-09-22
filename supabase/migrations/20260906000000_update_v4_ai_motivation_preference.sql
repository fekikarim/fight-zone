-- ============================================================
-- FIGHT ZONE — Migration: AI Motivation Preference
-- ============================================================

ALTER TABLE public.member_profiles
ADD COLUMN ai_motivation_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.member_profiles.ai_motivation_enabled IS 'User preference to enable or disable daily AI-generated motivation quotes. Defaults to true.';
