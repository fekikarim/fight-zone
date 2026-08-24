# Disaster Recovery Runbook — Fight Zone

Status: **RESTORE PROCEDURE REHEARSAL VERIFIED** (2026-08-24, isolated
local PostgreSQL 17 rebuild from a production export). This proves the
restore procedure works — it does NOT prove the existence of production
backups. Provider-managed backups and PITR are confirmed **NOT AVAILABLE
ON THE CURRENT PLAN** (Free); see "Platform backup configuration" below.
The database currently has NO automated backup service.

## Ownership & escalation

| Role | Person | Responsibility |
|------|--------|----------------|
| Owner / on-call | Karim Feki (solo project) | triggers recovery, approves restores, contacts Supabase support |
| Platform escalation | Supabase Support (dashboard ticket) | platform outages, PITR point selection |
| Hosting escalation | deployment platform support | app-layer rollback |

Escalation order: owner -> Supabase support -> hosting support. Secrets
are never shared over chat/tickets; access is granted by role-scoped
credentials minted inside the platform.

## Targets

| Metric | Target | Actual today |
|--------|--------|--------------|
| RPO | Desired: <=5 min (PITR) or <=24h (daily snapshots). **Provider-managed backup RPO is currently unavailable on the Free plan** — no scheduled backups, no PITR. The pg_dump contingency in section 1 is ad-hoc only; it does NOT currently reduce RPO because it is not scheduled, not encrypted at rest, and has been run once. Until a scheduled + encrypted + restore-tested export process exists, RPO is effectively **unbounded** (data loss since the last manual export would be unrecoverable). | unbounded (no active automated backups) |
| RTO | <=4h | **<2 minutes** database rebuild on restored copy once a dump exists (export ~35s, schema restore 0.8s, data populate <1s); app redeploy adds CI time. Note: RTO is only meaningful when a recent dump exists — see RPO above. |
| Evidence retention | 12 months | verification logs in `.p18/` (PII-bearing dumps deleted post-rehearsal) |

## Verified procedures

### 1. Database export — operator-managed contingency (NOT an active backup service)

Classification: **CONTINGENCY PROCEDURE ONLY**. This is a documented,
rehearsed method to produce an ad-hoc dump. It is not an automated
backup service and must not be relied on as one.

| Attribute | Actual status |
|-----------|---------------|
| Frequency | Ad-hoc only — executed once during the 2026-08-24 rehearsal; **no schedule exists** |
| Encrypted storage | **None configured** — dumps were written to local disk and deleted after verification |
| Owner | Project owner, performed manually |
| Restore test status | Procedure tested once end-to-end in isolated rehearsal (section 2) with full parity; **not** a recurring tested process |
| RPO impact | **None today.** RPO is only reduced once the process is scheduled, encrypted at rest, and re-tested periodically |

Native pg_dump against the session pooler (no Docker required):

```bash
CREATE ROLE backup_reader LOGIN PASSWORD '<generated>';
GRANT pg_read_all_data TO backup_reader;

pg_dumpall --roles-only -d "postgresql://backup_reader.<ref>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" -f roles.sql
pg_dump --schema-only --no-owner --no-privileges -d "<dsn>" -f schema.sql
pg_dump --data-only   --disable-triggers        -d "<dsn>" -f data.sql
```

Measured: roles 3.7s / schema 20.7s / data ~7s at current size.
`supabase db dump` needs Docker (unavailable here). RLS-protected tables
(auth.*, staff-scoped public rows) are not readable by a plain reader
role — full-fidelity auth-data export requires the postgres role or the
platform's own backup.

If this contingency is ever activated as the primary safeguard, it must
gain: a cron/scheduled run, encrypted-at-rest storage (e.g. age/GPG
before upload), retention policy, and periodic restore drills — none of
which exist today.

### 2. Restore into clean PostgreSQL 17 (rehearsed end-to-end)

```bash
initdb -D $CLUSTER -U restore_admin --auth=trust -E UTF8
pg_ctl -D $CLUSTER -o "-p 5433" start
createdb fightzone_restore
psql -f roles.sql && psql -f schema.sql
```

Data population used type-safe JSON round-trips
(`jsonb_populate_recordset`) generated per table; row counts matched
production exactly: profiles 2, roles 3, user_role_assignments 2,
membership_plans 6, transformation_stories 2, buckets 2,
storage.migrations 65, auth.users 2, identities 2, sessions 1,
refresh_tokens 2. Gotchas captured: exclude generated columns
(`auth.users.confirmed_at`, `auth.identities.email`); use
`session_replication_role = replica` during load; roles.sql before
schema.sql.

### 3. Post-restore validation checklist (all passed)

- [x] Schema parity vs production: 25 tables, 75 policies, 34 functions, 27 triggers, 25 RLS-enabled tables
- [x] Auth integrity: both users confirmed + bcrypt hashes intact
- [x] Buckets restored with correct flags (fightzone-public public=t, fightzone-private public=f)
- [x] Anonymous deny-by-default: 0 rows from auth.users / profiles / storage.buckets as role anon
- [x] Member isolation with synthetic JWT claims (`request.jwt.claims`): authenticated sees exactly own profile; auth.uid() resolves
- [x] All supabase roles recreated (anon/authenticated/service_role/authenticator/...)
- [~] `/api/health` probe added and verified via typecheck/lint/build —
  but NOT exercised live against the restored DB before cluster teardown;
  re-run this check during any future restore drill

Observation: no ADMIN assignment exists in production today (both real
users MEMBER). Grant via user_role_assignments when staff ops begin.

### 4. Storage / media recovery — kept separate from database recovery

Bucket METADATA restores with the DB dump. Object BYTES are a distinct
recovery problem and are classified separately:

- Current object count = 0 (nothing to recover today).
- No provider-managed storage-object backup exists on the Free plan;
  bucket metadata parity from the rehearsal must not be read as object
  recoverability.
- Once media exists: re-upload from source assets or enable
  provider-level storage replication; verify via storage.objects counts
  + spot-download checksums.
- Classification until exercised with real objects: **UNVERIFIED**.

### 5. Environment & secret recovery

Values live only in Supabase dashboard and local gitignored `.env.local`;
`.env.example` lists keys without values. Recovery: Project Settings ->
API re-copy; rotate publishable key there if compromised; service key
stays server-side. Rotation flow: rotate -> update deploy secrets ->
redeploy -> curl /api/health.

### 6. Migration rollback / compensating migrations

28 migrations synced local<->remote. Reversals ship as NEW forward
migrations. Rehearsed on the restored copy:
compensation cleared the three role timeout settings (0 errors), then
re-applying the original migration restored them — full cycle proven.
Rules: never edit applied history; one compensation per migration;
always test on a restored copy first.

### 7. Application rollback & health checks

1. Detect bad release: /api/health (expect 200 {ok:true}) + structured
   [fight-zone] logs triaged by requestId/digest.
2. Rollback: redeploy previous tag or git revert -> deploy -> poll
   /api/health to 200 -> smoke home page renders.
3. Data-layer rollback: use section 6; never hand-edit production rows
   outside an approved change record.

## Platform backup configuration — confirmed by owner (2026-08-24)

Owner-verified from Dashboard -> Database -> Backups for project
`jdbythhwikqvqenxyuqw`:

| Capability | Status |
|------------|--------|
| Plan tier | **Free plan** (confirmed) |
| Scheduled project backups | **NOT AVAILABLE ON CURRENT PLAN** (Pro provides up to 7 days of scheduled backups) |
| PITR | **NOT AVAILABLE ON CURRENT PLAN / NOT ENABLED** (Pro Plan add-on) |
| Backup retention | **N/A on current plan** — no scheduled backups exist, so no provider-managed retention window applies; any retention would be operator-defined only |
| Restore to a new project | **UNAVAILABLE ON CURRENT PLAN** — requires Pro or above with physical backups enabled |

Consequences:

- **There is currently no provider-managed backup of this database.**
  Data loss since the last manual export is unrecoverable.
- RPO claims tied to Supabase daily backups or PITR are invalid for this
  project and must not be made anywhere in documentation or reports.
- The pg_dump procedure in section 1 is the only recovery source and is
  an ad-hoc contingency, not an active automated backup service.
- Whether to upgrade to a plan with scheduled backups/PITR is a separate
  owner business decision and is intentionally out of scope for
  implementation prompts. No upgrade action is recommended or performed
  here. Until such a decision, this limitation stands as an **accepted
  operational blocker** recorded in `docs/production-readiness.md`
  (Phase 18) and in the header of this file.
