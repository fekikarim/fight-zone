-- ============================================================
-- FIGHT ZONE — Migration 0008: Public coach helper
-- ============================================================
-- `profiles` is private (emails, phones, etc.). The marketing site still
-- needs the coach's public presentation. This SECURITY DEFINER function
-- exposes ONLY intentional public fields and ignores RLS.

create or replace function public.get_public_coach()
returns table (
    id              uuid,
    full_name       text,
    avatar_url      text,
    specialization  text,
    biography       text,
    experience_years integer,
    is_available    boolean
)
language sql
security definer
set search_path = public
stable
as $$
    select
        p.id,
        p.full_name,
        p.avatar_url,
        c.specialization,
        c.biography,
        c.experience_years,
        c.is_available
    from public.coach_profiles c
    join public.profiles p on p.id = c.id
    where p.is_active = true
    order by c.created_at asc
    limit 1;
$$;

grant execute on function public.get_public_coach() to anon, authenticated;
