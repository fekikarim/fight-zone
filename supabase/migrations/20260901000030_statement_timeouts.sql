-- Phase 16 reliability hardening: bound server-side wait times for the
-- PostgREST-facing roles. statement_timeout was already set in Prompt 13
-- (anon=3s, authenticated=8s); this adds guards against idle-held
-- connections and unbounded lock waits. Idempotent via ALTER ROLE.

ALTER ROLE anon SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE authenticated SET idle_in_transaction_session_timeout = '15s';

ALTER ROLE anon SET lock_timeout = '5s';
ALTER ROLE authenticated SET lock_timeout = '5s';
