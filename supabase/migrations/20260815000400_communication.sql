-- ============================================================
-- FIGHT ZONE — Migration 0005: Communication
-- (contact_messages, notifications, files)
-- ============================================================

-- ------------------------------------------------------------
-- contact_messages
-- member_id is nullable: guests can reach the coach through the public
-- contact form without an account (documented decision).
-- ------------------------------------------------------------
create table public.contact_messages (
    id         uuid primary key default gen_random_uuid(),
    member_id  uuid references public.member_profiles (id) on delete set null,
    name       text not null,
    email      text not null,
    subject    text not null,
    message    text not null,
    status     public.message_status not null default 'UNREAD',
    created_at timestamptz not null default now(),
    replied_at timestamptz,
    constraint contact_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create index contact_messages_status_idx on public.contact_messages (status, created_at);
create index contact_messages_member_id_idx on public.contact_messages (member_id);

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
create table public.notifications (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references public.profiles (id) on delete cascade,
    type       public.notification_type not null default 'SYSTEM',
    title      text not null,
    content    text,
    is_read    boolean not null default false,
    created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, is_read);

-- ------------------------------------------------------------
-- files (tracks objects stored in Supabase Storage)
-- ------------------------------------------------------------
create table public.files (
    id          uuid primary key default gen_random_uuid(),
    bucket      text not null,
    path        text not null,
    object_key  text not null,
    name        text not null,
    mime_type   text,
    size_bytes  bigint check (size_bytes is null or size_bytes >= 0),
    uploaded_by uuid references public.profiles (id) on delete set null,
    created_at  timestamptz not null default now(),
    constraint files_bucket_key_unique unique (bucket, object_key)
);

create index files_uploaded_by_idx on public.files (uploaded_by);
