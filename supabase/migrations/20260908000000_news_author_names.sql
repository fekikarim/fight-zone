-- ============================================================
-- NEWS AUTHOR BYLINES (public-safe identity)
--
-- Additive-only migration. The `profiles` table is intentionally
-- private (no anon/authenticated SELECT grant), so news article
-- bylines cannot join it directly — the embed fails with 42501 for
-- public readers. This RPC exposes ONLY id + full_name and ONLY for
-- ADMIN/COACH authors, so member names can never leak through it.
-- ============================================================

create or replace function public.get_public_author_names(p_author_ids uuid[])
returns table (id uuid, full_name text)
language sql
security definer
set search_path = ''
stable
as $function$
    select p.id, p.full_name
    from public.profiles p
    where p.id = any (p_author_ids)
      and exists (
        select 1
        from public.user_role_assignments ura
        join public.roles r on r.id = ura.role_id
        where ura.user_id = p.id
          and r.name in ('ADMIN', 'COACH')
      );
$function$;

revoke all on function public.get_public_author_names(uuid[]) from public, anon, authenticated;
grant execute on function public.get_public_author_names(uuid[]) to anon, authenticated;

-- Reload the PostgREST schema cache so the function is callable.
notify pgrst, 'reload schema';
