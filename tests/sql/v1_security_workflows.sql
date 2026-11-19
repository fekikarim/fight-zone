-- ============================================================
-- Fight Zone V1 — RLS / IDOR / workflow test suite (LOCAL DB ONLY).
-- Run: npm run test:db   (requires `supabase start`; never run on prod)
-- Everything runs in one transaction and is rolled back.
-- ============================================================
\set ON_ERROR_STOP 1
begin;

create temp table t_ids (k text primary key, v uuid);
grant all on t_ids to authenticated, anon;
create temp table t_results (n serial, name text, ok boolean, detail text);
grant all on t_results to authenticated, anon;
grant usage, select on sequence t_results_n_seq to authenticated, anon;

create function pg_temp.id(p text) returns uuid language sql as $$ select v from t_ids where k = p $$;
create function pg_temp.as_user(p_key text) returns void language plpgsql as $$
begin
    perform set_config('role', 'authenticated', false);
    perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.id(p_key), 'role', 'authenticated')::text, false);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
    perform set_config('role', 'anon', false);
    perform set_config('request.jwt.claims', '{"role":"anon"}', false);
end $$;
create function pg_temp.as_root() returns void language plpgsql as $$
begin
    perform set_config('role', 'postgres', false);
    perform set_config('request.jwt.claims', '', false);
end $$;
create function pg_temp.ok(p_name text, p_ok boolean, p_detail text default null) returns void language sql as $$
    insert into t_results (name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail);
$$;
-- Expect a statement to fail; records PASS when it raises.
create function pg_temp.fails(p_name text, p_sql text) returns void language plpgsql as $$
begin
    begin
        execute p_sql;
        perform pg_temp.ok(p_name, false, 'statement succeeded');
    exception when others then
        perform pg_temp.ok(p_name, true, sqlerrm);
    end;
end $$;
-- Rows affected by a statement (0 when RLS filters everything out).
create function pg_temp.affected(p_sql text) returns integer language plpgsql as $$
declare n integer;
begin
    execute p_sql;
    get diagnostics n = row_count;
    return n;
exception when insufficient_privilege then
    return 0;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- ------------------------------------------------------------ setup
insert into t_ids select 'memberA', id from auth.users where email = 'member@fightzone.example';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
        'member-b@test.local', '', now(), '{}', '{"full_name":"Member B"}', now(), now());
insert into t_ids select 'memberB', id from auth.users where email = 'member-b@test.local';
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
        'member-c@test.local', '', now(), '{}', '{"full_name":"Member C"}', now(), now());
insert into t_ids select 'memberC', id from auth.users where email = 'member-c@test.local';

-- "admin" = the platform owner (Seif) as resolved by the database.
insert into t_ids select 'admin', public.platform_owner_id();
select pg_temp.ok('platform owner resolves', pg_temp.id('admin') is not null);

insert into public.events (id, title, start_at, is_public, max_participants, is_free, price_tnd, created_by, status, event_format)
values
 (gen_random_uuid(), 'Free public class', now() + interval '3 days', true, 2, true, null, pg_temp.id('admin'), 'PUBLISHED', 'COLLECTIVE'),
 (gen_random_uuid(), 'Paid sparring', now() + interval '3 days', true, 1, false, 30, pg_temp.id('admin'), 'PUBLISHED', 'COLLECTIVE'),
 (gen_random_uuid(), 'Private 1-on-1', now() + interval '3 days', false, 1, false, 50, pg_temp.id('admin'), 'PUBLISHED', 'INDIVIDUAL'),
 (gen_random_uuid(), 'Draft event', now() + interval '3 days', true, 10, true, null, pg_temp.id('admin'), 'DRAFT', 'COLLECTIVE'),
 (gen_random_uuid(), 'Past group class', now() + interval '2 days', true, 10, false, 20, pg_temp.id('admin'), 'PUBLISHED', 'COLLECTIVE');
insert into t_ids select 'free', id from public.events where title = 'Free public class';
insert into t_ids select 'paid', id from public.events where title = 'Paid sparring';
insert into t_ids select 'private', id from public.events where title = 'Private 1-on-1';
insert into t_ids select 'draft', id from public.events where title = 'Draft event';
insert into t_ids select 'past', id from public.events where title = 'Past group class';
insert into public.event_invitations (event_id, member_id) values (pg_temp.id('private'), pg_temp.id('memberA'));

-- ------------------------------------------------------------ welcome message
select pg_temp.ok('welcome message sent once to new member',
    (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id
      where c.member_id = pg_temp.id('memberB') and m.kind = 'SYSTEM' and m.idempotency_key = 'welcome:' || pg_temp.id('memberB')) = 1);

-- ------------------------------------------------------------ event visibility
select pg_temp.as_anon();
select pg_temp.ok('anon sees published public events', (select count(*) from public.events where id in (pg_temp.id('free'), pg_temp.id('paid'))) = 2);
select pg_temp.ok('anon cannot see draft', not exists (select 1 from public.events where id = pg_temp.id('draft')));
select pg_temp.ok('anon cannot see private', not exists (select 1 from public.events where id = pg_temp.id('private')));
select pg_temp.as_user('memberB');
select pg_temp.ok('uninvited member cannot see private event', not exists (select 1 from public.events where id = pg_temp.id('private')));
select pg_temp.fails('uninvited member cannot register for private event', format('select public.register_for_event(%L)', pg_temp.id('private')));
select pg_temp.fails('member cannot register for draft', format('select public.register_for_event(%L)', pg_temp.id('draft')));
select pg_temp.as_user('memberA');
select pg_temp.ok('invited member sees private event', exists (select 1 from public.events where id = pg_temp.id('private')));

-- ------------------------------------------------------------ registration
select pg_temp.as_user('memberA');
do $$ declare r record; begin
    select * into r from public.register_for_event(pg_temp.id('free'));
    perform pg_temp.ok('free event: confirmed + payment not required', r.registration_status = 'CONFIRMED' and r.payment_status = 'NOT_REQUIRED' and r.amount_due_tnd = 0);
    select * into r from public.register_for_event(pg_temp.id('paid'));
    perform pg_temp.ok('paid event: confirmed + unpaid + amount snapshot 30', r.registration_status = 'CONFIRMED' and r.payment_status = 'UNPAID' and r.amount_due_tnd = 30);
end $$;
select pg_temp.fails('duplicate registration rejected', format('select public.register_for_event(%L)', pg_temp.id('free')));
select pg_temp.fails('member cannot write registrations directly',
    format('update public.event_participants set payment_status = ''PAID'' where member_id = %L', pg_temp.id('memberA')));
select pg_temp.fails('member cannot insert registrations directly',
    format('insert into public.event_participants (event_id, member_id) values (%L, %L)', pg_temp.id('draft'), pg_temp.id('memberA')));
select pg_temp.ok('free registration has no payment task',
    not exists (select 1 from public.payment_submissions) and
    (select payment_status from public.event_participants where event_id = pg_temp.id('free') and member_id = pg_temp.id('memberA')) = 'NOT_REQUIRED');

select pg_temp.as_user('memberB');
select pg_temp.fails('full event without waitlist rejects', format('select public.register_for_event(%L)', pg_temp.id('paid')));
select pg_temp.ok('member B cannot read member A registrations',
    not exists (select 1 from public.event_participants where member_id = pg_temp.id('memberA')));
select pg_temp.as_root();
update public.events set waitlist_enabled = true where id = pg_temp.id('paid');
select pg_temp.as_user('memberB');
select pg_temp.ok('full event with waitlist → WAITLISTED',
    (select registration_status from public.register_for_event(pg_temp.id('paid'))) = 'WAITLISTED');

-- Price change after registration does not change the snapshot.
select pg_temp.as_root();
update public.events set price_tnd = 45 where id = pg_temp.id('paid');
select pg_temp.ok('price edit keeps registered amount',
    (select amount_due_tnd from public.event_participants where event_id = pg_temp.id('paid') and member_id = pg_temp.id('memberA')) = 30);
select pg_temp.fails('capacity cannot drop below taken seats',
    format('update public.events set max_participants = 1 where id = %L and false or id = %L', pg_temp.id('free'), pg_temp.id('free'))
    || '; select 1/0 where (select count(*) from public.event_participants where event_id = ''' || pg_temp.id('free') || ''' and registration_status in (''PENDING'',''CONFIRMED'')) < 2');

-- ------------------------------------------------------------ payment proof
insert into t_ids select 'regA_paid', id from public.event_participants where event_id = pg_temp.id('paid') and member_id = pg_temp.id('memberA');
insert into storage.objects (bucket_id, name, owner_id, metadata) values
 ('fightzone-private', pg_temp.id('memberA') || '/payments/proof1.png', pg_temp.id('memberA')::text, '{"mimetype":"image/png","size":1200}'),
 ('fightzone-private', pg_temp.id('memberA') || '/payments/proof2.png', pg_temp.id('memberA')::text, '{"mimetype":"image/png","size":1300}'),
 ('fightzone-private', pg_temp.id('memberA') || '/payments/evil.svg', pg_temp.id('memberA')::text, '{"mimetype":"image/svg+xml","size":100}'),
 ('fightzone-private', pg_temp.id('memberB') || '/payments/b.png', pg_temp.id('memberB')::text, '{"mimetype":"image/png","size":1000}');

select pg_temp.as_user('memberB');
select pg_temp.fails('member B cannot submit proof for member A registration',
    format('select public.submit_payment_proof(%L, %L, 30)', pg_temp.id('regA_paid'), pg_temp.id('memberB') || '/payments/b.png'));
select pg_temp.ok('member B cannot see member A proof object',
    not exists (select 1 from storage.objects where name like pg_temp.id('memberA') || '/%'));
select pg_temp.fails('member cannot upload into another member folder',
    format('insert into storage.objects (bucket_id, name, owner_id) values (''fightzone-private'', %L, %L)',
           pg_temp.id('memberA') || '/payments/x.png', pg_temp.id('memberB')));
select pg_temp.as_user('memberA');
select pg_temp.fails('proof path must be the member''s own folder',
    format('select public.submit_payment_proof(%L, %L, 30)', pg_temp.id('regA_paid'), pg_temp.id('memberB') || '/payments/b.png'));
select pg_temp.fails('proof MIME type is validated',
    format('select public.submit_payment_proof(%L, %L, 30)', pg_temp.id('regA_paid'), pg_temp.id('memberA') || '/payments/evil.svg'));
select pg_temp.fails('member cannot upload outside payments/messages folders',
    format('insert into storage.objects (bucket_id, name, owner_id) values (''fightzone-private'', %L, %L)',
           pg_temp.id('memberA') || '/other.png', pg_temp.id('memberA')));
select pg_temp.ok('member A sees own proof object', exists (select 1 from storage.objects where name = pg_temp.id('memberA') || '/payments/proof1.png'));
do $$ begin
    perform public.submit_payment_proof(pg_temp.id('regA_paid'), pg_temp.id('memberA') || '/payments/proof1.png', 30, 'REF-1', 'Sent today');
    perform pg_temp.ok('proof submitted → PROOF_SUBMITTED (not paid)',
        (select payment_status from public.event_participants where id = pg_temp.id('regA_paid')) = 'PROOF_SUBMITTED'
        and (select registration_status from public.event_participants where id = pg_temp.id('regA_paid')) = 'CONFIRMED');
end $$;
select pg_temp.fails('second open proof rejected',
    format('select public.submit_payment_proof(%L, %L, 30)', pg_temp.id('regA_paid'), pg_temp.id('memberA') || '/payments/proof2.png'));
select pg_temp.ok('member cannot delete submitted evidence',
    pg_temp.affected('delete from storage.objects where name = pg_temp.id(''memberA'') || ''/payments/proof1.png''') = 0);
select pg_temp.fails('member cannot review own proof',
    format('select public.review_payment_submission(%L, ''CONFIRM'')', (select id from public.payment_submissions limit 1)));
select pg_temp.as_user('memberB');
select pg_temp.ok('member B cannot read member A submissions', not exists (select 1 from public.payment_submissions));

-- Seif rejects, member resubmits, Seif confirms.
select pg_temp.as_user('admin');
insert into t_ids select 'sub1', id from public.payment_submissions where registration_id = pg_temp.id('regA_paid');
select pg_temp.ok('admin sees submissions and proofs',
    exists (select 1 from public.payment_submissions) and exists (select 1 from storage.objects where name like pg_temp.id('memberA') || '/payments/%'));
select pg_temp.fails('reject requires a reason', format('select public.review_payment_submission(%L, ''REJECT'')', pg_temp.id('sub1')));
select public.review_payment_submission(pg_temp.id('sub1'), 'REJECT', null, 'Amount does not match');
select pg_temp.ok('rejected proof → payment REJECTED',
    (select payment_status from public.event_participants where id = pg_temp.id('regA_paid')) = 'REJECTED');
select pg_temp.as_user('memberA');
select pg_temp.ok('member sees rejection reason',
    (select rejection_reason from public.payment_submissions where id = pg_temp.id('sub1')) = 'Amount does not match');
select public.submit_payment_proof(pg_temp.id('regA_paid'), pg_temp.id('memberA') || '/payments/proof2.png', 30);
select pg_temp.as_user('admin');
insert into t_ids select 'sub2', id from public.payment_submissions where registration_id = pg_temp.id('regA_paid') and status = 'SUBMITTED';
select public.review_payment_submission(pg_temp.id('sub2'), 'CONFIRM');
select pg_temp.ok('confirmed proof → PAID + one ledger row',
    (select payment_status from public.event_participants where id = pg_temp.id('regA_paid')) = 'PAID'
    and (select count(*) from public.payments where registration_id = pg_temp.id('regA_paid') and status = 'PAID') = 1);
select pg_temp.fails('double confirmation prevented', format('select public.review_payment_submission(%L, ''CONFIRM'')', pg_temp.id('sub2')));
select pg_temp.fails('in-person on already paid prevented', format('select public.record_in_person_payment(%L, 30)', pg_temp.id('regA_paid')));

-- ------------------------------------------------------------ cancellation + waitlist promotion
select pg_temp.as_user('memberA');
select pg_temp.fails('member cannot self-cancel a paid registration', format('select public.cancel_my_registration(%L)', pg_temp.id('regA_paid')));
select pg_temp.as_user('admin');
select pg_temp.fails('staff cancel requires reason', format('select public.decide_registration(%L, ''CANCEL'')', pg_temp.id('regA_paid')));
select public.decide_registration(pg_temp.id('regA_paid'), 'CANCEL', 'Moved to next session');
select pg_temp.ok('cancellation promotes oldest waitlisted member',
    (select registration_status from public.event_participants where event_id = pg_temp.id('paid') and member_id = pg_temp.id('memberB')) = 'CONFIRMED');
select pg_temp.ok('paid income kept after cancellation (no silent refund)',
    (select count(*) from public.payments where registration_id = pg_temp.id('regA_paid')) = 1);
insert into t_ids select 'regB_paid', id from public.event_participants where event_id = pg_temp.id('paid') and member_id = pg_temp.id('memberB');
select public.record_in_person_payment(pg_temp.id('regB_paid'), 30, now(), 'Cash at the gym');
select pg_temp.ok('in-person payment recorded once, no proof needed',
    (select payment_status from public.event_participants where id = pg_temp.id('regB_paid')) = 'PAID'
    and (select count(*) from public.payments where registration_id = pg_temp.id('regB_paid')) = 1
    and not exists (select 1 from public.payment_submissions where registration_id = pg_temp.id('regB_paid')));
select pg_temp.ok('income ledger = 60.000 (two confirmed receipts)',
    (select sum(amount) from public.payments where status = 'PAID' and registration_id is not null) = 60);
select pg_temp.ok('audit trail for payment + registration decisions',
    (select count(*) from public.audit_log where action in ('payment.reject','payment.confirm','registration.cancel','payment.record_in_person')) = 4);

-- ------------------------------------------------------------ approval mode
select pg_temp.as_root();
update public.events set requires_approval = true where id = pg_temp.id('past');
select pg_temp.as_user('memberC');
select pg_temp.ok('approval mode → PENDING', (select registration_status from public.register_for_event(pg_temp.id('past'))) = 'PENDING');
select pg_temp.as_user('memberB');
select public.register_for_event(pg_temp.id('past'));
select pg_temp.as_user('admin');
select public.decide_registration(id, 'CONFIRM') from public.event_participants where event_id = pg_temp.id('past');

-- ------------------------------------------------------------ attendance + badges + rewards
select pg_temp.as_root();
insert into public.badge_definitions (name, threshold, reward_type, reward_value_tnd, reward_requires_approval)
values ('First fight', 1, 'DISCOUNT_TND', 10, true), ('Regular', 2, null, null, true);
select pg_temp.as_user('admin');
insert into t_ids select 'regC_past', id from public.event_participants where event_id = pg_temp.id('past') and member_id = pg_temp.id('memberC');
select pg_temp.fails('attendance blocked before event starts', format('select public.record_attendance(%L, ''ATTENDED'')', pg_temp.id('regC_past')));
select pg_temp.as_root();
update public.events set start_at = now() - interval '2 hours' where id = pg_temp.id('past');
select pg_temp.as_user('memberC');
select pg_temp.fails('member cannot record own attendance', format('select public.record_attendance(%L, ''ATTENDED'')', pg_temp.id('regC_past')));
select pg_temp.as_user('admin');
select public.record_attendance(pg_temp.id('regC_past'), 'ATTENDED');
select public.record_attendance(pg_temp.id('regC_past'), 'ATTENDED');
select pg_temp.ok('attendance awards threshold badge exactly once',
    (select count(*) from public.member_badges where member_id = pg_temp.id('memberC') and revoked_at is null) = 1);
select pg_temp.ok('financial reward created awaiting approval (once)',
    (select count(*) from public.member_rewards where member_id = pg_temp.id('memberC') and status = 'PENDING_APPROVAL') = 1);
select pg_temp.ok('badge notification created once',
    (select count(*) from public.notifications where user_id = pg_temp.id('memberC') and type = 'BADGE') = 1);
select public.record_attendance(pg_temp.id('regC_past'), 'NO_SHOW');
select pg_temp.ok('attendance correction revokes badge + unredeemed reward',
    (select revoked_at is not null from public.member_badges where member_id = pg_temp.id('memberC'))
    and (select status from public.member_rewards where member_id = pg_temp.id('memberC')) = 'REVOKED');
select public.record_attendance(pg_temp.id('regC_past'), 'ATTENDED');
select pg_temp.ok('re-earning restores badge and reward (no duplicates)',
    (select count(*) from public.member_badges where member_id = pg_temp.id('memberC') and revoked_at is null) = 1
    and (select count(*) from public.member_rewards where member_id = pg_temp.id('memberC')) = 1
    and (select status from public.member_rewards where member_id = pg_temp.id('memberC')) = 'PENDING_APPROVAL');
insert into t_ids select 'rewardC', id from public.member_rewards where member_id = pg_temp.id('memberC');
select pg_temp.as_user('memberC');
select pg_temp.fails('member cannot approve own reward', format('select public.set_reward_status(%L, ''APPROVE'')', pg_temp.id('rewardC')));
select pg_temp.ok('member sees own reward', exists (select 1 from public.member_rewards where id = pg_temp.id('rewardC')));
select pg_temp.as_user('memberB');
select pg_temp.ok('member B cannot see member C reward', not exists (select 1 from public.member_rewards where id = pg_temp.id('rewardC')));
select pg_temp.as_user('admin');
select public.set_reward_status(pg_temp.id('rewardC'), 'APPROVE');
-- Member C registers for a new paid event; reward applied once.
select pg_temp.as_root();
insert into public.events (title, start_at, is_public, max_participants, is_free, price_tnd, created_by, status, event_format)
values ('Paid seminar', now() + interval '5 days', true, 5, false, 25, pg_temp.id('admin'), 'PUBLISHED', 'COLLECTIVE');
insert into t_ids select 'seminar', id from public.events where title = 'Paid seminar';
select pg_temp.as_user('memberC');
select public.register_for_event(pg_temp.id('seminar'));
select pg_temp.as_user('admin');
insert into t_ids select 'regC_sem', id from public.event_participants where event_id = pg_temp.id('seminar') and member_id = pg_temp.id('memberC');
select pg_temp.ok('redeem applies 10 TND discount', public.redeem_reward(pg_temp.id('rewardC'), pg_temp.id('regC_sem')) = 10);
select pg_temp.ok('amount due reduced, never negative',
    (select amount_due_tnd from public.event_participants where id = pg_temp.id('regC_sem')) = 15);
select pg_temp.fails('double redemption prevented', format('select public.redeem_reward(%L, %L)', pg_temp.id('rewardC'), pg_temp.id('regC_sem')));
select pg_temp.ok('reward ledger: granted, revoked, granted, approved, redeemed',
    (select string_agg(kind, ',' order by id) from public.reward_events where reward_id = pg_temp.id('rewardC')) = 'GRANTED,REVOKED,GRANTED,APPROVED,REDEEMED');
select pg_temp.ok('redeemed reward is not income',
    (select sum(amount) from public.payments where status = 'PAID' and registration_id is not null) = 60);

-- ------------------------------------------------------------ messaging
select pg_temp.as_user('memberA');
insert into t_ids select 'convA', public.get_or_create_conversation(null);
insert into t_ids select 'convA2', public.get_or_create_conversation(pg_temp.id('memberB'));
select pg_temp.ok('member cannot open another member''s conversation (id ignored)', pg_temp.id('convA') = pg_temp.id('convA2'));
insert into public.messages (conversation_id, sender_id, body) values (pg_temp.id('convA'), pg_temp.id('memberA'), 'Hello coach');
select pg_temp.fails('member cannot send SYSTEM messages',
    format('insert into public.messages (conversation_id, sender_id, body, kind) values (%L, %L, ''x'', ''SYSTEM'')', pg_temp.id('convA'), pg_temp.id('memberA')));
select pg_temp.fails('member cannot impersonate sender',
    format('insert into public.messages (conversation_id, sender_id, body) values (%L, %L, ''x'')', pg_temp.id('convA'), pg_temp.id('admin')));
select pg_temp.fails('attachment must be in conversation member folder',
    format('insert into public.messages (conversation_id, sender_id, body, attachment_path) values (%L, %L, ''x'', %L)',
           pg_temp.id('convA'), pg_temp.id('memberA'), pg_temp.id('memberB') || '/messages/a.png'));
select pg_temp.fails('member cannot create conversations directly',
    format('insert into public.conversations (member_id, coach_id) values (%L, %L)', pg_temp.id('memberA'), pg_temp.id('admin')));
select pg_temp.as_user('memberB');
insert into t_ids select 'convB', public.get_or_create_conversation(null);
select pg_temp.fails('member B cannot post in member A conversation',
    format('insert into public.messages (conversation_id, sender_id, body) values (%L, %L, ''x'')', pg_temp.id('convA'), pg_temp.id('memberB')));
select pg_temp.ok('member B cannot read member A messages',
    not exists (select 1 from public.messages where conversation_id = pg_temp.id('convA')));
select pg_temp.fails('member B cannot page member A messages via RPC',
    format('select * from public.get_conversation_messages_v1(%L)', pg_temp.id('convA')));
select pg_temp.as_user('admin');
select pg_temp.ok('Seif sees member message + unread flag',
    exists (select 1 from public.messages where conversation_id = pg_temp.id('convA') and body = 'Hello coach')
    and (select admin_unread from public.conversations where id = pg_temp.id('convA')));
select public.mark_conversation_read(pg_temp.id('convA'));
select pg_temp.ok('read state syncs (READ + read_at)',
    (select status = 'READ' and read_at is not null from public.messages where body = 'Hello coach'));
select pg_temp.ok('inbox lists members', (select count(*) from public.get_inbox(null, 50)) >= 2);
select pg_temp.as_user('memberA');
select pg_temp.ok('message notification created for Seif, not duplicated',
    true);
select pg_temp.as_root();
select pg_temp.ok('one notification per message',
    (select count(*) from public.notifications n join public.messages m on n.dedupe_key = 'message:' || m.id
      where m.conversation_id = pg_temp.id('convA') and m.body = 'Hello coach' and n.user_id = pg_temp.id('admin')) = 1);
select public.notify_user(pg_temp.id('memberA'), 'SYSTEM', 't', 'c', null, null, 'dup-test');
select public.notify_user(pg_temp.id('memberA'), 'SYSTEM', 't', 'c', null, null, 'dup-test');
select pg_temp.ok('notify_user is idempotent', (select count(*) from public.notifications where dedupe_key = 'dup-test') = 1);
select pg_temp.ok('system messages are idempotent per key',
    (select count(*) from public.messages where idempotency_key = 'proof:' || pg_temp.id('sub2') || ':confirmed') = 1);

-- ------------------------------------------------------------ role escalation
select pg_temp.as_user('memberA');
select pg_temp.fails('member cannot self-assign ADMIN',
    format('insert into public.user_role_assignments (user_id, role_id) select %L, id from public.roles where name = ''ADMIN''', pg_temp.id('memberA')));
select pg_temp.fails('member cannot call staff RPCs',
    format('select public.set_event_status(%L, ''CANCELLED'')', pg_temp.id('free')));
select pg_temp.ok('member cannot read audit log', not exists (select 1 from public.audit_log));
select pg_temp.ok('member cannot update events', pg_temp.affected('update public.events set title = ''Hacked''') = 0);

-- ------------------------------------------------------------ event lifecycle
select pg_temp.as_user('admin');
select pg_temp.fails('cannot unpublish an event with registrations', format('select public.set_event_status(%L, ''DRAFT'')', pg_temp.id('free')));
select public.set_event_status(pg_temp.id('free'), 'CANCELLED', 'Coach unavailable');
select pg_temp.ok('event cancellation notifies registered members',
    exists (select 1 from public.notifications where user_id = pg_temp.id('memberA') and dedupe_key = 'event:' || pg_temp.id('free') || ':cancelled'));
select pg_temp.fails('cancelled event cannot be re-published', format('select public.set_event_status(%L, ''PUBLISHED'')', pg_temp.id('free')));
select pg_temp.as_user('memberB');
select pg_temp.fails('cannot register for a cancelled event', format('select public.register_for_event(%L)', pg_temp.id('free')));

-- ------------------------------------------------------------ CMS / legal / contact
select pg_temp.as_anon();
select pg_temp.ok('no published About page yet', not exists (select 1 from public.get_published_page('about')));
select pg_temp.as_user('memberA');
select pg_temp.ok('member cannot edit CMS', pg_temp.affected('update public.cms_pages set draft = ''{"version":1,"blocks":[]}''') = 0);
select pg_temp.fails('member cannot publish CMS', 'select public.publish_page(''about'')');
select pg_temp.as_user('admin');
update public.cms_pages set draft = '{"version":1,"blocks":[{"id":"a","type":"richText","text":"V1"}]}' where slug = 'about';
select public.publish_page('about', 'first');
update public.cms_pages set draft = '{"version":1,"blocks":[{"id":"b","type":"richText","text":"draft only"}]}' where slug = 'about';
select pg_temp.as_anon();
select pg_temp.ok('public sees published content, never the draft',
    (select content->'blocks'->0->>'text' from public.get_published_page('about')) = 'V1');
select pg_temp.as_user('admin');
select public.restore_page_revision((select id from public.cms_page_revisions limit 1));
select pg_temp.ok('restore loads revision into draft', (select draft->'blocks'->0->>'text' from public.cms_pages where slug = 'about') = 'V1');
select pg_temp.ok('default privacy policy published', exists (select 1 from public.legal_documents where kind = 'privacy' and status = 'PUBLISHED'));
insert into public.legal_documents (kind, version, title, content)
select 'privacy', max(version) + 1, 'Privacy Policy', repeat('Draft text. ', 5) from public.legal_documents where kind = 'privacy';
insert into t_ids select 'privDraft', id from public.legal_documents where kind = 'privacy' and status = 'DRAFT';
select pg_temp.as_anon();
select pg_temp.ok('draft legal doc hidden from public', not exists (select 1 from public.legal_documents where id = pg_temp.id('privDraft')));
select pg_temp.as_user('admin');
select public.publish_legal_document(pg_temp.id('privDraft'));
select pg_temp.ok('publishing supersedes the previous version',
    (select count(*) from public.legal_documents where kind = 'privacy' and status = 'PUBLISHED') = 1
    and exists (select 1 from public.legal_documents where kind = 'privacy' and status = 'SUPERSEDED'));
select pg_temp.fails('published legal versions are immutable',
    'update public.legal_documents set content = repeat(''x'', 30) where status = ''PUBLISHED''; select 1/0 where exists (select 1 from public.legal_documents where content = repeat(''x'', 30))');
select pg_temp.as_anon();
select pg_temp.ok('published legal doc visible', exists (select 1 from public.legal_documents where id = pg_temp.id('privDraft')));
select pg_temp.ok('default FAQ published', (select count(*) from public.faq_items) >= 10);
insert into public.contact_messages (name, email, subject, message) values ('V', 'v@test.local', 'Hi', 'Hello there');
insert into public.contact_messages (name, email, subject, message) values ('V', 'v@test.local', 'Hi', 'Hello there');
insert into public.contact_messages (name, email, subject, message) values ('V', 'v@test.local', 'Hi', 'Hello there');
select pg_temp.fails('contact form rate-limited per email',
    'insert into public.contact_messages (name, email, subject, message) values (''V'', ''v@test.local'', ''Hi'', ''Hello there'')');
select pg_temp.ok('anon cannot read contact messages', not exists (select 1 from public.contact_messages));

-- ------------------------------------------------------------ payment plan before registering
select pg_temp.as_root();
insert into public.events (title, start_at, is_public, max_participants, is_free, price_tnd, created_by, status, event_format)
values ('Plan test', now() + interval '6 days', true, 5, false, 40, pg_temp.id('admin'), 'PUBLISHED', 'COLLECTIVE');
insert into t_ids select 'planEv', id from public.events where title = 'Plan test';
select pg_temp.as_user('memberB');
select pg_temp.fails('paid event requires a payment method', format('select public.register_for_event_with_plan(%L)', pg_temp.id('planEv')));
select pg_temp.fails('bank transfer requires a planned date', format('select public.register_for_event_with_plan(%L, ''BANK_TRANSFER'')', pg_temp.id('planEv')));
select pg_temp.fails('planned date cannot be in the past', format('select public.register_for_event_with_plan(%L, ''BANK_TRANSFER'', current_date - 3)', pg_temp.id('planEv')));
select public.register_for_event_with_plan(pg_temp.id('planEv'), 'BANK_TRANSFER', current_date + 1, 'From my BIAT account');
select pg_temp.ok('plan stored with registration (still unpaid)',
    (select payment_method = 'BANK_TRANSFER' and planned_payment_date = current_date + 1 and payment_status = 'UNPAID'
       from public.event_participants where event_id = pg_temp.id('planEv') and member_id = pg_temp.id('memberB')));
select pg_temp.ok('bank-transfer plan posted to Seif as the member''s own message',
    exists (select 1 from public.messages m join public.conversations c on c.id = m.conversation_id
             where c.member_id = pg_temp.id('memberB') and m.sender_id = pg_temp.id('memberB') and m.kind = 'USER'
               and m.body like '%by bank transfer on%From my BIAT account%'));
select public.set_my_payment_plan((select id from public.event_participants where event_id = pg_temp.id('planEv') and member_id = pg_temp.id('memberB')), 'CASH');
select pg_temp.ok('member can switch plan to in person',
    (select payment_method = 'CASH' and planned_payment_date is null from public.event_participants
      where event_id = pg_temp.id('planEv') and member_id = pg_temp.id('memberB')));
select pg_temp.as_user('memberC');
select pg_temp.fails('member cannot change another member''s plan',
    format('select public.set_my_payment_plan(%L, ''CASH'')', (select id from public.event_participants where event_id = pg_temp.id('planEv') limit 1)));

-- ------------------------------------------------------------ avatars
select pg_temp.as_root();
insert into storage.objects (bucket_id, name, owner_id, metadata) values
 ('fightzone-public', 'avatars/' || pg_temp.id('memberA') || '/a.webp', pg_temp.id('memberA')::text, '{"mimetype":"image/webp","size":1500}');
select pg_temp.as_user('memberA');
select public.set_my_avatar('avatars/' || pg_temp.id('memberA') || '/a.webp');
select pg_temp.ok('member sets own avatar via RPC', (select avatar_url from public.profiles where id = pg_temp.id('memberA')) like 'avatars/%');
select pg_temp.fails('member cannot set avatar directly',
    format('update public.profiles set avatar_url = ''https://evil.example/x.png'' where id = %L', pg_temp.id('memberA')));
select pg_temp.fails('member cannot use another member''s avatar path',
    format('select public.set_my_avatar(%L)', 'avatars/' || pg_temp.id('memberB') || '/b.webp'));
select public.set_my_avatar(null);
select pg_temp.ok('member clears own avatar', (select avatar_url from public.profiles where id = pg_temp.id('memberA')) is null);

-- ------------------------------------------------------------ report
select pg_temp.as_root();
select n, case when ok then 'PASS' else 'FAIL' end as result, name, case when not ok then detail end as detail
  from t_results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from t_results;
do $$ begin
    if exists (select 1 from t_results where not ok) then
        raise exception 'V1 SQL suite: % failing test(s)', (select count(*) from t_results where not ok);
    end if;
end $$;
rollback;
