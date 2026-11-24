-- Hosted Supabase doesn't auto-grant new tables to API roles in every project:
-- without these grants every "save this device" call failed (RLS never even ran).
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
grant all on public.push_config to service_role;
