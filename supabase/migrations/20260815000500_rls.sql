-- ============================================================
-- FIGHT ZONE — Migration 0006: Row Level Security
-- ============================================================
-- RLS is the primary security boundary for every application table.
-- Access model:
--   PUBLIC   -> anonymous reads of intentional public content
--   MEMBER   -> own profiles, bookings, participation, notifications, messages
--   COACH/ADMIN -> manage the resources they own
-- No `USING (true)` policies exist for private/member-sensitive tables.

-- ------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER, RLS-bypassing, safe)
-- ------------------------------------------------------------
create or replace function public.has_role(role_name text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.user_role_assignments ura
        join public.roles r on r.id = ura.role_id
        where ura.user_id = auth.uid()
          and r.name::text = role_name
    );
$$;

create or replace function public.is_admin_or_coach()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.user_role_assignments ura
        join public.roles r on r.id = ura.role_id
        where ura.user_id = auth.uid()
          and r.name in ('ADMIN', 'COACH')
    );
$$;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own_or_staff
    on public.profiles for select
    using (id = auth.uid() or public.is_admin_or_coach());

create policy profiles_insert_own
    on public.profiles for insert
    with check (id = auth.uid());

create policy profiles_update_own_or_staff
    on public.profiles for update
    using (id = auth.uid() or public.is_admin_or_coach())
    with check (id = auth.uid() or public.is_admin_or_coach());

-- ------------------------------------------------------------
-- roles
-- ------------------------------------------------------------
alter table public.roles enable row level security;

create policy roles_select_authenticated
    on public.roles for select
    using (auth.role() = 'authenticated');

create policy roles_manage_admin_only
    on public.roles for all
    using (public.has_role('ADMIN'))
    with check (public.has_role('ADMIN'));

-- ------------------------------------------------------------
-- user_role_assignments
-- ------------------------------------------------------------
alter table public.user_role_assignments enable row level security;

create policy ura_select_own_or_staff
    on public.user_role_assignments for select
    using (user_id = auth.uid() or public.is_admin_or_coach());

create policy ura_manage_admin_only
    on public.user_role_assignments for all
    using (public.has_role('ADMIN'))
    with check (public.has_role('ADMIN'));

-- ------------------------------------------------------------
-- member_profiles
-- ------------------------------------------------------------
alter table public.member_profiles enable row level security;

create policy member_profiles_select_own_or_staff
    on public.member_profiles for select
    using (id = auth.uid() or public.is_admin_or_coach());

create policy member_profiles_insert_own
    on public.member_profiles for insert
    with check (id = auth.uid());

create policy member_profiles_update_own_or_staff
    on public.member_profiles for update
    using (id = auth.uid() or public.is_admin_or_coach())
    with check (id = auth.uid() or public.is_admin_or_coach());

create policy member_profiles_delete_staff
    on public.member_profiles for delete
    using (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- coach_profiles (public coach info; private data stays in profiles)
-- ------------------------------------------------------------
alter table public.coach_profiles enable row level security;

create policy coach_profiles_select_public
    on public.coach_profiles for select
    using (true);

create policy coach_profiles_insert_own
    on public.coach_profiles for insert
    with check (id = auth.uid() or public.is_admin_or_coach());

create policy coach_profiles_update_own_or_staff
    on public.coach_profiles for update
    using (id = auth.uid() or public.is_admin_or_coach())
    with check (id = auth.uid() or public.is_admin_or_coach());

-- ------------------------------------------------------------
-- sessions (public service catalog)
-- ------------------------------------------------------------
alter table public.sessions enable row level security;

create policy sessions_select_public
    on public.sessions for select
    using (is_active = true);

create policy sessions_manage_staff
    on public.sessions for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- bookings (private)
-- ------------------------------------------------------------
alter table public.bookings enable row level security;

create policy bookings_select_own_or_staff
    on public.bookings for select
    using (member_id = auth.uid() or public.is_admin_or_coach());

create policy bookings_insert_own
    on public.bookings for insert
    with check ((member_id = auth.uid()) or public.is_admin_or_coach());

create policy bookings_update_own_cancel_or_staff
    on public.bookings for update
    using (member_id = auth.uid() or public.is_admin_or_coach())
    with check (member_id = auth.uid() or public.is_admin_or_coach());

create policy bookings_delete_staff
    on public.bookings for delete
    using (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- payments
-- ------------------------------------------------------------
alter table public.payments enable row level security;

create policy payments_select_own_or_staff
    on public.payments for select
    using (
        public.is_admin_or_coach()
        or exists (
            select 1 from public.bookings b
            where b.id = payments.booking_id
              and b.member_id = auth.uid()
        )
    );

create policy payments_manage_staff
    on public.payments for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- achievements (public palmares)
-- ------------------------------------------------------------
alter table public.achievements enable row level security;

create policy achievements_select_public
    on public.achievements for select
    using (true);

create policy achievements_manage_staff
    on public.achievements for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- media (public gallery vs private)
-- ------------------------------------------------------------
alter table public.media enable row level security;

create policy media_select_public
    on public.media for select
    using (is_public = true);

create policy media_select_staff
    on public.media for select
    using (public.is_admin_or_coach());

create policy media_manage_staff
    on public.media for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- media junctions (readable when linked media is public; managed by staff)
-- ------------------------------------------------------------
alter table public.media_achievements enable row level security;

create policy media_achievements_select_public
    on public.media_achievements for select
    using (
        exists (
            select 1 from public.media m
            where m.id = media_achievements.media_id and m.is_public = true
        )
        or public.is_admin_or_coach()
    );

create policy media_achievements_manage_staff
    on public.media_achievements for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

alter table public.media_events enable row level security;

create policy media_events_select_public
    on public.media_events for select
    using (
        exists (
            select 1 from public.media m
            where m.id = media_events.media_id and m.is_public = true
        )
        or public.is_admin_or_coach()
    );

create policy media_events_manage_staff
    on public.media_events for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

alter table public.media_news enable row level security;

create policy media_news_select_public
    on public.media_news for select
    using (
        exists (
            select 1 from public.media m
            where m.id = media_news.media_id and m.is_public = true
        )
        or public.is_admin_or_coach()
    );

create policy media_news_manage_staff
    on public.media_news for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- events
-- ------------------------------------------------------------
alter table public.events enable row level security;

create policy events_select_public
    on public.events for select
    using (is_public = true);

create policy events_select_staff
    on public.events for select
    using (public.is_admin_or_coach());

create policy events_manage_staff
    on public.events for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- event_participants
-- ------------------------------------------------------------
alter table public.event_participants enable row level security;

create policy event_participants_select_own_or_staff
    on public.event_participants for select
    using (member_id = auth.uid() or public.is_admin_or_coach());

create policy event_participants_insert_own
    on public.event_participants for insert
    with check (member_id = auth.uid() or public.is_admin_or_coach());

create policy event_participants_update_own_or_staff
    on public.event_participants for update
    using (member_id = auth.uid() or public.is_admin_or_coach())
    with check (member_id = auth.uid() or public.is_admin_or_coach());

create policy event_participants_delete_staff
    on public.event_participants for delete
    using (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- news
-- ------------------------------------------------------------
alter table public.news enable row level security;

create policy news_select_published
    on public.news for select
    using (is_published = true);

create policy news_select_staff
    on public.news for select
    using (public.is_admin_or_coach());

create policy news_manage_staff
    on public.news for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- contact_messages
-- ------------------------------------------------------------
alter table public.contact_messages enable row level security;

create policy contact_messages_insert_anyone
    on public.contact_messages for insert
    with check (
        member_id is null
        or member_id = auth.uid()
        or public.is_admin_or_coach()
    );

create policy contact_messages_select_own_or_staff
    on public.contact_messages for select
    using (member_id = auth.uid() or public.is_admin_or_coach());

create policy contact_messages_update_staff
    on public.contact_messages for update
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

create policy contact_messages_delete_staff
    on public.contact_messages for delete
    using (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
alter table public.notifications enable row level security;

create policy notifications_select_own_or_staff
    on public.notifications for select
    using (user_id = auth.uid() or public.is_admin_or_coach());

create policy notifications_insert_staff
    on public.notifications for insert
    with check (public.is_admin_or_coach());

create policy notifications_update_own_or_staff
    on public.notifications for update
    using (user_id = auth.uid() or public.is_admin_or_coach())
    with check (user_id = auth.uid() or public.is_admin_or_coach());

create policy notifications_delete_staff
    on public.notifications for delete
    using (public.is_admin_or_coach());

-- ------------------------------------------------------------
-- files
-- ------------------------------------------------------------
alter table public.files enable row level security;

create policy files_select_owner_or_staff
    on public.files for select
    using (uploaded_by = auth.uid() or public.is_admin_or_coach());

create policy files_insert_owner
    on public.files for insert
    with check (uploaded_by = auth.uid() or public.is_admin_or_coach());

create policy files_manage_staff
    on public.files for all
    using (public.is_admin_or_coach())
    with check (public.is_admin_or_coach());

-- ============================================================
-- Data API grants (new tables are NOT auto-exposed by default)
-- ============================================================
-- `anon` and `authenticated` are the PostgREST roles; RLS (above) is the
-- actual access boundary. `service_role` already bypasses RLS.

grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.roles to anon, authenticated;
grant insert, update, delete on public.roles to authenticated;

grant select on public.user_role_assignments to authenticated;
grant insert, update, delete on public.user_role_assignments to authenticated;

grant select, insert, update on public.member_profiles to authenticated;
grant delete on public.member_profiles to authenticated;

grant select on public.coach_profiles to anon, authenticated;
grant insert, update on public.coach_profiles to authenticated;

grant select on public.sessions to anon, authenticated;
grant insert, update, delete on public.sessions to authenticated;

grant select, insert, update, delete on public.bookings to authenticated;

grant select, insert, update, delete on public.payments to authenticated;

grant select on public.achievements to anon, authenticated;
grant insert, update, delete on public.achievements to authenticated;

grant select on public.media to anon, authenticated;
grant insert, update, delete on public.media to authenticated;

grant select on public.media_achievements to anon, authenticated;
grant insert, update, delete on public.media_achievements to authenticated;

grant select on public.media_events to anon, authenticated;
grant insert, update, delete on public.media_events to authenticated;

grant select on public.media_news to anon, authenticated;
grant insert, update, delete on public.media_news to authenticated;

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

grant select, insert, update, delete on public.event_participants to authenticated;

grant select on public.news to anon, authenticated;
grant insert, update, delete on public.news to authenticated;

grant select, insert on public.contact_messages to anon, authenticated;
grant update, delete on public.contact_messages to authenticated;

grant select, insert, update, delete on public.notifications to authenticated;

grant select, insert, update, delete on public.files to authenticated;
