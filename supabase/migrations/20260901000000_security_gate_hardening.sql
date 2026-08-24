-- ============================================================
-- FIGHT ZONE — Prompt #13 Security Gate: Corrective Hardening
-- ============================================================
-- STATUS: UNPUSHED — requires explicit project-owner approval.
--
-- Findings addressed (all confirmed against the REMOTE schema):
--
-- F1 (P0) reviews_owner_insert / reviews_owner_update allow a MEMBER
--   (valid JWT, direct Data API call) to write status='APPROVED' and
--   is_featured=true on their own reviews. RLS is row-level only;
--   moderation columns were never constrained.
--   -> Guard trigger: non-staff inserts must be PENDING/unfeatured;
--      non-staff updates cannot alter moderation or ownership fields.
--
-- F2 (P0) transformations_member_insert allows is_published=true on
--   INSERT by a member -> immediate public showcase forgery via
--   get_public_transformations().
--   -> Guard trigger: non-staff inserts must be unpublished/unfeatured.
--
-- F3 (P1) profiles_update_own_or_staff lets a member PATCH their own
--   email / is_active / avatar_url through the Data API. The
--   application never writes these fields; a forged avatar_url would
--   even surface publicly through review author projections.
--   -> Guard trigger: non-staff self-updates cannot change these.
--
-- F4 (P2) member_subscriptions_member_cancel constrains status and
--   auto_renew but leaves plan_id/starts_at/ends_at/remaining_credits/
--   member_id mutable during a member-initiated cancellation.
--   -> Guard trigger: member cancellations must change nothing else.
--
-- F5 (P2) service_role lacks DML privileges on most base tables while
--   holding them on newer ones (operational consistency risk for any
--   future server-side/admin tooling).
--   -> Standard Supabase baseline grant.
--
-- F6 (P2 hygiene) anon/authenticated hold inert but unnecessary
--   TRUNCATE/REFERENCES privileges; PUBLIC holds EXECUTE on helper
--   functions (get_public_coach included).
--   -> Revoke; re-grant EXECUTE explicitly to anon+authenticated
--      (+service_role) so RLS policy expressions keep working.
--
-- All operations are idempotent. No historical migration is edited.
-- ============================================================

-- ------------------------------------------------------------
-- Shared predicate helpers (inline in triggers to keep them atomic)
-- Staff = ADMIN or COACH per existing is_admin_or_coach().
-- service_role / CLI sessions have auth.uid() IS NULL and are treated
-- as trusted server contexts (they bypass RLS by design).
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- F1a: reviews INSERT guard
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_reviews_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_coach() THEN
        IF NEW.status IS DISTINCT FROM 'PENDING' THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Reviews enter moderation as PENDING.';
        END IF;
        IF NEW.is_featured IS NOT false THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Only staff can feature reviews.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_guard_insert ON public.reviews;
CREATE TRIGGER reviews_guard_insert
    BEFORE INSERT ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.guard_reviews_insert();

-- ------------------------------------------------------------
-- F1b: reviews UPDATE guard (moderation + ownership immutable
-- for non-staff owners)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_reviews_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_coach() THEN
        IF NEW.status IS DISTINCT FROM OLD.status
           OR NEW.is_featured IS DISTINCT FROM OLD.is_featured THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Review moderation state is staff-managed.';
        END IF;
        IF NEW.member_id IS DISTINCT FROM OLD.member_id THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Review ownership is immutable.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_guard_update ON public.reviews;
CREATE TRIGGER reviews_guard_update
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.guard_reviews_update();

-- ------------------------------------------------------------
-- F2: transformation_stories INSERT guard
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_transformations_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_coach() THEN
        IF NEW.is_published IS NOT false THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Stories are submitted unpublished for moderation.';
        END IF;
        IF NEW.is_featured IS NOT false THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Only staff can feature stories.';
        END IF;
        IF NEW.member_id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'You can only submit your own story.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transformations_guard_insert ON public.transformation_stories;
CREATE TRIGGER transformations_guard_insert
    BEFORE INSERT ON public.transformation_stories
    FOR EACH ROW EXECUTE FUNCTION public.guard_transformations_insert();

-- ------------------------------------------------------------
-- F3: profiles self-update guard (email / activation / avatar are
-- staff-managed fields)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profiles_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND NOT public.is_admin_or_coach()
       AND OLD.id = auth.uid() THEN
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Email changes must go through account settings.';
        END IF;
        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Account activation is managed by staff.';
        END IF;
        IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Avatar changes must go through account settings.';
        END IF;
    END IF;
    -- Ownership immutability applies to everyone except trusted contexts.
    IF auth.uid() IS NOT NULL
       AND NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION USING
            errcode = '42501',
            message = 'Profile ownership is immutable.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_self_update ON public.profiles;
CREATE TRIGGER profiles_guard_self_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_self_update();

-- ------------------------------------------------------------
-- F4: member_subscriptions member-cancellation hygiene
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_subscription_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND NOT public.is_admin()
       AND NEW.member_id = auth.uid() THEN
        IF NEW.member_id  IS DISTINCT FROM OLD.member_id
           OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
           OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
           OR NEW.ends_at   IS DISTINCT FROM OLD.ends_at
           OR NEW.remaining_credits IS DISTINCT FROM OLD.remaining_credits THEN
            RAISE EXCEPTION USING
                errcode = '42501',
                message = 'Cancellations cannot modify subscription terms.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_guard_cancel ON public.member_subscriptions;
CREATE TRIGGER subscriptions_guard_cancel
    BEFORE UPDATE ON public.member_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.guard_subscription_cancel();

-- ------------------------------------------------------------
-- F7 (P0, operational): the remote `roles` table is EMPTY — the three
-- canonical roles existed only in the local-development seed.sql.
-- Consequence on remote: is_admin()/is_admin_or_coach()/has_role()
-- evaluate FALSE for every user, all staff RLS policies and
-- requireRole() gates are inert, and handle_new_user() silently
-- assigns no MEMBER role at signup. The security model cannot function.
--
-- Seed the canonical roles (idempotent) and backfill the MEMBER role
-- for users who signed up while the table was empty. ADMIN/COACH
-- assignment remains an explicit owner action (never self-service).
-- ------------------------------------------------------------
INSERT INTO public.roles (name, description)
VALUES
    ('ADMIN'::public.user_role,  'Platform administrator with full access'),
    ('COACH'::public.user_role,  'Coach with management access to Fight Zone'),
    ('MEMBER'::public.user_role, 'Registered Fight Zone member')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
CROSS JOIN public.roles r
WHERE r.name = 'MEMBER'::public.user_role
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- F5: service_role DML baseline across all public tables
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

-- ------------------------------------------------------------
-- F6: privilege hygiene
-- ------------------------------------------------------------
REVOKE TRUNCATE, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;

REVOKE ALL ON FUNCTION public.get_public_coach() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_coach() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin_or_coach() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_coach() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
