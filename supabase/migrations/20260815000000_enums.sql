-- ============================================================
-- FIGHT ZONE — Migration 0001: Domain enumerations
-- ============================================================

create type public.user_role as enum (
    'ADMIN',
    'COACH',
    'MEMBER'
);

create type public.gender as enum (
    'MALE',
    'FEMALE',
    'OTHER'
);

create type public.skill_level as enum (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'PROFESSIONAL'
);

create type public.achievement_type as enum (
    'TITLE',
    'TROPHY',
    'MEDAL',
    'CERTIFICATE',
    'RANKING'
);

create type public.media_type as enum (
    'IMAGE',
    'VIDEO',
    'DOCUMENT'
);

create type public.event_type as enum (
    'TRAINING',
    'WORKSHOP',
    'COMPETITION',
    'SEMINAR',
    'OTHER'
);

create type public.session_type as enum (
    'PERSONAL',
    'TECHNICAL',
    'PHYSICAL',
    'STRATEGY',
    'COMBO'
);

create type public.booking_status as enum (
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW'
);

create type public.payment_status as enum (
    'PENDING',
    'PAID',
    'FAILED',
    'REFUNDED'
);

create type public.payment_method as enum (
    'CASH',
    'BANK_TRANSFER',
    'ONLINE',
    'OTHER'
);

create type public.participation_status as enum (
    'JOINED',
    'INTERESTED',
    'CANCELLED'
);

create type public.message_status as enum (
    'UNREAD',
    'READ',
    'REPLIED'
);

create type public.notification_type as enum (
    'BOOKING',
    'SESSION',
    'EVENT',
    'MESSAGE',
    'SYSTEM'
);
