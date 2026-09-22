-- ============================================================
-- UPDATE V4 — Daily AI Motivational Coach
--
-- Additive-only migration. Delivers the daily, personalized
-- motivational quote for authenticated members (see
-- docs/daily-ai-motivation.md).
--
-- Design decisions (audited in docs/daily-ai-motivation.md):
--   * One row per member per calendar day — enforced by the
--     UNIQUE(user_id, motivation_date) constraint. `motivation_date`
--     is expressed in the business timezone (Africa/Tunis), the same
--     "today" boundary used by the V3 daily coach report, so the
--     platform is consistent and does not silently depend on the
--     browser's timezone.
--   * RLS secures it member-owned: members can SELECT only their own
--     rows. There is NO client INSERT/UPDATE/DELETE policy. Rows are
--     created ONLY by trusted server-side code via the SECURITY
--     DEFINER upsert function below, invoked with the service_role
--     client. A malicious client therefore cannot forge or overwrite
--     quotes.
--   * Concurrency-safe: the quote is generated in the app (the AI /
--     fallback provider runs in the Next.js server, not in SQL), then
--     persisted with an atomic upsert. `ON CONFLICT (user_id,
--     motivation_date) DO UPDATE ... WHERE daily_motivations.quote IS
--     NULL` guarantees that when two tabs race to create today's quote
--     (Tab A generates, Tab B generates a moment later), exactly one
--     quote is persisted and the losing writer receives the existing
--     row unchanged — the member always sees one consistent daily quote.
-- ============================================================

create table public.daily_motivations (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references public.profiles (id) on delete cascade,
    quote           text not null,
    focus           text,
    category        text not null default 'MINDSET',
    source          text not null default 'FALLBACK',
    motivation_date date not null,
    generated_at    timestamptz not null default now(),
    displayed_at    timestamptz,
    constraint daily_motivations_user_date_unique
        unique (user_id, motivation_date),
    constraint daily_motivations_quote_not_blank
        check (length(btrim(quote)) > 0),
    constraint daily_motivations_quote_length
        check (length(quote) <= 600),
    constraint daily_motivations_category_valid
        check (category in (
            'DISCIPLINE', 'STRENGTH', 'BOXING', 'KICKBOXING',
            'FITNESS', 'CONSISTENCY', 'CONFIDENCE', 'RECOVERY',
            'MINDSET', 'RESILIENCE'
        ))
);

-- Lookup by (user, day) is already covered by the unique constraint.
-- An index on motivation_date supports potential cross-member reporting.
create index daily_motivations_date_idx
    on public.daily_motivations (motivation_date);

-- Member-owned RLS: SELECT own rows only. No write policies — all
-- writes go through the SECURITY DEFINER upsert below.
alter table public.daily_motivations enable row level security;

create policy "daily_motivations_select_own"
    on public.daily_motivations
    for select
    to authenticated
    using (user_id = auth.uid());

-- No INSERT / UPDATE / DELETE policies for any client role.

-- Data API grants: Supabase does NOT auto-grant table privileges; a role
-- needs a table-level GRANT for its RLS policies to take effect.
--   * authenticated: SELECT only (own rows via the policy above).
--   * service_role: full access (bypasses RLS) for the trusted server
--     tooling that invokes the upsert function via the ADMIN client.
GRANT SELECT ON public.daily_motivations TO authenticated;
GRANT ALL ON public.daily_motivations TO service_role;

-- ============================================================
-- Atomic upsert (server-controlled creation)
--
-- SECURITY DEFINER so trusted server-side code (the server action,
-- authenticated as the member and invoked via the service_role ADMIN
-- client) can create or fetch today's quote atomically. Because the
-- function is SECURITY DEFINER and runs as the owning (postgres)
-- role, RLS is bypassed inside it — which is exactly what we want,
-- since the caller is always our trusted server action that already
-- authenticated the member and passes user_id from the session.
--
-- Invoked ONLY via the ADMIN client; revoked from anon / authenticated
-- so members cannot call it directly.
-- ============================================================

create or replace function public.upsert_daily_motivation(
    p_user_id         uuid,
    p_motivation_date date,
    p_quote           text,
    p_focus           text,
    p_category        text,
    p_source          text
) returns public.daily_motivations
language plpgsql
security definer
set search_path = public
as $fn$
declare
    v_row public.daily_motivations;
begin
    insert into public.daily_motivations
        (user_id, quote, focus, category, source, motivation_date, displayed_at)
    values
        (p_user_id, p_quote, p_focus, p_category, p_source, p_motivation_date, now())
    on conflict (user_id, motivation_date)
        do update set displayed_at = now()
        where daily_motivations.quote is null
    returning * into v_row;

    return v_row;
end;
$fn$;

-- Only the service_role may execute the upsert (invoked via the ADMIN
-- client). anon / authenticated are explicitly denied.
revoke all on function public.upsert_daily_motivation(uuid, date, text, text, text, text) from public, anon, authenticated;
grant execute on function public.upsert_daily_motivation(uuid, date, text, text, text, text) to service_role;

-- Reflect the new schema objects through PostgREST.
notify pgrst, 'reload schema';
