-- ============================================================
-- FIGHT ZONE — Migration 0004: Content
-- (achievements, media + junctions, events, event participants, news)
-- ============================================================

-- ------------------------------------------------------------
-- achievements (coach palmares)
-- ------------------------------------------------------------
create table public.achievements (
    id          uuid primary key default gen_random_uuid(),
    coach_id    uuid not null references public.coach_profiles (id) on delete cascade,
    title       text not null,
    description text,
    type        public.achievement_type not null default 'TITLE',
    date        date,
    image_url   text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index achievements_coach_id_idx on public.achievements (coach_id);
create index achievements_type_date_idx on public.achievements (type, date desc);

create trigger achievements_set_updated_at
    before update on public.achievements
    for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- media (gallery)
-- ------------------------------------------------------------
create table public.media (
    id          uuid primary key default gen_random_uuid(),
    coach_id    uuid not null references public.coach_profiles (id) on delete cascade,
    url         text not null,
    type        public.media_type not null default 'IMAGE',
    title       text,
    description text,
    is_public   boolean not null default true,
    uploaded_at timestamptz not null default now(),
    created_at  timestamptz not null default now()
);

create index media_coach_id_idx on public.media (coach_id);
create index media_public_type_idx on public.media (is_public, type);

-- ------------------------------------------------------------
-- events (calendar)
-- ------------------------------------------------------------
create table public.events (
    id          uuid primary key default gen_random_uuid(),
    title       text not null,
    description text,
    start_at    timestamptz not null,
    end_at      timestamptz,
    location    text,
    event_type  public.event_type not null default 'TRAINING',
    is_public   boolean not null default false,
    created_by  uuid not null references public.profiles (id) on delete restrict,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    constraint events_end_after_start check (end_at is null or end_at > start_at)
);

create index events_start_at_idx on public.events (start_at);
create index events_public_type_idx on public.events (is_public, event_type);

create trigger events_set_updated_at
    before update on public.events
    for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- event_participants
-- ------------------------------------------------------------
create table public.event_participants (
    id        uuid primary key default gen_random_uuid(),
    event_id  uuid not null references public.events (id) on delete cascade,
    member_id uuid not null references public.member_profiles (id) on delete cascade,
    status    public.participation_status not null default 'INTERESTED',
    joined_at timestamptz not null default now(),
    constraint event_participants_unique unique (event_id, member_id)
);

create index event_participants_member_id_idx on public.event_participants (member_id);

-- ------------------------------------------------------------
-- news (blog)
-- ------------------------------------------------------------
create table public.news (
    id              uuid primary key default gen_random_uuid(),
    title           text not null,
    slug            text not null unique,
    content         text,
    cover_image_url text,
    is_published    boolean not null default false,
    published_at    timestamptz,
    created_by      uuid not null references public.profiles (id) on delete restrict,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index news_published_published_at_idx on public.news (is_published, published_at desc);

create trigger news_set_updated_at
    before update on public.news
    for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- media junctions (M:N, referential integrity preserved)
-- ------------------------------------------------------------
create table public.media_achievements (
    media_id       uuid not null references public.media (id) on delete cascade,
    achievement_id uuid not null references public.achievements (id) on delete cascade,
    primary key (media_id, achievement_id)
);

create table public.media_events (
    media_id uuid not null references public.media (id) on delete cascade,
    event_id uuid not null references public.events (id) on delete cascade,
    primary key (media_id, event_id)
);

create table public.media_news (
    media_id uuid not null references public.media (id) on delete cascade,
    news_id  uuid not null references public.news (id) on delete cascade,
    primary key (media_id, news_id)
);
