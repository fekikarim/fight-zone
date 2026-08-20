-- ============================================================
-- FIGHT ZONE — Reviews & Transformation Stories (Prompt #11)
-- ============================================================

-- Enums
CREATE TYPE public.review_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.review_target_type AS ENUM ('COACH', 'SESSION', 'CLUB');

-- reviews
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.member_profiles (id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.coach_profiles (id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.sessions (id) ON DELETE SET NULL,
    target_type public.review_target_type NOT NULL DEFAULT 'CLUB',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status public.review_status NOT NULL DEFAULT 'PENDING',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- transformation_stories
CREATE TABLE public.transformation_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.member_profiles (id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    story TEXT NOT NULL,
    before_image_url TEXT NOT NULL,
    after_image_url TEXT NOT NULL,
    starting_weight NUMERIC(5, 2),
    current_weight NUMERIC(5, 2),
    timeframe_months INTEGER CHECK (timeframe_months IS NULL OR timeframe_months > 0),
    discipline TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX reviews_status_idx ON public.reviews (status, is_featured, created_at DESC);
CREATE INDEX reviews_member_idx ON public.reviews (member_id);
CREATE INDEX reviews_coach_idx ON public.reviews (coach_id) WHERE coach_id IS NOT NULL;
CREATE INDEX reviews_session_idx ON public.reviews (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX transformations_published_idx ON public.transformation_stories (is_published, is_featured, created_at DESC);

-- Triggers
CREATE TRIGGER set_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_transformations_updated_at BEFORE UPDATE ON public.transformation_stories FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transformation_stories ENABLE ROW LEVEL SECURITY;

-- reviews: public sees approved, owner sees own, staff sees all
CREATE POLICY "reviews_public_read_approved" ON public.reviews
  FOR SELECT USING (status = 'APPROVED' OR member_id = auth.uid() OR public.is_admin_or_coach());
CREATE POLICY "reviews_owner_insert" ON public.reviews
  FOR INSERT WITH CHECK (member_id = auth.uid() OR public.is_admin());
CREATE POLICY "reviews_owner_update" ON public.reviews
  FOR UPDATE USING (member_id = auth.uid() OR public.is_admin())
  WITH CHECK (member_id = auth.uid() OR public.is_admin());
CREATE POLICY "reviews_staff_manage" ON public.reviews
  FOR ALL USING (public.is_admin_or_coach()) WITH CHECK (public.is_admin_or_coach());

-- transformation_stories: public sees published, staff sees all
CREATE POLICY "transformations_public_read_published" ON public.transformation_stories
  FOR SELECT USING (is_published = true OR public.is_admin_or_coach());
CREATE POLICY "transformations_staff_manage" ON public.transformation_stories
  FOR ALL USING (public.is_admin_or_coach()) WITH CHECK (public.is_admin_or_coach());

-- Seed sample approved reviews
-- Note: These use real member profile IDs that exist after deployment.
-- The seed data is commented out by default; uncomment after first member profiles are created.
-- INSERT INTO public.reviews (member_id, target_type, rating, title, content, status, is_featured)
-- VALUES
--   ((SELECT id FROM public.member_profiles LIMIT 1), 'CLUB', 5, 'Life-changing experience', 'Coach Seif and the Fight Zone team completely transformed my approach to fitness. The discipline, the community, the results — everything exceeded my expectations.', 'APPROVED', true),
--   ((SELECT id FROM public.member_profiles LIMIT 1), 'CLUB', 5, 'Best boxing gym in Tunisia', 'The coaching quality is world-class. Every session is structured, challenging, and genuinely fun. I have never stuck with a gym this long.', 'APPROVED', true);

-- Seed transformation stories (no FK dependency on members)
INSERT INTO public.transformation_stories (title, story, before_image_url, after_image_url, starting_weight, current_weight, timeframe_months, discipline, is_featured, is_published)
VALUES
  ('From Beginner to Amateur Boxer in 8 Months', 'Coach Seif pushed me past my mental limits. The discipline and conditioning changed my entire life. I went from zero boxing experience to competing in my first amateur bout.', '/images/transformations/before-1.jpg', '/images/transformations/after-1.jpg', 94.50, 78.00, 8, 'English Boxing', true, true),
  ('Fitness Transformation & High Energy', 'Fight Zone gave me the structure and accountability I could never find in regular gyms. The combination of boxing drills and strength training delivered incredible results.', '/images/transformations/before-2.jpg', '/images/transformations/after-2.jpg', 82.00, 71.50, 6, 'Fitness & Conditioning', true, true);
