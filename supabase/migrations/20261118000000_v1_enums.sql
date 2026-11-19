-- ============================================================
-- Fight Zone V1 — enum additions (separate file: Postgres cannot use a
-- value added by ALTER TYPE ... ADD VALUE inside the same transaction).
-- Additive only; safe to apply on a live database.
-- ============================================================

-- Event lifecycle (publication) — separate from registration/payment/attendance.
do $$ begin
    create type public.event_status as enum ('DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED');
exception when duplicate_object then null; end $$;

-- Registration lifecycle.
do $$ begin
    create type public.registration_status as enum ('PENDING', 'CONFIRMED', 'WAITLISTED', 'REJECTED', 'CANCELLED');
exception when duplicate_object then null; end $$;

-- Attendance lifecycle (Seif-recorded only).
do $$ begin
    create type public.attendance_status as enum ('UNMARKED', 'ATTENDED', 'NO_SHOW');
exception when duplicate_object then null; end $$;

-- Payment-proof review lifecycle.
do $$ begin
    create type public.payment_submission_status as enum ('SUBMITTED', 'CONFIRMED', 'REJECTED');
exception when duplicate_object then null; end $$;

-- Reward lifecycle.
do $$ begin
    create type public.reward_status as enum ('PENDING_APPROVAL', 'AVAILABLE', 'REDEEMED', 'REVOKED', 'EXPIRED');
exception when duplicate_object then null; end $$;

-- Payment lifecycle on a registration (existing enum: UNPAID, PAID, NOT_REQUIRED).
alter type public.event_payment_status add value if not exists 'PROOF_SUBMITTED';
alter type public.event_payment_status add value if not exists 'REJECTED';
alter type public.event_payment_status add value if not exists 'WAIVED';

-- Notification categories.
alter type public.notification_type add value if not exists 'PAYMENT';
alter type public.notification_type add value if not exists 'BADGE';
alter type public.notification_type add value if not exists 'REWARD';
