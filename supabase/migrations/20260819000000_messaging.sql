-- ============================================================
-- FIGHT ZONE — Migration 0011: Member ↔ Coach messaging
-- ============================================================
-- Prompt #5 makes private messaging a first-class, RLS-authoritative feature:
--
--   1. `conversations` links one MEMBER to one COACH. UNIQUE(member_id,
--      coach_id) makes duplicate/race-condition conversations impossible, and
--      a conversation can only be created when a real booking relationship
--      exists between the two parties (authorization lives in the DB, not the
--      app). Conversations are immutable (no UPDATE/DELETE policies).
--   2. `messages` are append-only. No UPDATE/DELETE grants or policies exist,
--      so clients can never edit or delete history. Bodies are plain text,
--      trimmed, 1..4000 characters, enforced by a CHECK constraint.
--   3. Read state reuses the existing `message_status` enum: a message is
--      UNREAD until the RECIPIENT marks it READ. `REPLIED` stays reserved for
--      contact_messages and is deliberately excluded from `messages`. The only
--      write path for read state is the SECURITY DEFINER RPC
--      `mark_conversation_read` (atomic, recipient-only, idempotent).
--   4. Access is strictly participant-based: a member or coach sees ONLY
--      conversations they belong to. There is NO admin-wide read — ADMIN does
--      not silently expose other members' private threads, and COACH access is
--      never widened through is_admin_or_coach() shortcuts.
--   5. A new message notifies the RECIPIENT through the existing notifications
--      table (SECURITY DEFINER trigger, notification_type.MESSAGE). Reads
--      never create notifications, so marking conversations read is quiet.
--   6. History is paginated with cursor-based pagination
--      (`get_conversation_messages`), bounded to at most 100 rows per page.
--
-- Additive change: two new tables, four SECURITY DEFINER functions, one
-- trigger, indexes, RLS policies and grants. Existing columns/enums are
-- untouched, but the generated Database types MUST be regenerated (new tables
-- + functions).

-- ------------------------------------------------------------
-- conversations (one MEMBER <-> one COACH)
-- ------------------------------------------------------------
create table public.conversations (
    id         uuid primary key default gen_random_uuid(),
    member_id  uuid not null references public.member_profiles (id) on delete cascade,
    coach_id   uuid not null references public.coach_profiles (id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint conversations_member_coach_unique unique (member_id, coach_id),
    constraint conversations_member_coach_distinct check (member_id <> coach_id)
);

create index conversations_coach_id_idx on public.conversations (coach_id);

-- ------------------------------------------------------------
-- messages (append-only history)
-- ------------------------------------------------------------
create table public.messages (
    id              uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations (id) on delete cascade,
    sender_id       uuid not null references public.profiles (id) on delete cascade,
    body            text not null,
    status          public.message_status not null default 'UNREAD',
    created_at      timestamptz not null default now(),
    constraint messages_body_trimmed_length check (
        char_length(body) between 1 and 4000 and body = btrim(body)
    ),
    constraint messages_status_readable check (
        status in ('UNREAD', 'READ')
    )
);

create index messages_conversation_created_idx
    on public.messages (conversation_id, created_at desc, id desc);
create index messages_conversation_status_idx
    on public.messages (conversation_id, status);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy conversations_select_participant
    on public.conversations for select
    using (member_id = auth.uid() or coach_id = auth.uid());

create policy conversations_insert_with_relationship
    on public.conversations for insert
    with check (
        (member_id = auth.uid() or coach_id = auth.uid())
        and exists (
            select 1
            from public.bookings b
            where b.member_id = conversations.member_id
              and b.coach_id = conversations.coach_id
        )
    );

create policy messages_select_participant
    on public.messages for select
    using (
        exists (
            select 1
            from public.conversations c
            where c.id = messages.conversation_id
              and (c.member_id = auth.uid() or c.coach_id = auth.uid())
        )
    );

create policy messages_insert_sender
    on public.messages for insert
    with check (
        sender_id = auth.uid()
        and exists (
            select 1
            from public.conversations c
            where c.id = messages.conversation_id
              and (c.member_id = auth.uid() or c.coach_id = auth.uid())
        )
    );

-- No UPDATE / DELETE policies: messages and conversations are immutable, and
-- read state is only mutated through mark_conversation_read().

-- ------------------------------------------------------------
-- Recipient notification (fires once per new message, never on reads)
-- ------------------------------------------------------------
create or replace function public.notify_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_recipient   uuid;
    v_sender_name text;
begin
    select
        case when c.member_id = new.sender_id then c.coach_id else c.member_id end
    into v_recipient
    from public.conversations c
    where c.id = new.conversation_id;

    if v_recipient is null then
        return new;
    end if;

    select p.full_name
    into v_sender_name
    from public.profiles p
    where p.id = new.sender_id;

    insert into public.notifications (user_id, type, title, content)
    values (
        v_recipient,
        'MESSAGE',
        'New message from ' || coalesce(nullif(v_sender_name, ''), 'Fight Zone'),
        left(new.body, 120)
    );

    return new;
end;
$$;

drop trigger if exists messages_notify_on_insert on public.messages;
create trigger messages_notify_on_insert
    after insert on public.messages
    for each row execute procedure public.notify_on_message_insert();

-- ------------------------------------------------------------
-- get_my_conversations(): bounded conversation list for the current user
-- (participant-only, with the other participant and per-conversation unread).
-- ------------------------------------------------------------
create or replace function public.get_my_conversations()
returns table (
    conversation_id      uuid,
    other_participant_id uuid,
    other_full_name      text,
    other_avatar_url     text,
    last_message_body    text,
    last_message_at      timestamptz,
    last_sender_id       uuid,
    unread_count         bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception using
            errcode = '42501',
            message = 'Authentication required.';
    end if;

    return query
    select
        c.id,
        other.id,
        other.full_name,
        other.avatar_url,
        last_msg.body,
        last_msg.created_at,
        last_msg.sender_id,
        (
            select count(*)
            from public.messages um
            where um.conversation_id = c.id
              and um.sender_id <> v_uid
              and um.status = 'UNREAD'
        )
    from public.conversations c
    join public.profiles other
      on other.id = case when c.member_id = v_uid then c.coach_id else c.member_id end
    left join lateral (
        select m.body, m.created_at, m.sender_id
        from public.messages m
        where m.conversation_id = c.id
        order by m.created_at desc, m.id desc
        limit 1
    ) last_msg on true
    where c.member_id = v_uid or c.coach_id = v_uid
    order by last_msg.created_at desc nulls last, c.created_at desc
    limit 50;
end;
$$;

-- ------------------------------------------------------------
-- get_unread_message_count(): total unread for the nav badge. Guards itself:
-- an anonymous caller (auth.uid() is null) is rejected like the other RPCs
-- instead of silently returning 0.
-- ------------------------------------------------------------
create or replace function public.get_unread_message_count()
returns bigint
language plpgsql
security definer
set search_path = public
stable
as $$
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Authentication required.';
    end if;

    return (
        select count(*)::bigint
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
        where (c.member_id = auth.uid() or c.coach_id = auth.uid())
          and m.sender_id <> auth.uid()
          and m.status = 'UNREAD'
    );
end;
$$;

-- ------------------------------------------------------------
-- get_conversation_messages(): cursor-based history (newest page first).
--   p_before_id null        -> latest page
--   p_before_id <message id> -> the page strictly older than that message
-- Invalid/foreign cursors resolve to an empty page (never leak other threads).
-- ------------------------------------------------------------
create or replace function public.get_conversation_messages(
    p_conversation_id uuid,
    p_before_id       uuid default null,
    p_limit           integer default 50
)
returns table (
    id         uuid,
    sender_id  uuid,
    body       text,
    status     public.message_status,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception using
            errcode = '42501',
            message = 'Authentication required.';
    end if;

    if not exists (
        select 1
        from public.conversations c
        where c.id = p_conversation_id
          and (c.member_id = v_uid or c.coach_id = v_uid)
    ) then
        raise exception using
            errcode = '42501',
            message = 'Conversation not accessible.';
    end if;

    if p_limit is null or p_limit < 1 or p_limit > 100 then
        p_limit := 50;
    end if;

    return query
    with cursor_msg as (
        select m.created_at, m.id
        from public.messages m
        where m.id = p_before_id
          and m.conversation_id = p_conversation_id
    )
    select msg.id, msg.sender_id, msg.body, msg.status, msg.created_at
    from public.messages msg
    left join cursor_msg cm on true
    where msg.conversation_id = p_conversation_id
      and (
          p_before_id is null
          or msg.created_at < cm.created_at
          or (msg.created_at = cm.created_at and msg.id < cm.id)
      )
    order by msg.created_at desc, msg.id desc
    limit p_limit;
end;
$$;

-- ------------------------------------------------------------
-- mark_conversation_read(): the ONLY path that changes read state. Marks the
-- current user's RECEIVED messages READ. Idempotent and quiet (no
-- notifications on reads).
-- ------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid      uuid := auth.uid();
    v_updated  integer := 0;
begin
    if v_uid is null then
        raise exception using
            errcode = '42501',
            message = 'Authentication required.';
    end if;

    if not exists (
        select 1
        from public.conversations c
        where c.id = p_conversation_id
          and (c.member_id = v_uid or c.coach_id = v_uid)
    ) then
        raise exception using
            errcode = '42501',
            message = 'Conversation not accessible.';
    end if;

    update public.messages
    set status = 'READ'
    where conversation_id = p_conversation_id
      and sender_id <> v_uid
      and status = 'UNREAD';

    get diagnostics v_updated = row_count;
    return v_updated;
end;
$$;

-- ------------------------------------------------------------
-- Data API grants (least privilege: authenticated only, no UPDATE/DELETE)
-- ------------------------------------------------------------
grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

revoke all on function public.get_my_conversations() from public;
revoke all on function public.get_unread_message_count() from public;
revoke all on function public.get_conversation_messages(uuid, uuid, integer) from public;
revoke all on function public.mark_conversation_read(uuid) from public;

grant execute on function public.get_my_conversations() to authenticated;
grant execute on function public.get_unread_message_count() to authenticated;
grant execute on function public.get_conversation_messages(uuid, uuid, integer) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
