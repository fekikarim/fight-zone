-- ============================================================
-- FIGHT ZONE — Migration 0003: Coaching (sessions, bookings, payments)
-- ============================================================
-- A `sessions` row is a coaching offering/type provided by the coach.
-- A `bookings` row is a member reserving a session at a specific time.
-- These are deliberately distinct (see docs/implementation-sessions.md).
-- `payments` is reserved for the future payment phase; not activated yet.

-- ------------------------------------------------------------
-- sessions (service catalog)
-- ------------------------------------------------------------
create table public.sessions (
    id           uuid primary key default gen_random_uuid(),
    coach_id     uuid not null references public.coach_profiles (id) on delete cascade,
    title        text not null,
    description  text,
    type         public.session_type not null default 'PERSONAL',
    duration_min integer not null check (duration_min > 0),
    price        numeric(10, 2) not null default 0 check (price >= 0),
    is_active    boolean not null default true,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index sessions_coach_id_idx on public.sessions (coach_id);
create index sessions_active_type_idx on public.sessions (is_active, type);

create trigger sessions_set_updated_at
    before update on public.sessions
    for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- bookings (reservations)
-- ------------------------------------------------------------
create table public.bookings (
    id           uuid primary key default gen_random_uuid(),
    member_id    uuid not null references public.member_profiles (id) on delete cascade,
    session_id   uuid not null references public.sessions (id) on delete restrict,
    coach_id     uuid not null references public.coach_profiles (id) on delete cascade,
    scheduled_at timestamptz not null,
    status       public.booking_status not null default 'PENDING',
    notes        text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index bookings_member_id_idx on public.bookings (member_id);
create index bookings_coach_id_idx on public.bookings (coach_id);
create index bookings_session_id_idx on public.bookings (session_id);
create index bookings_status_scheduled_at_idx on public.bookings (status, scheduled_at);

create trigger bookings_set_updated_at
    before update on public.bookings
    for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- payments (reserved for future phase; extensible, not activated)
-- ------------------------------------------------------------
create table public.payments (
    id             uuid primary key default gen_random_uuid(),
    booking_id     uuid not null references public.bookings (id) on delete cascade,
    amount         numeric(10, 2) not null check (amount >= 0),
    currency       char(3) not null default 'USD',
    method         public.payment_method not null default 'CASH',
    status         public.payment_status not null default 'PENDING',
    paid_at        timestamptz,
    transaction_ref text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    constraint payments_booking_unique unique (booking_id)
);

create index payments_status_idx on public.payments (status);

create trigger payments_set_updated_at
    before update on public.payments
    for each row execute procedure public.set_updated_at();
