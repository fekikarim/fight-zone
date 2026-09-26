-- ============================================================
-- REALTIME: publish `news` for "new article" nav indicators
--
-- Additive-only migration. Adds public.news to the supabase_realtime
-- publication so INSERTs broadcast to subscribers. Delivery is
-- RLS-filtered: anon/authenticated clients only receive rows visible
-- to them (is_published = true), so drafts never leak.
-- REPLICA IDENTITY FULL matches the events tables' setup.
-- ============================================================

do $$
begin
    if not exists (
        select 1 from pg_publication where pubname = 'supabase_realtime'
    ) then
        return;
    end if;

    if not exists (
        select 1 from pg_publication_rel pr
        join pg_publication p on p.oid = pr.prpubid
        where p.pubname = 'supabase_realtime'
          and pr.prrelid = 'public.news'::regclass
    ) then
        execute 'alter publication supabase_realtime add table public.news';
    end if;
end
$$;

alter table public.news replica identity full;

notify pgrst, 'reload schema';
