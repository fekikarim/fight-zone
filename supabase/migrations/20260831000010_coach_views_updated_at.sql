-- ============================================================
-- FIGHT ZONE — Coach Directory Views: add updated_at
-- ============================================================
-- Aligns view output with CoachProfileRow so consumers receive the
-- full audit timestamp set. Appending columns via CREATE OR REPLACE.
-- ============================================================

CREATE OR REPLACE VIEW public.available_coaches_public AS
SELECT
    cp.id,
    cp.experience_years,
    cp.specialization,
    cp.biography,
    cp.is_available,
    cp.created_at,
    p.full_name,
    p.avatar_url,
    cp.updated_at
FROM public.coach_profiles cp
JOIN public.profiles p ON p.id = cp.id
WHERE cp.is_available = true AND p.is_active = true;

GRANT SELECT ON public.available_coaches_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.coaches_directory_authenticated AS
SELECT
    cp.id,
    cp.experience_years,
    cp.specialization,
    cp.biography,
    cp.is_available,
    cp.created_at,
    p.full_name,
    p.avatar_url,
    cp.updated_at
FROM public.coach_profiles cp
JOIN public.profiles p ON p.id = cp.id
WHERE p.is_active = true;

GRANT SELECT ON public.coaches_directory_authenticated TO authenticated;

NOTIFY pgrst, 'reload schema';
