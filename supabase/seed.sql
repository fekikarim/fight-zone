-- ============================================================
-- FIGHT ZONE — Seed data (LOCAL DEVELOPMENT ONLY)
-- Run with: supabase db reset --local
-- Never pushed to remote; remote content is managed via the admin UI.
-- ============================================================

-- ------------------------------------------------------------
-- Roles
-- ------------------------------------------------------------
insert into public.roles (name, description)
values
    ('ADMIN',  'Platform administrator with full access'),
    ('COACH',  'Coach with management access to Fight Zone'),
    ('MEMBER', 'Registered Fight Zone member')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- Demo auth users (passwords: Coach-1234 / Member-1234)
-- The on_auth_user_created trigger creates profiles + MEMBER role.
-- ------------------------------------------------------------
insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
)
values
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        'authenticated', 'authenticated', 'coach@fightzone.example',
        crypt('Coach-1234', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Seif Dridi"}',
        now(), now()
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000002',
        'authenticated', 'authenticated', 'member@fightzone.example',
        crypt('Member-1234', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Karim Feki"}',
        now(), now()
    )
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Roles: coach is ADMIN + COACH, member stays MEMBER
-- ------------------------------------------------------------
insert into public.user_role_assignments (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r
  on ((p.email = 'coach@fightzone.example' and r.name in ('ADMIN', 'COACH'))
      or (p.email = 'member@fightzone.example' and r.name = 'MEMBER'))
on conflict (user_id, role_id) do nothing;

-- ------------------------------------------------------------
-- Coach profile
-- ------------------------------------------------------------
insert into public.coach_profiles (id, experience_years, specialization, biography, is_available)
select p.id, 15, 'Boxing · Kickboxing · Fitness', 'Coach Seif Dridi is a professional boxing coach and athlete. From competition rings to the Fight Zone gym, he has spent over a decade shaping champions — building technical foundations, discipline, and confidence in every boxer he trains.', true
from public.profiles p
where p.email = 'coach@fightzone.example'
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Member profile
-- ------------------------------------------------------------
insert into public.member_profiles (id, date_of_birth, gender, address, skill_level, weight, height, bio, is_verified)
select p.id, '1994-06-12', 'MALE', 'Tunis, Tunisia', 'INTERMEDIATE', 72.0, 178.0, 'Dedicated to improving technique and conditioning.', true
from public.profiles p
where p.email = 'member@fightzone.example'
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Sessions (service catalog)
-- ------------------------------------------------------------
insert into public.sessions (coach_id, title, description, type, duration_min, price, is_active)
select c.id, s.title, s.description, s.type, s.duration_min, s.price, true
from public.coach_profiles c
cross join (values
    ('Private Boxing Coaching', 'One-on-one boxing technique, pad work, footwork and ring IQ.', 'PERSONAL'::public.session_type, 60, 60.00),
    ('Group Boxing Training', 'High-energy small group boxing sessions for all levels.', 'TECHNICAL', 60, 25.00),
    ('Kickboxing Mastery', 'Kickboxing fundamentals, combinations and sparring.', 'COMBO', 60, 35.00),
    ('Fitness & Conditioning', 'Boxing-inspired conditioning, strength and stamina building.', 'PHYSICAL', 45, 20.00),
    ('Strategy & Fight Tactics', 'Fight analysis, game planning and mental preparation.', 'STRATEGY', 60, 50.00),
    ('Kids Boxing (6-12)', 'Fun, safe and disciplined introduction to boxing for kids.', 'TECHNICAL', 45, 15.00),
    ('Women''s Boxing', 'Confidence, technique and fitness in a supportive environment.', 'TECHNICAL', 60, 20.00)
) as s(title, description, type, duration_min, price)
on conflict do nothing;

-- ------------------------------------------------------------
-- Achievements (palmares)
-- ------------------------------------------------------------
insert into public.achievements (coach_id, title, description, type, date, image_url)
select c.id, a.title, a.description, a.type, a.date, a.image_url
from public.coach_profiles c
cross join (values
    ('National Boxing Champion', 'Multiple national titles across amateur and professional ranks.', 'TITLE'::public.achievement_type, '2023-06-10'::date, '/components/boxing-trophy-graphic-design-900x900.jpg'),
    ('African Boxing Championship Gold', 'Gold medal at the continental championship.', 'MEDAL', '2022-11-05', '/components/hand-holding-medal-720x720.jpg'),
    ('World Ranking Top 10', 'Ranked among the top 10 in the international federation standings.', 'RANKING', '2024-03-15', NULL),
    ('Excellence in Coaching Certificate', 'Certified excellence in high-performance boxing coaching.', 'CERTIFICATE', '2021-09-20', NULL),
    ('Regional Championship Trophy', 'Regional champion trophy, undefeated run.', 'TROPHY', '2020-12-01', '/components/flat-sport-medals-illustration-2000x2000.jpg'),
    ('Coach of the Year', 'Recognised for outstanding athlete development and results.', 'TITLE', '2024-01-28', NULL)
) as a(title, description, type, date, image_url)
on conflict do nothing;

-- ------------------------------------------------------------
-- Events (calendar)
-- ------------------------------------------------------------
insert into public.events (title, description, start_at, end_at, location, event_type, is_public, created_by)
select e.title, e.description, e.start_at, e.end_at, e.location, e.event_type, true, c.id
from public.profiles c
cross join (values
    ('Fight Zone Open Sparring Night', 'Open sparring session for all registered members. Bring your gloves.', '2026-09-05 18:00:00+00'::timestamptz, '2026-09-05 20:00:00+00'::timestamptz, 'Fight Zone Gym, Tunis', 'TRAINING'::public.event_type),
    ('Boxing Fundamentals Workshop', 'Intensive workshop covering stance, guard, and the jab-cross.', '2026-09-19 10:00:00+00', '2026-09-19 13:00:00+00', 'Fight Zone Gym, Tunis', 'WORKSHOP'),
    ('National Amateur Championship', 'Amateur boxing championship featuring Fight Zone athletes.', '2026-10-03 09:00:00+00', '2026-10-05 18:00:00+00', 'Sports City Arena, Tunis', 'COMPETITION'),
    ('Fight Mindset Seminar', 'Mental preparation and fight psychology seminar.', '2026-10-17 16:00:00+00', '2026-10-17 18:30:00+00', 'Fight Zone Gym, Tunis', 'SEMINAR')
) as e(title, description, start_at, end_at, location, event_type)
on conflict do nothing;

-- ------------------------------------------------------------
-- News (blog)
-- ------------------------------------------------------------
insert into public.news (title, slug, content, cover_image_url, is_published, published_at, created_by)
select n.title, n.slug, n.content, n.cover_image_url, true, n.published_at, c.id
from public.profiles c
cross join (values
    ('Why Footwork Wins Fights', 'why-footwork-wins-fights', 'Footwork is the foundation of every great boxer. In this article Coach Seif breaks down the fundamentals of balance, pivoting and ring control — and how to drill them at home.', '/components/bodybuilding-three-man-workouting-gym-flat-3556x2000.jpg', '2026-07-01 09:00:00+00'::timestamptz),
    ('Preparing for Your First Fight', 'preparing-for-your-first-fight', 'Stepping into the ring for the first time is intimidating. Here is the complete Fight Zone guide to preparation — physical, technical and mental.', '/components/young-man-exercising-fitness-gym-room-with-sport-equipment-workouts-guy-training-lifting-dumbbell-sitting-bench-2000x1667.png', '2026-07-15 09:00:00+00'),
    ('The Fight Zone Method', 'the-fight-zone-method', 'Discipline, technique, conditioning and respect. Discover the training philosophy that shapes every athlete who walks through our doors.', '/components/coach-seif-dridi-illustration-at-the-gym-1024x1037.jpeg', '2026-07-28 09:00:00+00')
) as n(title, slug, content, cover_image_url, published_at)
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Media (gallery)
-- ------------------------------------------------------------
insert into public.media (coach_id, url, type, title, description, is_public)
select c.id, m.url, m.type, m.title, m.description, true
from public.coach_profiles c
cross join (values
    ('/components/bodybuilding-three-man-workouting-gym-flat-3556x2000.jpg', 'IMAGE'::public.media_type, 'Gym Sessions', 'Training together builds more than strength.'),
    ('/components/boxing-trophy-graphic-design-900x900.jpg', 'IMAGE', 'Palmares', 'The trophies that fuel the mission.'),
    ('/components/hand-holding-medal-720x720.jpg', 'IMAGE', 'Medal Moment', 'Hard work, rewarded.'),
    ('/components/fit-cartoon-women-training-4096x4096.jpg', 'IMAGE', 'Women''s Boxing', 'Confidence and technique for everyone.'),
    ('/components/fit-cartoon-women-lifting-training-4096x4096.jpg', 'IMAGE', 'Strength & Conditioning', 'Building power and stamina.'),
    ('/components/sports-physiotherapy-illustration-2000x2000.jpg', 'IMAGE', 'Recovery & Care', 'Recovery is part of the training plan.'),
    ('/components/man-exercising-chest-on-the-gym-5626x3750.jpg', 'IMAGE', 'Training Camp', 'Inside the Fight Zone training camp.'),
    ('/components/young-man-exercising-fitness-gym-room-with-sport-equipment-workouts-guy-training-lifting-dumbbell-sitting-bench-2000x1667.png', 'IMAGE', 'Fitness Training', 'Building a strong body, one session at a time.'),
    ('/components/flat-sport-medals-illustration-2000x2000.jpg', 'IMAGE', 'Achievements', 'A collection of victories.'),
    ('/components/coach-seif-dridi-illustration-pdp-1024x1024.jpeg', 'IMAGE', 'Coach Seif Dridi', 'Founder & head coach at Fight Zone.')
) as m(url, type, title, description)
on conflict do nothing;
