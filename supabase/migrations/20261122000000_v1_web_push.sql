-- Web Push: device subscriptions + a trigger that hands every new in-app
-- notification to the app's /api/push/notify endpoint (via pg_net), which
-- delivers it to the user's subscribed phones and computers.
--
-- The trigger is inert until BOTH rows exist in public.push_config
-- (push_webhook_url, push_webhook_secret) — see docs/push-notifications.md.
-- It can never block or fail a notification insert.

create extension if not exists pg_net with schema extensions;

create table if not exists public.push_subscriptions (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.profiles (id) on delete cascade,
    endpoint    text not null unique,
    p256dh      text not null,
    auth        text not null,
    user_agent  text,
    created_at  timestamptz not null default now(),
    last_used_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
    for select to authenticated using (user_id = auth.uid());
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
    for insert to authenticated with check (user_id = auth.uid());
drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
    for delete to authenticated using (user_id = auth.uid());

-- Server-side settings (no policies = invisible to API roles).
create table if not exists public.push_config (
    key   text primary key,
    value text not null
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

create or replace function public.notify_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_url text;
    v_secret text;
begin
    select value into v_url from public.push_config where key = 'push_webhook_url';
    select value into v_secret from public.push_config where key = 'push_webhook_secret';
    if v_url is null or v_secret is null then
        return new;
    end if;
    -- Only users with at least one device are worth a request.
    if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
        return new;
    end if;
    perform net.http_post(
        url := v_url,
        body := jsonb_build_object(
            'id', new.id,
            'user_id', new.user_id,
            'type', new.type,
            'title', new.title,
            'content', new.content,
            'resource_type', new.resource_type,
            'resource_id', new.resource_id
        ),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
        timeout_milliseconds := 4000
    );
    return new;
exception when others then
    return new; -- push is best-effort; never break the notification itself
end;
$$;

revoke all on function public.notify_push() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
    after insert on public.notifications
    for each row execute function public.notify_push();
