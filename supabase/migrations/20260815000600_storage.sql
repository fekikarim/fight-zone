-- ============================================================
-- FIGHT ZONE — Migration 0007: Supabase Storage buckets & policies
-- ============================================================
-- Public bucket : fightzone-public (coach/, achievements/, gallery/, events/, news/)
-- Private bucket: fightzone-private (members/, sessions/, documents/)
-- Private objects are organized under <user_id>/... so storage policies can
-- enforce ownership through the first path segment.

-- ------------------------------------------------------------
-- Buckets
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    (
        'fightzone-public',
        'fightzone-public',
        true,
        52428800,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf']
    ),
    (
        'fightzone-private',
        'fightzone-private',
        false,
        52428800,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf']
    )
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- fightzone-public: anonymous read, staff write
-- ------------------------------------------------------------
create policy "public_bucket_read_anon"
    on storage.objects for select
    using (bucket_id = 'fightzone-public');

create policy "public_bucket_insert_staff"
    on storage.objects for insert
    with check (
        bucket_id = 'fightzone-public'
        and public.is_admin_or_coach()
    );

create policy "public_bucket_update_staff"
    on storage.objects for update
    using (
        bucket_id = 'fightzone-public'
        and public.is_admin_or_coach()
    )
    with check (
        bucket_id = 'fightzone-public'
        and public.is_admin_or_coach()
    );

create policy "public_bucket_delete_staff"
    on storage.objects for delete
    using (
        bucket_id = 'fightzone-public'
        and public.is_admin_or_coach()
    );

-- ------------------------------------------------------------
-- fightzone-private: owner access via <user_id>/ prefix, staff full access
-- ------------------------------------------------------------
create policy "private_bucket_select_owner_or_staff"
    on storage.objects for select
    using (
        bucket_id = 'fightzone-private'
        and (
            public.is_admin_or_coach()
            or auth.uid()::text = (storage.foldername(name))[1]
        )
    );

create policy "private_bucket_insert_owner_or_staff"
    on storage.objects for insert
    with check (
        bucket_id = 'fightzone-private'
        and (
            public.is_admin_or_coach()
            or auth.uid()::text = (storage.foldername(name))[1]
        )
    );

create policy "private_bucket_update_owner_or_staff"
    on storage.objects for update
    using (
        bucket_id = 'fightzone-private'
        and (
            public.is_admin_or_coach()
            or auth.uid()::text = (storage.foldername(name))[1]
        )
    )
    with check (
        bucket_id = 'fightzone-private'
        and (
            public.is_admin_or_coach()
            or auth.uid()::text = (storage.foldername(name))[1]
        )
    );

create policy "private_bucket_delete_owner_or_staff"
    on storage.objects for delete
    using (
        bucket_id = 'fightzone-private'
        and (
            public.is_admin_or_coach()
            or auth.uid()::text = (storage.foldername(name))[1]
        )
    );
