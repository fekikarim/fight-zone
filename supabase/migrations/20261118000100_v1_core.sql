-- ============================================================
-- Fight Zone V1 — core primitives
--   * audit_log            (sensitive admin decisions; staff-readable, no client writes)
--   * notifications dedupe (idempotent, recipient-scoped)
--   * platform owner       (single-coach model: Seif)
--   * site/payment settings (Seif-managed; nothing invented)
--   * message_templates    (automated Fight Zone messages, editable by Seif)
-- All helper functions are SECURITY DEFINER with a pinned search_path and
-- are NOT executable by anon/authenticated unless explicitly granted.
-- ============================================================

-- ------------------------------------------------------------
-- Audit log
-- ------------------------------------------------------------
create table if not exists public.audit_log (
    id          bigint generated always as identity primary key,
    actor_id    uuid references public.profiles(id) on delete set null,
    action      text not null check (char_length(action) between 3 and 80),
    target_type text not null check (char_length(target_type) between 2 and 40),
    target_id   uuid,
    metadata    jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_target_idx on public.audit_log (target_type, target_id);
alter table public.audit_log enable row level security;
drop policy if exists audit_log_select_staff on public.audit_log;
create policy audit_log_select_staff on public.audit_log
    for select to authenticated using (public.is_admin_or_coach());
revoke insert, update, delete on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create or replace function public.log_audit(
    p_action text, p_target_type text, p_target_id uuid, p_metadata jsonb default '{}'::jsonb
) returns void
language sql security definer set search_path = public as $$
    insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
    values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
$$;
revoke all on function public.log_audit(text, text, uuid, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Notifications: idempotency key
-- ------------------------------------------------------------
alter table public.notifications add column if not exists dedupe_key text;
create unique index if not exists notifications_user_dedupe_uidx
    on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

-- Idempotent notification insert (retries with the same key are no-ops).
create or replace function public.notify_user(
    p_user_id uuid, p_type public.notification_type, p_title text, p_content text,
    p_resource_type text, p_resource_id uuid, p_dedupe_key text
) returns void
language plpgsql security definer set search_path = public as $$
begin
    if p_user_id is null then return; end if;
    insert into public.notifications (user_id, type, title, content, resource_type, resource_id, dedupe_key)
    values (p_user_id, p_type, left(p_title, 200), left(p_content, 500), p_resource_type, p_resource_id, p_dedupe_key)
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end;
$$;
revoke all on function public.notify_user(uuid, public.notification_type, text, text, text, uuid, text)
    from public, anon, authenticated;

-- ------------------------------------------------------------
-- Platform owner (single-coach model)
-- ------------------------------------------------------------
-- Seif is the platform's only admin/coach. Prefer an active ADMIN that has a
-- coach profile; otherwise the earliest-assigned active ADMIN.
create or replace function public.platform_owner_id()
returns uuid
language sql stable security definer set search_path = public as $$
    select ura.user_id
      from public.user_role_assignments ura
      join public.roles r on r.id = ura.role_id and r.name = 'ADMIN'
      join public.profiles p on p.id = ura.user_id and p.is_active
      left join public.coach_profiles cp on cp.id = ura.user_id
     order by (cp.id is not null) desc, ura.assigned_at asc
     limit 1;
$$;
revoke all on function public.platform_owner_id() from public, anon;
grant execute on function public.platform_owner_id() to authenticated;

-- ------------------------------------------------------------
-- Site settings (public) and payment settings (members only)
-- ------------------------------------------------------------
create table if not exists public.site_settings (
    id             smallint primary key default 1 check (id = 1),
    contact_email  text check (contact_email is null or char_length(contact_email) <= 254),
    contact_phone  text check (contact_phone is null or char_length(contact_phone) <= 40),
    whatsapp       text check (whatsapp is null or char_length(whatsapp) <= 40),
    address        text check (address is null or char_length(address) <= 300),
    working_hours  text check (working_hours is null or char_length(working_hours) <= 500),
    social_links   jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
    timezone       text not null default 'Africa/Tunis',
    updated_at     timestamptz not null default now(),
    updated_by     uuid references public.profiles(id) on delete set null
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;
drop policy if exists site_settings_select_all on public.site_settings;
create policy site_settings_select_all on public.site_settings for select using (true);
drop policy if exists site_settings_update_staff on public.site_settings;
create policy site_settings_update_staff on public.site_settings
    for update to authenticated using (public.is_admin_or_coach()) with check (public.is_admin_or_coach());
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

create table if not exists public.payment_settings (
    id                     smallint primary key default 1 check (id = 1),
    bank_instructions      text check (bank_instructions is null or char_length(bank_instructions) <= 2000),
    in_person_instructions text check (in_person_instructions is null or char_length(in_person_instructions) <= 1000),
    proof_resubmission_allowed boolean not null default true,
    updated_at             timestamptz not null default now(),
    updated_by             uuid references public.profiles(id) on delete set null
);
insert into public.payment_settings (id) values (1) on conflict (id) do nothing;
alter table public.payment_settings enable row level security;
drop policy if exists payment_settings_select_auth on public.payment_settings;
create policy payment_settings_select_auth on public.payment_settings
    for select to authenticated using (true);
drop policy if exists payment_settings_update_staff on public.payment_settings;
create policy payment_settings_update_staff on public.payment_settings
    for update to authenticated using (public.is_admin_or_coach()) with check (public.is_admin_or_coach());
revoke all on public.payment_settings from anon;
grant select, update on public.payment_settings to authenticated;

-- ------------------------------------------------------------
-- Automated message templates
-- ------------------------------------------------------------
create table if not exists public.message_templates (
    key          text primary key check (key ~ '^[a-z_]{3,60}$'),
    label        text not null,
    body         text not null check (char_length(body) between 1 and 2000),
    is_enabled   boolean not null default true,
    -- Essential transactional messages cannot be disabled.
    is_essential boolean not null default false,
    updated_at   timestamptz not null default now(),
    updated_by   uuid references public.profiles(id) on delete set null,
    constraint message_templates_essential_enabled check (not is_essential or is_enabled)
);
alter table public.message_templates enable row level security;
drop policy if exists message_templates_staff on public.message_templates;
create policy message_templates_staff on public.message_templates
    for select to authenticated using (public.is_admin_or_coach());
drop policy if exists message_templates_update_staff on public.message_templates;
create policy message_templates_update_staff on public.message_templates
    for update to authenticated using (public.is_admin_or_coach()) with check (public.is_admin_or_coach());
revoke all on public.message_templates from anon;
grant select, update on public.message_templates to authenticated;

-- Default wording (product copy, editable by Seif). Variables: {{first_name}},
-- {{event_title}}, {{event_date}}, {{amount}}, {{reason}}, {{badge_name}}, {{reward}}.
insert into public.message_templates (key, label, body, is_enabled, is_essential) values
 ('welcome', 'Welcome message',
  'Welcome to Fight Zone, {{first_name}}! This is your private space to talk with Coach Seif. Browse upcoming events, register, and ask anything here.', true, false),
 ('registration_pending', 'Registration received (awaiting decision)',
  'We received your registration for "{{event_title}}" ({{event_date}}). Coach Seif will review it and you will be notified of the decision.', true, true),
 ('registration_confirmed', 'Registration confirmed',
  'Your place for "{{event_title}}" ({{event_date}}) is confirmed. See you there!', true, true),
 ('registration_waitlisted', 'Added to waitlist',
  '"{{event_title}}" is full, so you are on the waitlist. You will be notified automatically if a place opens up.', true, true),
 ('registration_rejected', 'Registration declined',
  'Your registration for "{{event_title}}" could not be accepted.{{reason}} You can reply here if you have any questions.', true, true),
 ('registration_cancelled', 'Registration cancelled by Fight Zone',
  'Your registration for "{{event_title}}" was cancelled.{{reason}}', true, true),
 ('payment_instructions', 'Payment instructions after registering (paid events)',
  'The amount due for "{{event_title}}" is {{amount}}. You can pay in person or by bank transfer — if you transfer, upload your receipt from the event page so Coach Seif can review it.', true, false),
 ('payment_proof_received', 'Payment proof received',
  'We received your payment proof for "{{event_title}}". It is awaiting Coach Seif''s review — this is not yet a payment confirmation.', true, true),
 ('payment_confirmed', 'Payment confirmed',
  'Your payment of {{amount}} for "{{event_title}}" has been confirmed by Coach Seif. Thank you!', true, true),
 ('payment_rejected', 'Payment proof rejected',
  'Your payment proof for "{{event_title}}" could not be accepted.{{reason}} You can upload a new proof from the event page or reply here.', true, true),
 ('event_cancelled', 'Event cancelled',
  '"{{event_title}}" ({{event_date}}) has been cancelled.{{reason}} Reply here if you have questions about your payment.', true, true),
 ('event_updated', 'Event schedule/location changed',
  'Heads-up: "{{event_title}}" has been updated. New date: {{event_date}}. Please check the event page for details.', true, true),
 ('badge_earned', 'Badge earned',
  'Congratulations {{first_name}}! You earned the "{{badge_name}}" badge.{{reward}}', true, false),
 ('reward_available', 'Reward available',
  'A reward is now available on your account: {{reward}}. Coach Seif will apply it to an eligible event.', true, false),
 ('reward_redeemed', 'Reward redeemed',
  'Your reward ({{reward}}) was applied to "{{event_title}}".', true, true)
on conflict (key) do nothing;

-- {{var}} substitution with a jsonb map; unknown variables render empty.
create or replace function public.render_template(p_body text, p_vars jsonb)
returns text
language plpgsql immutable set search_path = public as $$
declare
    v_out text := p_body;
    v_key text;
    v_val text;
begin
    for v_key, v_val in select key, value from jsonb_each_text(coalesce(p_vars, '{}'::jsonb)) loop
        v_out := replace(v_out, '{{' || v_key || '}}', coalesce(v_val, ''));
    end loop;
    return regexp_replace(v_out, '\{\{[a-z_]+\}\}', '', 'g');
end;
$$;
revoke all on function public.render_template(text, jsonb) from public, anon, authenticated;

-- Formats a TND amount with 3 decimals (millimes), e.g. "45.000 TND".
create or replace function public.format_tnd(p_amount numeric)
returns text language sql immutable set search_path = public as $$
    select to_char(coalesce(p_amount, 0), 'FM999999990.000') || ' TND';
$$;
