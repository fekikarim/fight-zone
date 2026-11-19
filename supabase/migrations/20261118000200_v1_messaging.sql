-- ============================================================
-- Fight Zone V1 — messaging (single-coach model)
--   * One private conversation per member with Seif (platform owner).
--     Fixes V0 defect: conversation creation required a (retired) booking.
--   * messages.kind USER|SYSTEM — automated messages are labelled
--     "Fight Zone", never impersonating Seif typing.
--   * Private attachments (fightzone-private/<member_id>/messages/...).
--   * Idempotent system messages (unique idempotency_key).
-- ============================================================

alter table public.messages add column if not exists kind text not null default 'USER';
alter table public.messages drop constraint if exists messages_kind_valid;
alter table public.messages add constraint messages_kind_valid check (kind in ('USER', 'SYSTEM'));
alter table public.messages add column if not exists idempotency_key text;
create unique index if not exists messages_idempotency_uidx on public.messages (idempotency_key) where idempotency_key is not null;
alter table public.messages add column if not exists read_at timestamptz;
alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_name text check (attachment_name is null or char_length(attachment_name) <= 200);
alter table public.messages add column if not exists attachment_mime text check (attachment_mime is null or attachment_mime in ('image/png','image/jpeg','image/webp','application/pdf'));
alter table public.messages add column if not exists attachment_size integer check (attachment_size is null or attachment_size between 1 and 5242880);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at desc, id desc);

-- A message with an attachment may carry an empty-ish caption; keep the
-- existing body rule (1..4000 trimmed) — the client sends a default caption.

alter table public.conversations add column if not exists last_message_at timestamptz;
alter table public.conversations add column if not exists admin_unread boolean not null default false;

-- ------------------------------------------------------------
-- Ensure helper rows for FK targets
-- ------------------------------------------------------------
create or replace function public.ensure_member_profile(p_user_id uuid)
returns void language sql security definer set search_path = public as $$
    insert into public.member_profiles (id) values (p_user_id) on conflict (id) do nothing;
$$;
revoke all on function public.ensure_member_profile(uuid) from public, anon, authenticated;

create or replace function public.ensure_coach_profile(p_user_id uuid)
returns void language sql security definer set search_path = public as $$
    insert into public.coach_profiles (id) values (p_user_id) on conflict (id) do nothing;
$$;
revoke all on function public.ensure_coach_profile(uuid) from public, anon, authenticated;

-- Internal: the (member, owner) conversation, created on demand.
create or replace function public.conversation_for_member(p_member_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
    v_owner uuid := public.platform_owner_id();
    v_id    uuid;
begin
    if v_owner is null or p_member_id is null or p_member_id = v_owner then
        return null;
    end if;
    perform public.ensure_member_profile(p_member_id);
    perform public.ensure_coach_profile(v_owner);
    insert into public.conversations (member_id, coach_id)
    values (p_member_id, v_owner)
    on conflict (member_id, coach_id) do nothing;
    select id into v_id from public.conversations where member_id = p_member_id and coach_id = v_owner;
    return v_id;
end;
$$;
revoke all on function public.conversation_for_member(uuid) from public, anon, authenticated;

-- Member: my conversation with Seif. Staff: conversation with a given member.
create or replace function public.get_or_create_conversation(p_member_id uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception 'Authentication required.' using errcode = '42501';
    end if;
    if public.is_admin_or_coach() then
        if p_member_id is null or not exists (select 1 from public.profiles where id = p_member_id) then
            raise exception 'Member not found.' using errcode = 'P0002';
        end if;
        return public.conversation_for_member(p_member_id);
    end if;
    -- Members may only open their own conversation (client id ignored).
    return public.conversation_for_member(v_uid);
end;
$$;
revoke all on function public.get_or_create_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- Conversations are created only through the RPC above.
drop policy if exists conversations_insert_with_relationship on public.conversations;
revoke insert, update, delete on public.conversations from anon, authenticated;

-- Members/Seif insert only their own USER messages in their conversation;
-- attachments must live under the conversation member's private folder.
drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages
    for insert to authenticated
    with check (
        sender_id = auth.uid()
        and kind = 'USER'
        and idempotency_key is null
        and status = 'UNREAD'
        and read_at is null
        and exists (
            select 1 from public.conversations c
             where c.id = messages.conversation_id
               and (c.member_id = auth.uid() or c.coach_id = auth.uid())
               and (messages.attachment_path is null
                    or messages.attachment_path like c.member_id::text || '/messages/%')
        )
    );
revoke update, delete on public.messages from anon, authenticated;

-- ------------------------------------------------------------
-- System messages (idempotent, template-driven)
-- ------------------------------------------------------------
-- Inserts a SYSTEM message from Fight Zone into the member's conversation.
-- Returns silently when the template is disabled, no owner exists, or the
-- idempotency key was already used (retries never duplicate).
create or replace function public.send_system_message(
    p_member_id uuid, p_template text, p_vars jsonb, p_idempotency_key text
) returns void
language plpgsql security definer set search_path = public as $$
declare
    v_tpl   record;
    v_conv  uuid;
    v_owner uuid := public.platform_owner_id();
    v_name  text;
    v_vars  jsonb;
begin
    select body, is_enabled into v_tpl from public.message_templates where key = p_template;
    if v_tpl is null or not v_tpl.is_enabled or v_owner is null then
        return;
    end if;
    if exists (select 1 from public.messages where idempotency_key = p_idempotency_key) then
        return;
    end if;
    v_conv := public.conversation_for_member(p_member_id);
    if v_conv is null then return; end if;

    select split_part(coalesce(nullif(trim(full_name), ''), 'there'), ' ', 1) into v_name
      from public.profiles where id = p_member_id;
    v_vars := jsonb_build_object('first_name', coalesce(v_name, 'there')) || coalesce(p_vars, '{}'::jsonb);

    insert into public.messages (conversation_id, sender_id, body, kind, idempotency_key, status)
    values (v_conv, v_owner, left(trim(public.render_template(v_tpl.body, v_vars)), 4000), 'SYSTEM', p_idempotency_key, 'UNREAD')
    on conflict (idempotency_key) where idempotency_key is not null do nothing;
end;
$$;
revoke all on function public.send_system_message(uuid, text, jsonb, text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Message notifications: skip SYSTEM (they notify via their own trigger
-- caller), dedupe per message, keep conversation activity fields fresh.
-- ------------------------------------------------------------
create or replace function public.notify_on_message_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
    v_conv      record;
    v_recipient uuid;
    v_title     text;
begin
    select member_id, coach_id into v_conv from public.conversations where id = new.conversation_id;
    if v_conv is null then return new; end if;

    update public.conversations
       set last_message_at = new.created_at,
           admin_unread = case when new.sender_id = v_conv.member_id then true else admin_unread end
     where id = new.conversation_id;

    v_recipient := case when new.sender_id = v_conv.member_id then v_conv.coach_id else v_conv.member_id end;

    if new.kind = 'SYSTEM' then
        v_title := 'New message from Fight Zone';
    elsif new.sender_id = v_conv.coach_id then
        v_title := 'New message from Coach Seif';
    else
        select 'New message from ' || coalesce(nullif(trim(full_name), ''), 'a member') into v_title
          from public.profiles where id = new.sender_id;
    end if;

    perform public.notify_user(
        v_recipient, 'MESSAGE', coalesce(v_title, 'New message'),
        case when new.attachment_path is not null then '📎 ' else '' end || left(new.body, 120),
        'conversation', new.conversation_id, 'message:' || new.id::text
    );
    return new;
end;
$$;

-- Reading: also stamp read_at and clear the admin flag.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
    v_uid     uuid := auth.uid();
    v_conv    record;
    v_updated integer := 0;
begin
    if v_uid is null then
        raise exception 'Authentication required.' using errcode = '42501';
    end if;
    select member_id, coach_id into v_conv from public.conversations where id = p_conversation_id;
    if v_conv is null or (v_conv.member_id <> v_uid and v_conv.coach_id <> v_uid) then
        raise exception 'Conversation not accessible.' using errcode = '42501';
    end if;

    update public.messages
       set status = 'READ', read_at = now()
     where conversation_id = p_conversation_id
       and sender_id <> v_uid
       and status = 'UNREAD';
    get diagnostics v_updated = row_count;

    -- The member's own SYSTEM messages are "sent" by the owner id; reading
    -- as the member marks them read above (sender <> member).
    if v_uid = v_conv.coach_id then
        update public.conversations set admin_unread = false where id = p_conversation_id;
    end if;

    -- Clear matching message notifications for the reader.
    update public.notifications
       set is_read = true
     where user_id = v_uid and resource_type = 'conversation'
       and resource_id = p_conversation_id and not is_read;
    return v_updated;
end;
$$;

-- Messages with V1 fields (paginated, newest first).
drop function if exists public.get_conversation_messages_v1(uuid, uuid, integer);
create or replace function public.get_conversation_messages_v1(
    p_conversation_id uuid, p_before_id uuid default null, p_limit integer default 30
) returns table (
    id uuid, sender_id uuid, body text, status public.message_status, created_at timestamptz,
    kind text, read_at timestamptz, attachment_path text, attachment_name text,
    attachment_mime text, attachment_size integer
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception 'Authentication required.' using errcode = '42501';
    end if;
    if not exists (
        select 1 from public.conversations c
         where c.id = p_conversation_id and (c.member_id = v_uid or c.coach_id = v_uid)
    ) then
        raise exception 'Conversation not accessible.' using errcode = '42501';
    end if;
    if p_limit is null or p_limit < 1 or p_limit > 100 then p_limit := 30; end if;

    return query
    with cur as (
        select m.created_at, m.id from public.messages m
         where m.id = p_before_id and m.conversation_id = p_conversation_id
    )
    select m.id, m.sender_id, m.body, m.status, m.created_at, m.kind, m.read_at,
           m.attachment_path, m.attachment_name, m.attachment_mime, m.attachment_size
      from public.messages m
      left join cur on true
     where m.conversation_id = p_conversation_id
       and (p_before_id is null or m.created_at < cur.created_at
            or (m.created_at = cur.created_at and m.id < cur.id))
     order by m.created_at desc, m.id desc
     limit p_limit;
end;
$$;
revoke all on function public.get_conversation_messages_v1(uuid, uuid, integer) from public, anon;
grant execute on function public.get_conversation_messages_v1(uuid, uuid, integer) to authenticated;

-- Inbox (staff) / single thread (member), with last message + unread count.
drop function if exists public.get_inbox(text, integer);
create or replace function public.get_inbox(p_search text default null, p_limit integer default 50)
returns table (
    conversation_id uuid, member_id uuid, member_name text, member_email text, member_avatar text,
    last_message_body text, last_message_at timestamptz, last_sender_id uuid, last_kind text,
    unread_count bigint
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
    v_uid uuid := auth.uid();
    v_staff boolean := public.is_admin_or_coach();
begin
    if v_uid is null then
        raise exception 'Authentication required.' using errcode = '42501';
    end if;
    if p_limit is null or p_limit < 1 or p_limit > 200 then p_limit := 50; end if;
    return query
    select c.id, c.member_id, p.full_name, case when v_staff then p.email else null end, p.avatar_url,
           lm.body, lm.created_at, lm.sender_id, lm.kind,
           (select count(*) from public.messages um
             where um.conversation_id = c.id and um.sender_id <> v_uid and um.status = 'UNREAD')
      from public.conversations c
      join public.profiles p on p.id = c.member_id
      left join lateral (
          select m.body, m.created_at, m.sender_id, m.kind from public.messages m
           where m.conversation_id = c.id order by m.created_at desc, m.id desc limit 1
      ) lm on true
     where (c.member_id = v_uid or c.coach_id = v_uid)
       and (p_search is null or p_search = ''
            or p.full_name ilike '%' || p_search || '%'
            or (v_staff and p.email ilike '%' || p_search || '%'))
     order by (select count(*) > 0 from public.messages um
                where um.conversation_id = c.id and um.sender_id <> v_uid and um.status = 'UNREAD') desc,
              lm.created_at desc nulls last, c.created_at desc
     limit p_limit;
end;
$$;
revoke all on function public.get_inbox(text, integer) from public, anon;
grant execute on function public.get_inbox(text, integer) to authenticated;

-- ------------------------------------------------------------
-- Welcome message for new members (once per member, best-effort)
-- ------------------------------------------------------------
create or replace function public.welcome_new_member()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
    if exists (select 1 from public.roles r where r.id = new.role_id and r.name = 'MEMBER')
       and not exists (
           select 1 from public.user_role_assignments ura join public.roles r on r.id = ura.role_id
            where ura.user_id = new.user_id and r.name in ('ADMIN', 'COACH'))
    then
        begin
            perform public.send_system_message(new.user_id, 'welcome', '{}'::jsonb, 'welcome:' || new.user_id::text);
        exception when others then
            -- Never block sign-up on an optional message.
            null;
        end;
    end if;
    return new;
end;
$$;
drop trigger if exists user_role_assignments_welcome on public.user_role_assignments;
create trigger user_role_assignments_welcome
    after insert on public.user_role_assignments
    for each row execute function public.welcome_new_member();

-- Realtime: member/admin clients subscribe to postgres_changes on messages
-- and notifications; RLS (participant-only / recipient-only) filters delivery.
do $$ begin
    alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
    alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;
