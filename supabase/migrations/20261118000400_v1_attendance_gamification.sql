-- ============================================================
-- Fight Zone V1 — attendance, badges, financially controlled rewards
--
-- * Participation == registration with attendance_status = ATTENDED,
--   recorded by Seif only. One event counts once per member (unique row).
-- * Badge definitions are Seif-configurable thresholds (no hard-coded list,
--   none seeded). Awards are idempotent (unique member+badge) and reconciled
--   when attendance is corrected (revoked with an audit trail).
-- * Rewards are optional per badge. Financial rewards default to manual
--   approval; redemption is atomic + single-use; reward_events is an
--   append-only ledger.
-- ============================================================

create table if not exists public.badge_definitions (
    id                uuid primary key default gen_random_uuid(),
    name              text not null check (char_length(name) between 2 and 60),
    description       text check (description is null or char_length(description) <= 300),
    threshold         integer not null check (threshold between 1 and 10000),
    tier              text not null default 'BRONZE' check (tier in ('BRONZE','SILVER','GOLD','PLATINUM','LEGEND')),
    icon              text not null default 'medal' check (icon in ('medal','trophy','flame','star','shield','crown','glove','bolt')),
    accent            text not null default 'rose' check (accent in ('rose','amber','emerald','sky','violet','zinc')),
    is_active         boolean not null default true,
    -- Optional reward (none by default).
    reward_type       text check (reward_type is null or reward_type in ('FREE_ENTRY','DISCOUNT_TND')),
    reward_value_tnd  numeric(10,3) check (reward_value_tnd is null or reward_value_tnd > 0),
    reward_max_value_tnd numeric(10,3) check (reward_max_value_tnd is null or reward_max_value_tnd > 0),
    reward_expiry_days integer check (reward_expiry_days is null or reward_expiry_days between 1 and 730),
    reward_requires_approval boolean not null default true,
    reward_total_cap  integer check (reward_total_cap is null or reward_total_cap > 0),
    reward_terms      text check (reward_terms is null or char_length(reward_terms) <= 500),
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    constraint badge_threshold_unique unique (threshold),
    constraint badge_reward_complete check (
        reward_type is null
        or (reward_type = 'DISCOUNT_TND' and reward_value_tnd is not null)
        or (reward_type = 'FREE_ENTRY' and reward_max_value_tnd is not null))
);
alter table public.badge_definitions enable row level security;
drop policy if exists badge_definitions_select on public.badge_definitions;
create policy badge_definitions_select on public.badge_definitions
    for select to authenticated using (is_active or public.is_admin_or_coach());
drop policy if exists badge_definitions_manage on public.badge_definitions;
create policy badge_definitions_manage on public.badge_definitions
    for all to authenticated using (public.is_admin_or_coach()) with check (public.is_admin_or_coach());
grant select, insert, update, delete on public.badge_definitions to authenticated;
revoke all on public.badge_definitions from anon;

create table if not exists public.member_badges (
    id                  uuid primary key default gen_random_uuid(),
    member_id           uuid not null references public.profiles(id) on delete cascade,
    badge_id            uuid not null references public.badge_definitions(id) on delete restrict,
    awarded_at          timestamptz not null default now(),
    participation_count integer not null,
    revoked_at          timestamptz,
    revoked_reason      text,
    constraint member_badges_unique unique (member_id, badge_id)
);
create index if not exists member_badges_member_idx on public.member_badges (member_id);
alter table public.member_badges enable row level security;
drop policy if exists member_badges_select on public.member_badges;
create policy member_badges_select on public.member_badges
    for select to authenticated using (member_id = auth.uid() or public.is_admin_or_coach());
grant select on public.member_badges to authenticated;
revoke insert, update, delete on public.member_badges from anon, authenticated;

create table if not exists public.member_rewards (
    id               uuid primary key default gen_random_uuid(),
    member_id        uuid not null references public.profiles(id) on delete cascade,
    badge_id         uuid references public.badge_definitions(id) on delete set null,
    member_badge_id  uuid references public.member_badges(id) on delete set null,
    reward_type      text not null check (reward_type in ('FREE_ENTRY','DISCOUNT_TND')),
    value_tnd        numeric(10,3) not null check (value_tnd > 0),
    terms            text,
    status           public.reward_status not null,
    expires_at       timestamptz,
    redeemed_registration_id uuid references public.event_participants(id) on delete set null,
    redeemed_value_tnd numeric(10,3),
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    -- A badge award yields at most one reward.
    constraint member_rewards_badge_unique unique (member_badge_id)
);
create index if not exists member_rewards_member_idx on public.member_rewards (member_id, status);
-- A registration can be covered by at most one reward (no stacking).
create unique index if not exists member_rewards_registration_uidx
    on public.member_rewards (redeemed_registration_id) where redeemed_registration_id is not null;
alter table public.member_rewards enable row level security;
drop policy if exists member_rewards_select on public.member_rewards;
create policy member_rewards_select on public.member_rewards
    for select to authenticated using (member_id = auth.uid() or public.is_admin_or_coach());
grant select on public.member_rewards to authenticated;
revoke insert, update, delete on public.member_rewards from anon, authenticated;

-- Append-only reward ledger.
create table if not exists public.reward_events (
    id         bigint generated always as identity primary key,
    reward_id  uuid not null references public.member_rewards(id) on delete cascade,
    kind       text not null check (kind in ('GRANTED','APPROVED','REDEEMED','REVOKED','EXPIRED')),
    actor_id   uuid references public.profiles(id) on delete set null,
    value_tnd  numeric(10,3),
    note       text,
    created_at timestamptz not null default now()
);
alter table public.reward_events enable row level security;
drop policy if exists reward_events_select on public.reward_events;
create policy reward_events_select on public.reward_events
    for select to authenticated using (public.is_admin_or_coach() or exists (
        select 1 from public.member_rewards r where r.id = reward_events.reward_id and r.member_id = auth.uid()));
grant select on public.reward_events to authenticated;
revoke insert, update, delete on public.reward_events from anon, authenticated;

create or replace function public.reward_label(p_type text, p_value numeric)
returns text language sql immutable set search_path = public as $$
    select case p_type when 'FREE_ENTRY' then 'free entry to one eligible event (up to ' || public.format_tnd(p_value) || ')'
                       else public.format_tnd(p_value) || ' off one event' end;
$$;

-- ------------------------------------------------------------
-- Deterministic, idempotent progress reconciliation for one member.
-- ------------------------------------------------------------
create or replace function public.reconcile_member_progress(p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
    v_count  integer;
    v_badge  record;
    v_mb     record;
    v_mb_id  uuid;
    v_rw_id  uuid;
    v_status public.reward_status;
    v_value  numeric(10,3);
    v_granted integer;
begin
    -- Serialize per member (concurrent attendance writes).
    perform pg_advisory_xact_lock(hashtext('progress:' || p_member_id::text));

    select count(*) into v_count from public.event_participants
     where member_id = p_member_id and attendance_status = 'ATTENDED';

    -- Award newly reached badges (exactly once).
    for v_badge in select * from public.badge_definitions where is_active and threshold <= v_count order by threshold loop
        select * into v_mb from public.member_badges where member_id = p_member_id and badge_id = v_badge.id;
        if v_mb is null then
            insert into public.member_badges (member_id, badge_id, participation_count)
            values (p_member_id, v_badge.id, v_count) returning id into v_mb_id;
        elsif v_mb.revoked_at is not null then
            update public.member_badges set revoked_at = null, revoked_reason = null, awarded_at = now(),
                   participation_count = v_count where id = v_mb.id;
            v_mb_id := v_mb.id;
        else
            continue;
        end if;

        perform public.notify_user(p_member_id, 'BADGE', 'Badge earned: ' || v_badge.name,
            coalesce(v_badge.description, v_badge.threshold || ' events attended'), 'badge', v_badge.id,
            'badge:' || v_mb_id || ':' || extract(epoch from now())::bigint);

        -- A reward revoked only because attendance was corrected comes back
        -- when the badge is re-earned (its ledger shows the full story).
        for v_rw_id in select id from public.member_rewards
                        where member_badge_id = v_mb_id and status = 'REVOKED'
                          and exists (select 1 from public.reward_events e where e.reward_id = member_rewards.id
                                       and e.kind = 'REVOKED' and e.note = 'Attendance corrected')
                          and not exists (select 1 from public.reward_events e where e.reward_id = member_rewards.id
                                       and e.kind = 'REVOKED' and coalesce(e.note, '') <> 'Attendance corrected') loop
            v_status := case when v_badge.reward_requires_approval then 'PENDING_APPROVAL' else 'AVAILABLE' end;
            update public.member_rewards set status = v_status, updated_at = now(),
                   expires_at = case when v_badge.reward_expiry_days is not null and v_status = 'AVAILABLE'
                                     then now() + make_interval(days => v_badge.reward_expiry_days) end
             where id = v_rw_id;
            insert into public.reward_events (reward_id, kind, actor_id, value_tnd, note)
            values (v_rw_id, 'GRANTED', auth.uid(), null, 'Restored after attendance correction');
        end loop;
        v_rw_id := null;

        -- Optional reward, within the configured total cap.
        if v_badge.reward_type is not null
           and not exists (select 1 from public.member_rewards where member_badge_id = v_mb_id) then
            select count(*) into v_granted from public.member_rewards where badge_id = v_badge.id and status <> 'REVOKED';
            if v_badge.reward_total_cap is null or v_granted < v_badge.reward_total_cap then
                v_status := case when v_badge.reward_requires_approval then 'PENDING_APPROVAL' else 'AVAILABLE' end;
                v_value := case v_badge.reward_type when 'FREE_ENTRY' then v_badge.reward_max_value_tnd else v_badge.reward_value_tnd end;
                insert into public.member_rewards (member_id, badge_id, member_badge_id, reward_type, value_tnd, terms,
                                                   status, expires_at)
                values (p_member_id, v_badge.id, v_mb_id, v_badge.reward_type, v_value, v_badge.reward_terms, v_status,
                        case when v_badge.reward_expiry_days is not null and v_status = 'AVAILABLE'
                             then now() + make_interval(days => v_badge.reward_expiry_days) end)
                returning id into v_rw_id;
                insert into public.reward_events (reward_id, kind, actor_id, value_tnd, note)
                values (v_rw_id, 'GRANTED', auth.uid(), v_value, 'Badge: ' || v_badge.name);
                if v_status = 'AVAILABLE' then
                    perform public.send_system_message(p_member_id, 'reward_available',
                        jsonb_build_object('reward', public.reward_label(v_badge.reward_type, v_value)),
                        'reward:' || v_rw_id || ':available');
                end if;
            end if;
        end if;

        perform public.send_system_message(p_member_id, 'badge_earned',
            jsonb_build_object('badge_name', v_badge.name,
                'reward', case when v_rw_id is not null then ' Reward unlocked: '
                    || public.reward_label(v_badge.reward_type, v_value) || '.' else '' end),
            'badge:' || v_mb_id || ':' || extract(epoch from now())::bigint);
        v_rw_id := null;
    end loop;

    -- Attendance corrected downward: revoke badges no longer earned and their
    -- unredeemed rewards (redeemed rewards stay — financial history is kept).
    for v_mb in select mb.id, mb.badge_id from public.member_badges mb
                  join public.badge_definitions b on b.id = mb.badge_id
                 where mb.member_id = p_member_id and mb.revoked_at is null and b.threshold > v_count loop
        update public.member_badges set revoked_at = now(), revoked_reason = 'Attendance corrected' where id = v_mb.id;
        for v_rw_id in update public.member_rewards set status = 'REVOKED', updated_at = now()
                        where member_badge_id = v_mb.id and status in ('PENDING_APPROVAL','AVAILABLE') returning id loop
            insert into public.reward_events (reward_id, kind, actor_id, note)
            values (v_rw_id, 'REVOKED', auth.uid(), 'Attendance corrected');
        end loop;
        perform public.log_audit('badge.revoke', 'member_badge', v_mb.id,
            jsonb_build_object('member_id', p_member_id, 'participations', v_count));
    end loop;
end;
$$;
revoke all on function public.reconcile_member_progress(uuid) from public, anon, authenticated;

-- Seif records (or corrects) attendance for a confirmed registration.
create or replace function public.record_attendance(p_registration_id uuid, p_status public.attendance_status)
returns void language plpgsql security definer set search_path = public as $$
declare
    v_actor uuid := public.require_staff();
    v_reg   record;
    v_start timestamptz;
begin
    select * into v_reg from public.event_participants where id = p_registration_id for update;
    if v_reg is null then raise exception 'Registration not found.' using errcode = 'P0002'; end if;
    if v_reg.registration_status <> 'CONFIRMED' then
        raise exception 'Attendance can only be recorded for confirmed registrations.' using errcode = '42501';
    end if;
    select start_at into v_start from public.events where id = v_reg.event_id;
    if v_start > now() + interval '1 hour' then
        raise exception 'Attendance can be recorded once the event has started.' using errcode = '42501';
    end if;
    if v_reg.attendance_status = p_status then return; end if;

    update public.event_participants set attendance_status = p_status, attendance_recorded_at = now(),
           attendance_recorded_by = v_actor where id = p_registration_id;
    perform public.log_audit('attendance.record', 'registration', p_registration_id,
        jsonb_build_object('from', v_reg.attendance_status, 'to', p_status, 'member_id', v_reg.member_id));
    perform public.reconcile_member_progress(v_reg.member_id);
end;
$$;
revoke all on function public.record_attendance(uuid, public.attendance_status) from public, anon;
grant execute on function public.record_attendance(uuid, public.attendance_status) to authenticated;

-- Re-run reconciliation for all members (after Seif edits badge thresholds).
create or replace function public.reconcile_all_progress()
returns integer language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_n integer := 0;
begin
    perform public.require_staff();
    for v_member in select distinct member_id from public.event_participants where attendance_status = 'ATTENDED'
                    union select distinct member_id from public.member_badges where revoked_at is null loop
        perform public.reconcile_member_progress(v_member);
        v_n := v_n + 1;
    end loop;
    perform public.log_audit('badge.reconcile_all', 'badge_definitions', null, jsonb_build_object('members', v_n));
    return v_n;
end;
$$;
revoke all on function public.reconcile_all_progress() from public, anon;
grant execute on function public.reconcile_all_progress() to authenticated;

-- Approve / revoke a reward.
create or replace function public.set_reward_status(p_reward_id uuid, p_action text, p_reason text default null)
returns public.reward_status language plpgsql security definer set search_path = public as $$
declare
    v_actor uuid := public.require_staff();
    v_rw    record;
    v_days  integer;
    v_new   public.reward_status;
begin
    select * into v_rw from public.member_rewards where id = p_reward_id for update;
    if v_rw is null then raise exception 'Reward not found.' using errcode = 'P0002'; end if;
    if p_action = 'APPROVE' then
        if v_rw.status <> 'PENDING_APPROVAL' then
            raise exception 'Only rewards awaiting approval can be approved.' using errcode = '42501';
        end if;
        select reward_expiry_days into v_days from public.badge_definitions where id = v_rw.badge_id;
        v_new := 'AVAILABLE';
        update public.member_rewards set status = v_new, updated_at = now(),
               expires_at = case when v_days is not null then now() + make_interval(days => v_days) end
         where id = p_reward_id;
        insert into public.reward_events (reward_id, kind, actor_id, value_tnd) values (p_reward_id, 'APPROVED', v_actor, v_rw.value_tnd);
        perform public.send_system_message(v_rw.member_id, 'reward_available',
            jsonb_build_object('reward', public.reward_label(v_rw.reward_type, v_rw.value_tnd)),
            'reward:' || p_reward_id || ':available');
        perform public.notify_user(v_rw.member_id, 'REWARD', 'Reward available',
            public.reward_label(v_rw.reward_type, v_rw.value_tnd), 'reward', p_reward_id, 'reward:' || p_reward_id || ':available');
    elsif p_action = 'REVOKE' then
        if v_rw.status not in ('PENDING_APPROVAL', 'AVAILABLE') then
            raise exception 'This reward can no longer be revoked.' using errcode = '42501';
        end if;
        if nullif(trim(p_reason), '') is null then
            raise exception 'A reason is required to revoke a reward.' using errcode = '22023';
        end if;
        v_new := 'REVOKED';
        update public.member_rewards set status = v_new, updated_at = now() where id = p_reward_id;
        insert into public.reward_events (reward_id, kind, actor_id, note) values (p_reward_id, 'REVOKED', v_actor, trim(p_reason));
    else
        raise exception 'Unknown action.' using errcode = '22023';
    end if;
    perform public.log_audit('reward.' || lower(p_action), 'reward', p_reward_id, jsonb_build_object('reason', p_reason));
    return v_new;
end;
$$;
revoke all on function public.set_reward_status(uuid, text, text) from public, anon;
grant execute on function public.set_reward_status(uuid, text, text) to authenticated;

-- Atomic, single-use redemption against one of the member's registrations.
-- Never produces a negative amount; FREE_ENTRY is capped at its max value.
create or replace function public.redeem_reward(p_reward_id uuid, p_registration_id uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare
    v_actor   uuid := public.require_staff();
    v_rw      record;
    v_reg     record;
    v_title   text;
    v_applied numeric(10,3);
begin
    select * into v_rw from public.member_rewards where id = p_reward_id for update;
    if v_rw is null then raise exception 'Reward not found.' using errcode = 'P0002'; end if;
    if v_rw.status <> 'AVAILABLE' then
        raise exception 'This reward is not available (status: %).', lower(v_rw.status::text) using errcode = '42501';
    end if;
    if v_rw.expires_at is not null and v_rw.expires_at <= now() then
        update public.member_rewards set status = 'EXPIRED', updated_at = now() where id = p_reward_id;
        insert into public.reward_events (reward_id, kind, actor_id) values (p_reward_id, 'EXPIRED', v_actor);
        raise exception 'This reward has expired.' using errcode = '42501';
    end if;

    select * into v_reg from public.event_participants where id = p_registration_id for update;
    if v_reg is null or v_reg.member_id <> v_rw.member_id then
        raise exception 'The registration must belong to the same member.' using errcode = '42501';
    end if;
    if v_reg.registration_status not in ('PENDING', 'CONFIRMED') or v_reg.payment_status not in ('UNPAID', 'REJECTED') then
        raise exception 'Rewards can only be applied to an active, unpaid registration.' using errcode = '42501';
    end if;
    if exists (select 1 from public.member_rewards where redeemed_registration_id = p_registration_id) then
        raise exception 'A reward is already applied to this registration.' using errcode = '23505';
    end if;

    v_applied := least(v_reg.amount_due_tnd, v_rw.value_tnd);
    update public.member_rewards set status = 'REDEEMED', redeemed_registration_id = p_registration_id,
           redeemed_value_tnd = v_applied, updated_at = now() where id = p_reward_id;
    insert into public.reward_events (reward_id, kind, actor_id, value_tnd, note)
    values (p_reward_id, 'REDEEMED', v_actor, v_applied, 'Registration ' || p_registration_id);

    -- Reduce what the member owes; fully covered → WAIVED (not income).
    update public.event_participants set
        amount_due_tnd = greatest(amount_due_tnd - v_applied, 0),
        payment_status = case when amount_due_tnd - v_applied <= 0 then 'WAIVED'::public.event_payment_status
                              else payment_status end
     where id = p_registration_id;

    select title into v_title from public.events where id = v_reg.event_id;
    perform public.log_audit('reward.redeem', 'reward', p_reward_id,
        jsonb_build_object('registration_id', p_registration_id, 'applied', v_applied));
    perform public.send_system_message(v_rw.member_id, 'reward_redeemed',
        jsonb_build_object('reward', public.reward_label(v_rw.reward_type, v_rw.value_tnd), 'event_title', v_title),
        'reward:' || p_reward_id || ':redeemed');
    return v_applied;
end;
$$;
revoke all on function public.redeem_reward(uuid, uuid) from public, anon;
grant execute on function public.redeem_reward(uuid, uuid) to authenticated;

-- Liability preview: what activating/keeping rewards could cost.
create or replace function public.get_reward_liability()
returns table (outstanding_count bigint, outstanding_value numeric, pending_approval_count bigint,
               pending_approval_value numeric, redeemed_count bigint, redeemed_value numeric)
language plpgsql stable security definer set search_path = public as $$
begin
    perform public.require_staff();
    return query select
        count(*) filter (where status = 'AVAILABLE' and (expires_at is null or expires_at > now())),
        coalesce(sum(value_tnd) filter (where status = 'AVAILABLE' and (expires_at is null or expires_at > now())), 0),
        count(*) filter (where status = 'PENDING_APPROVAL'),
        coalesce(sum(value_tnd) filter (where status = 'PENDING_APPROVAL'), 0),
        count(*) filter (where status = 'REDEEMED'),
        coalesce(sum(redeemed_value_tnd) filter (where status = 'REDEEMED'), 0)
      from public.member_rewards;
end;
$$;
revoke all on function public.get_reward_liability() from public, anon;
grant execute on function public.get_reward_liability() to authenticated;

-- Members who would immediately qualify for a threshold (preview before
-- creating/activating a badge with a reward).
create or replace function public.preview_badge_impact(p_threshold integer)
returns bigint language plpgsql stable security definer set search_path = public as $$
begin
    perform public.require_staff();
    return (select count(*) from (
        select member_id from public.event_participants where attendance_status = 'ATTENDED'
         group by member_id having count(*) >= p_threshold) q);
end;
$$;
revoke all on function public.preview_badge_impact(integer) from public, anon;
grant execute on function public.preview_badge_impact(integer) to authenticated;

-- Audit badge definition changes.
create or replace function public.audit_badge_definitions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    perform public.log_audit('badge_definition.' || lower(tg_op), 'badge_definition', coalesce(new.id, old.id),
        jsonb_build_object('name', coalesce(new.name, old.name), 'threshold', coalesce(new.threshold, old.threshold),
                           'reward_type', coalesce(new.reward_type, old.reward_type)));
    if tg_op = 'UPDATE' then new.updated_at := now(); end if;
    return coalesce(new, old);
end;
$$;
drop trigger if exists badge_definitions_audit on public.badge_definitions;
create trigger badge_definitions_audit before insert or update or delete on public.badge_definitions
    for each row execute function public.audit_badge_definitions();
