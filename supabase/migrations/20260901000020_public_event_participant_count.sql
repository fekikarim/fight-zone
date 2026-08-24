-- Prompt 15 fix: public event pages need the participant count, but
-- event_participants SELECT is revoked from anon/authenticated by the
-- Prompt-13 privilege hardening (participation is private data).
-- This security-definer RPC exposes ONLY an aggregate count and only for
-- events that are public — no participant rows or identities are readable.
create or replace function public.get_public_event_participant_count(
  p_event_id uuid
)
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select count(*)::int
  from public.event_participants ep
  join public.events e on e.id = ep.event_id
  where ep.event_id = p_event_id
    and e.is_public = true;
$$;

revoke all on function public.get_public_event_participant_count(uuid) from public, anon, authenticated;
grant execute on function public.get_public_event_participant_count(uuid) to anon, authenticated;
