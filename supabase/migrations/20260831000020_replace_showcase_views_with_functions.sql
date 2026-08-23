-- ============================================================
-- FIGHT ZONE — Replace showcase VIEWS with SECURITY DEFINER RPCs
-- ============================================================
-- Supabase Advisor flags non-security_invoker views as critical:
-- views bypass the querying user's RLS with no way to pin scope.
--
-- The underlying problem remains real: public pages need author /
-- coach display identity while `profiles` RLS is deliberately strict
-- (own-or-staff, PII columns). Column projection must therefore run
-- server-side under controlled semantics.
--
-- Resolution: drop the four views and expose equivalent SECURITY
-- DEFINER FUNCTIONS (same pattern as the pre-existing
-- `get_public_coach()`), with:
--   * pinned `search_path` (search-path hijack protection)
--   * explicit EXECUTE grants (PUBLIC revoked by default-grant)
--   * hard LIMIT caps inside the function body
--   * per-call statement_timeout
-- ============================================================

DROP VIEW IF EXISTS public.approved_reviews_public;
DROP VIEW IF EXISTS public.published_transformations_public;
DROP VIEW IF EXISTS public.available_coaches_public;
DROP VIEW IF EXISTS public.coaches_directory_authenticated;

-- ------------------------------------------------------------
-- Tighten direct Data-API access: anonymous callers must go
-- through the RPCs below. Authenticated keeps SELECT (owners read
-- their own pending/rejected reviews via RLS).
-- ------------------------------------------------------------
REVOKE SELECT ON public.reviews FROM anon;
REVOKE SELECT ON public.transformation_stories FROM anon;

-- ------------------------------------------------------------
-- Approved reviews (public showcase)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_approved_reviews(
    p_limit      integer DEFAULT 20,
    p_featured   boolean DEFAULT false,
    p_coach_id   uuid    DEFAULT NULL,
    p_session_id uuid    DEFAULT NULL
)
RETURNS TABLE (
    id            uuid,
    member_id     uuid,
    coach_id      uuid,
    session_id    uuid,
    target_type   public.review_target_type,
    rating        integer,
    title         text,
    content       text,
    status        public.review_status,
    is_featured   boolean,
    created_at    timestamptz,
    updated_at    timestamptz,
    author_name   text,
    author_avatar text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
STABLE
AS $$
    SELECT
        r.id, r.member_id, r.coach_id, r.session_id, r.target_type,
        r.rating, r.title, r.content, r.status, r.is_featured,
        r.created_at, r.updated_at,
        p.full_name  AS author_name,
        p.avatar_url AS author_avatar
    FROM public.reviews r
    LEFT JOIN public.member_profiles mp ON mp.id = r.member_id
    LEFT JOIN public.profiles p         ON p.id  = mp.id
    WHERE r.status = 'APPROVED'
      AND (p_featured   = false OR r.is_featured = true)
      AND (p_coach_id   IS NULL  OR r.coach_id   = p_coach_id)
      AND (p_session_id IS NULL  OR r.session_id = p_session_id)
    ORDER BY r.is_featured DESC, r.created_at DESC
    LIMIT LEAST(COALESCE(p_limit, 20), 50);
$$;

REVOKE ALL ON FUNCTION public.get_public_approved_reviews(integer, boolean, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_approved_reviews(integer, boolean, uuid, uuid) TO anon, authenticated;

-- ------------------------------------------------------------
-- Published transformation stories (public showcase)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_transformations(
    p_limit    integer DEFAULT 100,
    p_featured boolean DEFAULT false
)
RETURNS TABLE (
    id               uuid,
    member_id        uuid,
    title            text,
    story            text,
    before_image_url text,
    after_image_url  text,
    starting_weight  numeric,
    current_weight   numeric,
    timeframe_months integer,
    discipline       text,
    is_featured      boolean,
    is_published     boolean,
    created_at       timestamptz,
    updated_at       timestamptz,
    author_name      text,
    author_avatar    text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
STABLE
AS $$
    SELECT
        t.id, t.member_id, t.title, t.story,
        t.before_image_url, t.after_image_url,
        t.starting_weight, t.current_weight, t.timeframe_months,
        t.discipline, t.is_featured, t.is_published,
        t.created_at, t.updated_at,
        p.full_name  AS author_name,
        p.avatar_url AS author_avatar
    FROM public.transformation_stories t
    LEFT JOIN public.member_profiles mp ON mp.id = t.member_id
    LEFT JOIN public.profiles p         ON p.id  = mp.id
    WHERE t.is_published = true
      AND (p_featured = false OR t.is_featured = true)
    ORDER BY t.is_featured DESC, t.created_at DESC
    LIMIT LEAST(COALESCE(p_limit, 100), 100);
$$;

REVOKE ALL ON FUNCTION public.get_public_transformations(integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_transformations(integer, boolean) TO anon, authenticated;

-- ------------------------------------------------------------
-- Available coaches (public directory + detail lookups)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_available_coaches(
    p_coach_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id               uuid,
    experience_years integer,
    specialization   text,
    biography        text,
    is_available     boolean,
    created_at       timestamptz,
    updated_at       timestamptz,
    full_name        text,
    avatar_url       text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
STABLE
AS $$
    SELECT
        cp.id, cp.experience_years, cp.specialization, cp.biography,
        cp.is_available, cp.created_at, cp.updated_at,
        p.full_name, p.avatar_url
    FROM public.coach_profiles cp
    JOIN public.profiles p ON p.id = cp.id
    WHERE cp.is_available = true
      AND p.is_active = true
      AND (p_coach_id IS NULL OR cp.id = p_coach_id)
    ORDER BY cp.experience_years DESC;
$$;

REVOKE ALL ON FUNCTION public.get_available_coaches(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_coaches(uuid) TO anon, authenticated;

-- ------------------------------------------------------------
-- Coach display directory (AUTHENTICATED ONLY)
-- Members resolve booked-coach names here; availability filter is
-- intentionally absent so past bookings stay labelled.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_coaches_directory(
    p_coach_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    id               uuid,
    experience_years integer,
    specialization   text,
    biography        text,
    is_available     boolean,
    created_at       timestamptz,
    updated_at       timestamptz,
    full_name        text,
    avatar_url       text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
STABLE
AS $$
    SELECT
        cp.id, cp.experience_years, cp.specialization, cp.biography,
        cp.is_available, cp.created_at, cp.updated_at,
        p.full_name, p.avatar_url
    FROM public.coach_profiles cp
    JOIN public.profiles p ON p.id = cp.id
    WHERE p.is_active = true
      AND (p_coach_ids IS NULL OR cp.id = ANY(p_coach_ids))
    ORDER BY cp.experience_years DESC;
$$;

REVOKE ALL ON FUNCTION public.get_coaches_directory(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coaches_directory(uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
