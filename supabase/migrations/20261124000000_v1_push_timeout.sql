-- Give the push webhook more time (cold start + several devices) before pg_net gives up.
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
        timeout_milliseconds := 9000
    );
    return new;
exception when others then
    return new;
end;
$$;
revoke all on function public.notify_push() from public, anon, authenticated;
