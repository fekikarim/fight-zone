-- ============================================================
-- Fight Zone V1 — CMS (About blocks + revisions), FAQ, legal documents,
-- contact inbox hardening, news archive/tags, storage hardening.
-- ============================================================

-- ------------------------------------------------------------
-- CMS pages (block JSON validated by the app on write AND render)
-- ------------------------------------------------------------
create table if not exists public.cms_pages (
    slug                  text primary key check (slug ~ '^[a-z][a-z0-9-]{1,40}$'),
    draft                 jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
    draft_updated_at      timestamptz not null default now(),
    draft_updated_by      uuid references public.profiles(id) on delete set null,
    published_revision_id uuid,
    published_at          timestamptz,
    constraint cms_pages_draft_shape check (jsonb_typeof(draft) = 'object' and jsonb_typeof(draft->'blocks') = 'array'),
    constraint cms_pages_draft_size check (pg_column_size(draft) < 500000)
);
create table if not exists public.cms_page_revisions (
    id         uuid primary key default gen_random_uuid(),
    slug       text not null references public.cms_pages(slug) on delete cascade,
    content    jsonb not null check (jsonb_typeof(content) = 'object'),
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    note       text check (note is null or char_length(note) <= 200)
);
create index if not exists cms_page_revisions_slug_idx on public.cms_page_revisions (slug, created_at desc);
alter table public.cms_pages drop constraint if exists cms_pages_published_fk;
alter table public.cms_pages add constraint cms_pages_published_fk
    foreign key (published_revision_id) references public.cms_page_revisions(id) on delete set null;

alter table public.cms_pages enable row level security;
alter table public.cms_page_revisions enable row level security;
drop policy if exists cms_pages_staff on public.cms_pages;
create policy cms_pages_staff on public.cms_pages for all to authenticated
    using (public.is_admin_or_coach()) with check (public.is_admin_or_coach());
drop policy if exists cms_page_revisions_staff on public.cms_page_revisions;
create policy cms_page_revisions_staff on public.cms_page_revisions for select to authenticated
    using (public.is_admin_or_coach());
grant select, insert, update on public.cms_pages to authenticated;
grant select on public.cms_page_revisions to authenticated;
revoke all on public.cms_pages, public.cms_page_revisions from anon;
insert into public.cms_pages (slug) values ('about') on conflict do nothing;

-- Public read of the PUBLISHED content only (drafts never leak).
create or replace function public.get_published_page(p_slug text)
returns table (content jsonb, published_at timestamptz)
language sql stable security definer set search_path = public as $$
    select r.content, p.published_at from public.cms_pages p
      join public.cms_page_revisions r on r.id = p.published_revision_id
     where p.slug = p_slug;
$$;
grant execute on function public.get_published_page(text) to anon, authenticated;

create or replace function public.publish_page(p_slug text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.require_staff(); v_draft jsonb; v_id uuid;
begin
    select draft into v_draft from public.cms_pages where slug = p_slug for update;
    if v_draft is null then raise exception 'Page not found.' using errcode = 'P0002'; end if;
    insert into public.cms_page_revisions (slug, content, created_by, note)
    values (p_slug, v_draft, v_actor, nullif(trim(p_note), '')) returning id into v_id;
    update public.cms_pages set published_revision_id = v_id, published_at = now() where slug = p_slug;
    perform public.log_audit('cms.publish', 'cms_page', v_id, jsonb_build_object('slug', p_slug));
    return v_id;
end;
$$;
revoke all on function public.publish_page(text, text) from public, anon;
grant execute on function public.publish_page(text, text) to authenticated;

-- Load a previous revision into the draft (publish again to make it live).
create or replace function public.restore_page_revision(p_revision_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.require_staff(); v_rev record;
begin
    select slug, content into v_rev from public.cms_page_revisions where id = p_revision_id;
    if v_rev is null then raise exception 'Revision not found.' using errcode = 'P0002'; end if;
    update public.cms_pages set draft = v_rev.content, draft_updated_at = now(), draft_updated_by = v_actor
     where slug = v_rev.slug;
    perform public.log_audit('cms.restore', 'cms_page', p_revision_id, jsonb_build_object('slug', v_rev.slug));
end;
$$;
revoke all on function public.restore_page_revision(uuid) from public, anon;
grant execute on function public.restore_page_revision(uuid) to authenticated;

-- ------------------------------------------------------------
-- FAQ
-- ------------------------------------------------------------
create table if not exists public.faq_items (
    id           uuid primary key default gen_random_uuid(),
    category     text not null default 'General' check (char_length(category) between 2 and 40),
    question     text not null check (char_length(question) between 5 and 200),
    answer       text not null check (char_length(answer) between 2 and 3000),
    position     integer not null default 0,
    is_published boolean not null default false,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);
create index if not exists faq_items_order_idx on public.faq_items (category, position);
alter table public.faq_items enable row level security;
drop policy if exists faq_items_public on public.faq_items;
create policy faq_items_public on public.faq_items for select using (is_published or public.is_admin_or_coach());
drop policy if exists faq_items_manage on public.faq_items;
create policy faq_items_manage on public.faq_items for all to authenticated
    using (public.is_admin_or_coach()) with check (public.is_admin_or_coach());
grant select on public.faq_items to anon, authenticated;
grant insert, update, delete on public.faq_items to authenticated;
drop trigger if exists faq_items_set_updated_at on public.faq_items;
create trigger faq_items_set_updated_at before update on public.faq_items
    for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Legal documents (versioned; prior published versions are preserved)
-- ------------------------------------------------------------
create table if not exists public.legal_documents (
    id           uuid primary key default gen_random_uuid(),
    kind         text not null check (kind in ('privacy', 'terms')),
    version      integer not null check (version >= 1),
    title        text not null check (char_length(title) between 3 and 120),
    content      text not null check (char_length(content) between 20 and 60000),
    status       text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'SUPERSEDED')),
    published_at timestamptz,
    created_by   uuid references public.profiles(id) on delete set null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    constraint legal_documents_version_unique unique (kind, version)
);
create unique index if not exists legal_documents_one_published_uidx on public.legal_documents (kind) where status = 'PUBLISHED';
alter table public.legal_documents enable row level security;
drop policy if exists legal_documents_public on public.legal_documents;
create policy legal_documents_public on public.legal_documents for select
    using (status in ('PUBLISHED', 'SUPERSEDED') or public.is_admin_or_coach());
drop policy if exists legal_documents_manage on public.legal_documents;
create policy legal_documents_manage on public.legal_documents for all to authenticated
    using (public.is_admin_or_coach() and status = 'DRAFT') with check (public.is_admin_or_coach() and status = 'DRAFT');
grant select on public.legal_documents to anon, authenticated;
grant insert, update, delete on public.legal_documents to authenticated;
drop trigger if exists legal_documents_set_updated_at on public.legal_documents;
create trigger legal_documents_set_updated_at before update on public.legal_documents
    for each row execute function public.set_updated_at();

create or replace function public.publish_legal_document(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := public.require_staff(); v_doc record;
begin
    select * into v_doc from public.legal_documents where id = p_id for update;
    if v_doc is null then raise exception 'Document not found.' using errcode = 'P0002'; end if;
    if v_doc.status <> 'DRAFT' then raise exception 'Only drafts can be published.' using errcode = '42501'; end if;
    update public.legal_documents set status = 'SUPERSEDED' where kind = v_doc.kind and status = 'PUBLISHED';
    update public.legal_documents set status = 'PUBLISHED', published_at = now() where id = p_id;
    perform public.log_audit('legal.publish', 'legal_document', p_id,
        jsonb_build_object('kind', v_doc.kind, 'version', v_doc.version));
end;
$$;
revoke all on function public.publish_legal_document(uuid) from public, anon;
grant execute on function public.publish_legal_document(uuid) to authenticated;

-- ------------------------------------------------------------
-- Contact inbox: simple workflow + abuse protection
-- ------------------------------------------------------------
alter table public.contact_messages add column if not exists category text not null default 'GENERAL'
    check (category in ('GENERAL', 'EVENTS', 'PAYMENT', 'COACHING', 'OTHER'));
alter table public.contact_messages add column if not exists handled_at timestamptz;
create index if not exists contact_messages_status_idx on public.contact_messages (status, created_at desc);

create or replace function public.guard_contact_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if (select count(*) from public.contact_messages
         where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3 then
        raise exception 'Too many messages — please try again later.' using errcode = '54000';
    end if;
    if (select count(*) from public.contact_messages where created_at > now() - interval '1 minute') >= 20 then
        raise exception 'The contact form is busy — please try again in a minute.' using errcode = '54000';
    end if;
    new.status := 'UNREAD';
    new.replied_at := null;
    return new;
end;
$$;
drop trigger if exists contact_messages_rate_limit on public.contact_messages;
create trigger contact_messages_rate_limit before insert on public.contact_messages
    for each row execute function public.guard_contact_rate_limit();

-- Seif is notified of new contact submissions.
create or replace function public.notify_contact_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    perform public.notify_user(public.platform_owner_id(), 'SYSTEM', 'New contact message',
        left(new.subject, 120), 'contact', new.id, 'contact:' || new.id);
    return new;
end;
$$;
drop trigger if exists contact_messages_notify on public.contact_messages;
create trigger contact_messages_notify after insert on public.contact_messages
    for each row execute function public.notify_contact_message();

-- ------------------------------------------------------------
-- News: tags + archive + SEO description
-- ------------------------------------------------------------
alter table public.news add column if not exists tags text[] not null default '{}';
alter table public.news add column if not exists archived_at timestamptz;
alter table public.news add column if not exists seo_description text check (seo_description is null or char_length(seo_description) <= 160);
alter table public.news drop constraint if exists news_tags_len;
alter table public.news add constraint news_tags_len check (cardinality(tags) <= 10);

-- ------------------------------------------------------------
-- Profiles: member privacy preference
-- ------------------------------------------------------------
alter table public.profiles add column if not exists show_badges_publicly boolean not null default false;

-- Members set their avatar only to a file in their own avatars/ folder.
create or replace function public.set_my_avatar(p_path text)
returns text language plpgsql security definer set search_path = public, storage as $$
declare v_uid uuid := auth.uid(); v_url text;
begin
    if v_uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
    if p_path is null then
        perform set_config('fightzone.avatar_update', 'on', true);
        update public.profiles set avatar_url = null where id = v_uid;
        perform set_config('fightzone.avatar_update', 'off', true);
        return null;
    end if;
    if p_path not like 'avatars/' || v_uid::text || '/%' or p_path like '%..%' then
        raise exception 'Invalid avatar file.' using errcode = '42501';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'fightzone-public' and name = p_path
                    and coalesce((metadata->>'size')::bigint, 0) between 1 and 2097152
                    and metadata->>'mimetype' in ('image/png','image/jpeg','image/webp')) then
        raise exception 'Upload a PNG, JPEG or WebP image up to 2 MB.' using errcode = '22023';
    end if;
    -- Stored as the storage path; the app builds the public URL. The V0
    -- guard blocks direct avatar edits by members; this validated path is
    -- the sanctioned route, signalled with a transaction-local flag.
    perform set_config('fightzone.avatar_update', 'on', true);
    update public.profiles set avatar_url = p_path where id = v_uid;
    perform set_config('fightzone.avatar_update', 'off', true);
    return p_path;
end;
$$;
revoke all on function public.set_my_avatar(text) from public, anon;

-- V0 guard, extended: members still can't change email/is_active/avatar
-- directly — except an avatar change made through set_my_avatar().
create or replace function public.guard_profiles_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is not null and not public.is_admin_or_coach() and old.id = auth.uid() then
        if new.email is distinct from old.email then
            raise exception using errcode = '42501', message = 'Email changes must go through account settings.';
        end if;
        if new.is_active is distinct from old.is_active then
            raise exception using errcode = '42501', message = 'Account activation is managed by staff.';
        end if;
        if new.avatar_url is distinct from old.avatar_url
           and coalesce(current_setting('fightzone.avatar_update', true), '') <> 'on' then
            raise exception using errcode = '42501', message = 'Avatar changes must go through account settings.';
        end if;
    end if;
    if auth.uid() is not null and new.id is distinct from old.id then
        raise exception using errcode = '42501', message = 'Profile ownership is immutable.';
    end if;
    return new;
end;
$$;
grant execute on function public.set_my_avatar(text) to authenticated;

-- ------------------------------------------------------------
-- Storage hardening
-- ------------------------------------------------------------
-- Private evidence is write-once for members: no overwriting/deleting a
-- submitted proof or attachment. Staff keep full control.
drop policy if exists private_bucket_update_owner_or_staff on storage.objects;
drop policy if exists private_bucket_delete_owner_or_staff on storage.objects;
drop policy if exists private_bucket_update_staff on storage.objects;
create policy private_bucket_update_staff on storage.objects for update to authenticated
    using (bucket_id = 'fightzone-private' and public.is_admin_or_coach())
    with check (bucket_id = 'fightzone-private' and public.is_admin_or_coach());
drop policy if exists private_bucket_delete_staff on storage.objects;
create policy private_bucket_delete_staff on storage.objects for delete to authenticated
    using (bucket_id = 'fightzone-private' and public.is_admin_or_coach());

-- Members may upload only into <uid>/payments/ or <uid>/messages/ of the
-- private bucket (replaces the broader owner-folder insert policy).
drop policy if exists private_bucket_insert_owner_or_staff on storage.objects;
create policy private_bucket_insert_owner_or_staff on storage.objects for insert to authenticated
    with check (bucket_id = 'fightzone-private' and (
        public.is_admin_or_coach()
        or ((storage.foldername(name))[1] = auth.uid()::text
            and (storage.foldername(name))[2] in ('payments', 'messages'))));

-- Avatars: members manage files under avatars/<uid>/ in the public bucket.
drop policy if exists public_bucket_avatar_insert_own on storage.objects;
create policy public_bucket_avatar_insert_own on storage.objects for insert to authenticated
    with check (bucket_id = 'fightzone-public' and (storage.foldername(name))[1] = 'avatars'
                and (storage.foldername(name))[2] = auth.uid()::text);
drop policy if exists public_bucket_avatar_delete_own on storage.objects;
create policy public_bucket_avatar_delete_own on storage.objects for delete to authenticated
    using (bucket_id = 'fightzone-public' and (storage.foldername(name))[1] = 'avatars'
           and (storage.foldername(name))[2] = auth.uid()::text);
