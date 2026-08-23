-- ============================================================
-- FIGHT ZONE — Public Showcase Views
-- ============================================================
-- Marketing pages must render approved reviews, published
-- transformations, and the coach directory to ANONYMOUS visitors.
--
-- Problem: author names/avatars live in `profiles` / `member_profiles`,
-- which are private (emails, phones). Their RLS is own-or-staff, so
-- PostgREST embeds from public queries fail for anon in two ways:
--   1. Without SELECT privilege → hard 42501 error.
--   2. With privilege but strict RLS → every embedded author is NULL.
--
-- Solution (same pattern as get_public_coach SECURITY DEFINER):
-- definer-semantics views over ONLY safe columns. The view owner
-- (postgres) bypasses base-table RLS; exposure is bounded by each
-- view's WHERE clause + explicit column list. No PII columns exist
-- in any view below.
-- ============================================================

-- ---------------------------------------------------------------------------
-- Approved reviews + safe author display fields (testimonials)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.approved_reviews_public AS
SELECT
    r.id,
    r.member_id,
    r.coach_id,
    r.session_id,
    r.target_type,
    r.rating,
    r.title,
    r.content,
    r.status,
    r.is_featured,
    r.created_at,
    r.updated_at,
    prof.full_name  AS author_name,
    prof.avatar_url AS author_avatar
FROM public.reviews r
LEFT JOIN public.member_profiles mp ON mp.id = r.member_id
LEFT JOIN public.profiles prof ON prof.id = mp.id
WHERE r.status = 'APPROVED';

GRANT SELECT ON public.approved_reviews_public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Published transformation stories + safe author display fields
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.published_transformations_public AS
SELECT
    t.id,
    t.member_id,
    t.title,
    t.story,
    t.before_image_url,
    t.after_image_url,
    t.starting_weight,
    t.current_weight,
    t.timeframe_months,
    t.discipline,
    t.is_featured,
    t.is_published,
    t.created_at,
    t.updated_at,
    prof.full_name  AS author_name,
    prof.avatar_url AS author_avatar
FROM public.transformation_stories t
LEFT JOIN public.profiles prof ON prof.id = t.member_id
WHERE t.is_published = true;

GRANT SELECT ON public.published_transformations_public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Available coach directory + safe identity fields
-- (replaces direct coach_profiles ⨝ profiles embeds on marketing routes)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.available_coaches_public AS
SELECT
    cp.id,
    cp.experience_years,
    cp.specialization,
    cp.biography,
    cp.is_available,
    cp.created_at,
    p.full_name,
    p.avatar_url
FROM public.coach_profiles cp
JOIN public.profiles p ON p.id = cp.id
WHERE cp.is_available = true
  AND p.is_active = true;

GRANT SELECT ON public.available_coaches_public TO anon, authenticated;

-- Expose the new views through the Data API schema cache.
NOTIFY pgrst, 'reload schema';
