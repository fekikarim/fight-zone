-- ============================================================
-- FIGHT ZONE — Migration 0015: Coaching Services metadata
-- ============================================================
-- Prompt #8: Adds discipline and level columns to sessions
-- for production-grade service filtering and discovery.
--
-- Additive only — no existing columns or constraints modified.
-- ============================================================

-- Add discipline (text, nullable) and level (skill_level enum, nullable)
-- to sessions.  Nullable = backward-compatible with existing seed data.
alter table public.sessions
  add column discipline text,
  add column level public.skill_level;

-- Indexes for filtering active sessions by discipline and level.
-- Partial indexes (WHERE is_active = true) keep them small and relevant.
create index sessions_discipline_idx
  on public.sessions (discipline)
  where is_active = true;

create index sessions_level_idx
  on public.sessions (level)
  where is_active = true;

create index sessions_discipline_level_idx
  on public.sessions (discipline, level)
  where is_active = true;

-- Composite index for admin session listing (all sessions, ordered)
create index sessions_active_coach_idx
  on public.sessions (is_active, coach_id);

-- Backfill existing seed data with correct discipline and level.
-- These UPDATEs are idempotent (safe to re-run).

-- Private Boxing Coaching
update public.sessions
set discipline = 'English Boxing', level = 'BEGINNER'
where title = 'Private Boxing Coaching';

-- Group Boxing Training
update public.sessions
set discipline = 'English Boxing', level = 'INTERMEDIATE'
where title = 'Group Boxing Training';

-- Kickboxing Mastery
update public.sessions
set discipline = 'Kick Boxing', level = 'INTERMEDIATE'
where title = 'Kickboxing Mastery';

-- Fitness & Conditioning
update public.sessions
set discipline = 'Fitness & Strength Training', level = 'BEGINNER'
where title = 'Fitness & Conditioning';

-- Strategy & Fight Tactics
update public.sessions
set discipline = 'English Boxing', level = 'ADVANCED'
where title = 'Strategy & Fight Tactics';

-- Kids Boxing (6-12)
update public.sessions
set discipline = 'English Boxing', level = 'BEGINNER'
where title = 'Kids Boxing (6-12)';

-- Women's Boxing
update public.sessions
set discipline = 'English Boxing', level = 'BEGINNER'
where title = 'Women''s Boxing';
