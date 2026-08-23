-- ============================================================
-- FIGHT ZONE — Authenticated Coach Directory View
-- ============================================================
-- Members legitimately need coach display names (their bookings,
-- schedule, messaging recipients). The private `profiles` RLS
-- (own-or-staff) blocks cross-user reads, so embedded names silently
-- resolved to NULL. This definer-semantics view exposes ONLY safe
-- identity columns for ACTIVE coaches, to AUTHENTICATED users.
--
-- Distinct from available_coaches_public (marketing): no availability
-- filter here — members should still see names of coaches they booked
-- even if that coach later becomes unavailable.
-- ============================================================

CREATE OR REPLACE VIEW public.coaches_directory_authenticated AS
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
WHERE p.is_active = true;

GRANT SELECT ON public.coaches_directory_authenticated TO authenticated;

NOTIFY pgrst, 'reload schema';
