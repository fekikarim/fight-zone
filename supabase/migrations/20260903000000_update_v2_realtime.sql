-- ============================================================
-- UPDATE V2 — Realtime collaboration (Phase 1)
--
-- Additive-only migration. Enables Supabase Realtime for the
-- admin calendar and real-time event availability without altering
-- any business logic or dropping data.
--
-- Changes:
--   1. Publish `events` to the `supabase_realtime` publication so
--      staff calendars stay in sync (create/update scheduling).
--   2. Publish `event_participants` to the `supabase_realtime`
--      publication so participant counts / availability update live.
--   3. Set REPLICA IDENTITY FULL on both tables so UPDATE/DELETE
--      broadcasts carry the OLD row. This is REQUIRED for correct
--      Row Level Security filtering of realtime events (PostgREST
--      must evaluate the policy against the pre-change row).
--
-- Security note: Realtime POSTGRES_CHANGES is filtered by RLS for
-- `anon`/`authenticated` clients. Staff (ADMIN/COACH) see all rows,
-- members see their own registrations — matching the existing RLS.
-- ============================================================

-- The supabase_realtime publication exists on Supabase projects
-- (created when `[realtime] enabled = true`). Guard for safety so
-- this migration is idempotent and validates cleanly in any replica.
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
          and pr.prrelid = 'public.events'::regclass
    ) then
        execute 'alter publication supabase_realtime add table public.events';
    end if;

    if not exists (
        select 1 from pg_publication_rel pr
        join pg_publication p on p.oid = pr.prpubid
        where p.pubname = 'supabase_realtime'
          and pr.prrelid = 'public.event_participants'::regclass
    ) then
        execute 'alter publication supabase_realtime add table public.event_participants';
    end if;
end
$$;

-- REPLICA IDENTITY FULL so old rows are broadcast on UPDATE/DELETE.
-- Required for RLS-aware realtime filtering of these rows.
alter table public.events replica identity full;
alter table public.event_participants replica identity full;

-- ============================================================
-- 4. Staff participant-count aggregate (admin calendar)
--
-- The public helper `get_public_event_participant_counts()` only counts
-- public events. The admin calendar shows ALL events (including private
-- coaching sessions), so it needs a staff-only aggregate covering every
-- event. It is SECURITY DEFINER but gated to ADMIN/COACH so non-staff
-- callers get nothing (avoids leaking private-event participation).
-- ============================================================
create or replace function public.get_staff_event_participant_counts()
returns table (event_id uuid, active_count bigint)
language plpgsql
security definer
set search_path = ''
stable
as $function$
begin
    if not public.is_admin_or_coach() then
        return;
    end if;

    return query
        select ep.event_id, count(*) as active_count
        from public.event_participants ep
        where ep.status != 'CANCELLED'
        group by ep.event_id;
end;
$function$;

revoke all on function public.get_staff_event_participant_counts() from public, anon, authenticated;
grant execute on function public.get_staff_event_participant_counts() to authenticated;
