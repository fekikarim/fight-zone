-- ============================================================
-- FIGHT ZONE — Migration 0002: Identity, roles & profiles
-- ============================================================
-- auth.users owns authentication identity (Supabase Auth).
-- `profiles` is the application-level user record (1:1 with auth.users.id).
-- `member_profiles` / `coach_profiles` extend `profiles` with role-specific data.

-- ------------------------------------------------------------
-- Helper: keep updated_at fresh
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ------------------------------------------------------------
-- profiles (application user, 1:1 with auth.users)
-- ------------------------------------------------------------
create table public.profiles (
    id         uuid primary key references auth.users (id) on delete cascade,
    email      text not null,
    full_name  text,
    avatar_url text,
    phone      text,
    is_active  boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_email_trim check (email = trim(email))
);

create unique index profiles_lower_email_idx on public.profiles (lower(email));
create index profiles_is_active_idx on public.profiles (is_active);

create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- roles
-- ------------------------------------------------------------
create table public.roles (
    id          uuid primary key default gen_random_uuid(),
    name        public.user_role not null unique,
    description text,
    created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- user_role_assignments (many-to-many users <-> roles)
-- ------------------------------------------------------------
create table public.user_role_assignments (
    user_id     uuid not null references public.profiles (id) on delete cascade,
    role_id     uuid not null references public.roles (id) on delete cascade,
    assigned_at timestamptz not null default now(),
    primary key (user_id, role_id)
);

create index user_role_assignments_role_id_idx on public.user_role_assignments (role_id);

-- ------------------------------------------------------------
-- member_profiles
-- ------------------------------------------------------------
create table public.member_profiles (
    id            uuid primary key references public.profiles (id) on delete cascade,
    date_of_birth date,
    gender        public.gender,
    address       text,
    skill_level   public.skill_level not null default 'BEGINNER',
    weight        numeric(6, 2),
    height        numeric(6, 2),
    bio           text,
    is_verified   boolean not null default false,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    constraint member_weight_positive check (weight is null or weight > 0),
    constraint member_height_positive check (height is null or height > 0)
);

create trigger member_profiles_set_updated_at
    before update on public.member_profiles
    for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- coach_profiles (Coach Seif Dridi)
-- ------------------------------------------------------------
create table public.coach_profiles (
    id               uuid primary key references public.profiles (id) on delete cascade,
    experience_years integer,
    specialization   text,
    biography        text,
    is_available     boolean not null default true,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    constraint coach_experience_positive check (experience_years is null or experience_years >= 0)
);

create trigger coach_profiles_set_updated_at
    before update on public.coach_profiles
    for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Trigger: create profile (and default MEMBER role) for every new auth user
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, avatar_url)
    values (
        new.id,
        new.email,
        coalesce(
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name',
            split_part(new.email, '@', 1)
        ),
        new.raw_user_meta_data ->> 'avatar_url'
    )
    on conflict (id) do nothing;

    insert into public.user_role_assignments (user_id, role_id)
    select new.id, r.id
    from public.roles r
    where r.name = 'MEMBER'
    on conflict (user_id, role_id) do nothing;

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
