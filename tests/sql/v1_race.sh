#!/bin/sh
# Fight Zone V1 — concurrent last-seat race (LOCAL DB ONLY).
# Two members register for a capacity-1 event at the same instant, 20 times.
# Pass = never more than one seat taken.
set -e
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
case "$DB" in *127.0.0.1*) ;; *) echo "refusing: not a local database"; exit 1;; esac
OWNER=$(psql "$DB" -At -c "select public.platform_owner_id()")
psql "$DB" -q -c "insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(),'authenticated','authenticated', e, '', now(),'{}','{}',now(),now()
  from unnest(array['race-a@test.local','race-b@test.local']) e on conflict do nothing;" >/dev/null
A=$(psql "$DB" -At -c "select id from auth.users where email='race-a@test.local'")
B=$(psql "$DB" -At -c "select id from auth.users where email='race-b@test.local'")
fail=0
for i in $(seq 1 20); do
  EV=$(psql "$DB" -At -c "insert into public.events (title,start_at,is_public,max_participants,is_free,created_by,status,event_format)
        values ('Race $i', now()+interval '2 days', true, 1, true, '$OWNER', 'PUBLISHED','INDIVIDUAL') returning id" | head -1)
  for U in $A $B; do
    psql "$DB" -q -c "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"$U\",\"role\":\"authenticated\"}', false); select public.register_for_event('$EV');" >/dev/null 2>&1 &
  done
  wait
  TAKEN=$(psql "$DB" -At -c "select count(*) from public.event_participants where event_id='$EV' and registration_status in ('PENDING','CONFIRMED')")
  [ "$TAKEN" -eq 1 ] || { echo "round $i: $TAKEN seats taken (expected exactly 1)"; fail=1; }
done
psql "$DB" -q -c "delete from public.events where title like 'Race %'; delete from auth.users where email like 'race-%@test.local';" >/dev/null
[ $fail -eq 0 ] && echo "PASS race: 20/20 rounds never exceeded capacity" || { echo "FAIL race"; exit 1; }
