-- ============================================================
-- FIGHT ZONE — Migration 0009: Authentication & authorization hardening
-- ============================================================
-- Prompt #2 security audit findings:
--
-- 1. `coach_profiles_insert_own` allowed ANY authenticated user to insert
--    a `coach_profiles` row for themselves (`id = auth.uid()`). A MEMBER could
--    self-promote to a "coach" persona: appear in public coach listings /
--    `get_public_coach()`, pollute coach data, and receive bookings as a coach.
--    Coach/Admin roles must only be established through a trusted administrative
--    mechanism — never via the public API. Coach profiles are now staff-only
--    (ADMIN/COACH) for INSERT and UPDATE.

drop policy if exists coach_profiles_insert_own on public.coach_profiles;
drop policy if exists coach_profiles_update_own_or_staff on public.coach_profiles;

create policy coach_profiles_insert_staff
    on public.coach_profiles for insert
    with check (public.is_admin_or_coach());

create policy coach_profiles_update_staff
    on public.coach_profiles for update
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());
