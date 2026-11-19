-- ============================================================
-- Fight Zone V1 — dashboard + reports (staff only, computed from source
-- records; no estimates). Income = payments explicitly recorded/confirmed
-- by Seif (never price × registrations). Settings changes are audited.
-- ============================================================

create or replace function public.get_admin_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
    v jsonb;
begin
    perform public.require_staff();
    select jsonb_build_object(
        'members_total', (select count(*) from public.profiles p where not exists (
            select 1 from public.user_role_assignments a join public.roles r on r.id = a.role_id
             where a.user_id = p.id and r.name in ('ADMIN','COACH'))),
        'members_new', (select count(*) from public.profiles p where p.created_at >= p_from and p.created_at < p_to
            and not exists (select 1 from public.user_role_assignments a join public.roles r on r.id = a.role_id
             where a.user_id = p.id and r.name in ('ADMIN','COACH'))),
        'events_upcoming', (select count(*) from public.events where status = 'PUBLISHED' and start_at >= now()),
        'events_next_7_days', (select count(*) from public.events where status = 'PUBLISHED' and start_at >= now() and start_at < now() + interval '7 days'),
        'events_drafts', (select count(*) from public.events where status = 'DRAFT'),
        'events_completed', (select count(*) from public.events where status = 'PUBLISHED' and coalesce(end_at, start_at) < now()
            and start_at >= p_from and start_at < p_to),
        'events_cancelled', (select count(*) from public.events where status = 'CANCELLED' and cancelled_at >= p_from and cancelled_at < p_to),
        'registrations_pending', (select count(*) from public.event_participants ep join public.events e on e.id = ep.event_id
            where ep.registration_status = 'PENDING' and e.status = 'PUBLISHED'),
        'registrations_waitlisted', (select count(*) from public.event_participants ep join public.events e on e.id = ep.event_id
            where ep.registration_status = 'WAITLISTED' and e.status = 'PUBLISHED' and e.start_at >= now()),
        'registrations_new', (select count(*) from public.event_participants where created_at >= p_from and created_at < p_to),
        'proofs_to_review', (select count(*) from public.payment_submissions where status = 'SUBMITTED'),
        'income_confirmed', (select coalesce(sum(amount), 0) from public.payments
            where status = 'PAID' and registration_id is not null and paid_at >= p_from and paid_at < p_to),
        'income_count', (select count(*) from public.payments
            where status = 'PAID' and registration_id is not null and paid_at >= p_from and paid_at < p_to),
        'outstanding_unpaid', (select coalesce(sum(ep.amount_due_tnd), 0) from public.event_participants ep join public.events e on e.id = ep.event_id
            where ep.registration_status in ('PENDING','CONFIRMED') and ep.payment_status in ('UNPAID','REJECTED','PROOF_SUBMITTED')
              and e.status = 'PUBLISHED'),
        'outstanding_count', (select count(*) from public.event_participants ep join public.events e on e.id = ep.event_id
            where ep.registration_status in ('PENDING','CONFIRMED') and ep.payment_status in ('UNPAID','REJECTED','PROOF_SUBMITTED')
              and e.status = 'PUBLISHED'),
        'attendance_recorded', (select count(*) from public.event_participants
            where attendance_status = 'ATTENDED' and attendance_recorded_at >= p_from and attendance_recorded_at < p_to),
        'unread_messages', (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id
            where c.coach_id = auth.uid() and m.sender_id <> auth.uid() and m.status = 'UNREAD'),
        'contact_new', (select count(*) from public.contact_messages where status = 'UNREAD'),
        'news_published', (select count(*) from public.news where is_published and published_at >= p_from and published_at < p_to),
        'badges_awarded', (select count(*) from public.member_badges where revoked_at is null and awarded_at >= p_from and awarded_at < p_to),
        'reward_outstanding_value', (select coalesce(sum(value_tnd), 0) from public.member_rewards
            where status = 'AVAILABLE' and (expires_at is null or expires_at > now())),
        'reward_pending_approval', (select count(*) from public.member_rewards where status = 'PENDING_APPROVAL')
    ) into v;
    return v;
end;
$$;
revoke all on function public.get_admin_dashboard(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_admin_dashboard(timestamptz, timestamptz) to authenticated;

-- Per-event report for a period (events starting in the window).
create or replace function public.get_event_report(p_from timestamptz, p_to timestamptz)
returns table (
    event_id uuid, title text, start_at timestamptz, status public.event_status, category text, is_free boolean,
    capacity integer, confirmed bigint, pending bigint, waitlisted bigint, cancelled bigint,
    attended bigint, no_show bigint, paid_count bigint, income numeric, outstanding numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
    perform public.require_staff();
    return query
    select e.id, e.title, e.start_at, e.status, e.category, e.is_free, e.max_participants,
           count(ep.id) filter (where ep.registration_status = 'CONFIRMED'),
           count(ep.id) filter (where ep.registration_status = 'PENDING'),
           count(ep.id) filter (where ep.registration_status = 'WAITLISTED'),
           count(ep.id) filter (where ep.registration_status in ('CANCELLED','REJECTED')),
           count(ep.id) filter (where ep.attendance_status = 'ATTENDED'),
           count(ep.id) filter (where ep.attendance_status = 'NO_SHOW'),
           count(ep.id) filter (where ep.payment_status = 'PAID'),
           coalesce((select sum(p.amount) from public.payments p join public.event_participants x on x.id = p.registration_id
                      where x.event_id = e.id and p.status = 'PAID'), 0),
           coalesce(sum(ep.amount_due_tnd) filter (where ep.registration_status in ('PENDING','CONFIRMED')
                      and ep.payment_status in ('UNPAID','REJECTED','PROOF_SUBMITTED')), 0)
      from public.events e
      left join public.event_participants ep on ep.event_id = e.id
     where e.start_at >= p_from and e.start_at < p_to and e.status <> 'DRAFT'
     group by e.id
     order by e.start_at desc;
end;
$$;
revoke all on function public.get_event_report(timestamptz, timestamptz) from public, anon;
grant execute on function public.get_event_report(timestamptz, timestamptz) to authenticated;

-- Audit trail for configuration and content edits.
create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then return coalesce(new, old); end if;
    perform public.log_audit(tg_table_name || '.' || lower(tg_op), tg_table_name,
        case when tg_table_name in ('site_settings','payment_settings') then null
             else nullif(coalesce(to_jsonb(new), to_jsonb(old))->>'id', '')::uuid end,
        case tg_table_name
            when 'message_templates' then jsonb_build_object('key', coalesce(new.key, old.key))
            else '{}'::jsonb end);
    return coalesce(new, old);
exception when others then
    return coalesce(new, old);
end;
$$;
do $$
declare t text;
begin
    foreach t in array array['site_settings','payment_settings','message_templates','faq_items','legal_documents','news'] loop
        execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
        execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t || '_audit', t);
    end loop;
end $$;

-- Member activation changes are audited.
create or replace function public.audit_profile_activation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.is_active is distinct from old.is_active and auth.uid() is not null then
        perform public.log_audit(case when new.is_active then 'member.reactivate' else 'member.deactivate' end,
            'profile', new.id, '{}'::jsonb);
    end if;
    return new;
end;
$$;
drop trigger if exists profiles_audit_activation on public.profiles;
create trigger profiles_audit_activation after update of is_active on public.profiles
    for each row execute function public.audit_profile_activation();
