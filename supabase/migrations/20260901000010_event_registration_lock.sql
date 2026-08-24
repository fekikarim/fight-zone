-- ============================================================
-- FIGHT ZONE — Prompt #14 corrective migration (UNPUSHED)
-- Event registration capacity atomicity.
--
-- Finding: enforce_event_registration() counted active participants
-- without locking the event row. Under READ COMMITTED, two concurrent
-- registrations for the final slot could both observe free capacity and
-- both insert, exceeding max_participants.
--
-- Fix (smallest additive change): re-fetch the event row with
-- FOR UPDATE so concurrent registrations serialize per event. No data
-- changes, no policy/grant changes; trigger signature unchanged.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_event_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
    v_event         record;
    v_active_count  integer;
begin
    -- Fetch the target event. FOR UPDATE serializes concurrent
    -- registrations for the same event so the capacity count below is
    -- evaluated against a committed, stable snapshot.
    select id, start_at, max_participants, is_public
    into v_event
    from public.events
    where id = new.event_id
    for update;

    if v_event is null then
        raise exception 'Event not found.' using errcode = 'P0002';
    end if;

    -- Must be a public event to register
    if not v_event.is_public then
        raise exception 'Registration is not available for this event.' using errcode = '42501';
    end if;

    -- Registration deadline: event must not have started yet
    if v_event.start_at <= now() then
        raise exception 'Registration is closed — this event has already started.' using errcode = '42501';
    end if;

    -- Capacity check (only if max_participants is set)
    if v_event.max_participants is not null then
        select count(*)
        into v_active_count
        from public.event_participants
        where event_id = new.event_id
          and status != 'CANCELLED';

        if v_active_count >= v_event.max_participants then
            raise exception 'This event is fully booked.' using errcode = '42501';
        end if;
    end if;

    return new;
end;
$function$;
