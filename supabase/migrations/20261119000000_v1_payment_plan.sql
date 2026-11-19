-- ============================================================
-- Fight Zone V1 — payment plan chosen BEFORE registering (paid events)
--
-- The member declares how they will pay: in person (CASH) or by bank
-- transfer, with the date they plan to transfer. A bank-transfer plan is
-- posted into the member's conversation with Seif as the member's own
-- message, so the payment discussion starts immediately. This is a plan,
-- not a payment: payment_status is unchanged until Seif confirms.
-- ============================================================

alter table public.event_participants add column if not exists payment_method public.payment_method;
alter table public.event_participants add column if not exists planned_payment_date date;
alter table public.event_participants add column if not exists payment_plan_note text
    check (payment_plan_note is null or char_length(payment_plan_note) <= 500);
alter table public.event_participants drop constraint if exists event_participants_payment_method_valid;
alter table public.event_participants add constraint event_participants_payment_method_valid
    check (payment_method is null or payment_method in ('CASH', 'BANK_TRANSFER'));

-- Validates + stores the plan and opens the bank-transfer discussion.
create or replace function public.apply_payment_plan(
    p_registration_id uuid, p_method text, p_planned_date date, p_note text, p_is_change boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
    v_uid   uuid := auth.uid();
    v_reg   record;
    v_event record;
    v_conv  uuid;
    v_note  text := nullif(trim(p_note), '');
    v_body  text;
begin
    select * into v_reg from public.event_participants where id = p_registration_id and member_id = v_uid for update;
    if v_reg is null then raise exception 'Registration not found.' using errcode = 'P0002'; end if;
    if v_reg.payment_status in ('NOT_REQUIRED', 'PAID', 'WAIVED') then
        return; -- nothing to plan
    end if;
    if p_method not in ('CASH', 'BANK_TRANSFER') then
        raise exception 'Choose how you will pay: in person or bank transfer.' using errcode = '22023';
    end if;
    select id, title, start_at into v_event from public.events where id = v_reg.event_id;
    if p_method = 'BANK_TRANSFER' then
        if p_planned_date is null then
            raise exception 'Choose the date you plan to make the transfer.' using errcode = '22023';
        end if;
        if p_planned_date < (now() at time zone 'Africa/Tunis')::date then
            raise exception 'The transfer date can''t be in the past.' using errcode = '22023';
        end if;
        if p_planned_date > (v_event.start_at at time zone 'Africa/Tunis')::date then
            raise exception 'Plan the transfer before the event date.' using errcode = '22023';
        end if;
    end if;

    update public.event_participants
       set payment_method = p_method::public.payment_method,
           planned_payment_date = case when p_method = 'BANK_TRANSFER' then p_planned_date end,
           payment_plan_note = v_note
     where id = p_registration_id;

    if p_method = 'BANK_TRANSFER' then
        v_conv := public.conversation_for_member(v_uid);
        if v_conv is not null then
            v_body := case when p_is_change then 'Update for ' else 'I registered for ' end
                || '"' || v_event.title || '" (' || public.event_date_label(v_event.start_at) || '). '
                || 'I will pay ' || public.format_tnd(v_reg.amount_due_tnd) || ' by bank transfer on '
                || to_char(p_planned_date, 'Dy DD Mon YYYY') || ' and upload the receipt once it''s done.'
                || case when v_note is not null then E'\n' || v_note else '' end;
            insert into public.messages (conversation_id, sender_id, body, kind, status)
            values (v_conv, v_uid, left(v_body, 4000), 'USER', 'UNREAD');
        end if;
    end if;
end;
$$;
revoke all on function public.apply_payment_plan(uuid, text, date, text, boolean) from public, anon, authenticated;

-- Registration + payment plan in ONE transaction.
create or replace function public.register_for_event_with_plan(
    p_event_id uuid, p_payment_method text default null, p_planned_date date default null, p_note text default null
) returns table (registration_id uuid, registration_status public.registration_status,
                 payment_status public.event_payment_status, amount_due_tnd numeric)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
    r record;
    v_paid boolean;
begin
    select (not is_free and coalesce(price_tnd, 0) > 0) into v_paid from public.events where id = p_event_id;
    if coalesce(v_paid, false) and p_payment_method is null then
        raise exception 'Choose how you will pay: in person or bank transfer.' using errcode = '22023';
    end if;
    select * into r from public.register_for_event(p_event_id);
    if r.payment_status = 'UNPAID' then
        perform public.apply_payment_plan(r.registration_id, p_payment_method, p_planned_date, p_note, false);
    end if;
    return query select r.registration_id, r.registration_status, r.payment_status, r.amount_due_tnd;
end;
$$;
revoke all on function public.register_for_event_with_plan(uuid, text, date, text) from public, anon;
grant execute on function public.register_for_event_with_plan(uuid, text, date, text) to authenticated;

-- Member changes their plan later (e.g. switches to in person).
create or replace function public.set_my_payment_plan(
    p_registration_id uuid, p_payment_method text, p_planned_date date default null, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_status public.registration_status;
begin
    if auth.uid() is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
    select registration_status into v_status from public.event_participants
     where id = p_registration_id and member_id = auth.uid();
    if v_status is null then raise exception 'Registration not found.' using errcode = 'P0002'; end if;
    if v_status not in ('PENDING', 'CONFIRMED', 'WAITLISTED') then
        raise exception 'This registration is not active.' using errcode = '42501';
    end if;
    perform public.apply_payment_plan(p_registration_id, p_payment_method, p_planned_date, p_note, true);
end;
$$;
revoke all on function public.set_my_payment_plan(uuid, text, date, text) from public, anon;
grant execute on function public.set_my_payment_plan(uuid, text, date, text) to authenticated;
