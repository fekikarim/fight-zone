# Observability & Operational Runbook — Fight Zone

Status: **UNVERIFIED (no provider deployed)** — this document is the
provider-neutral contract. When a log drain / monitoring provider is
connected, implement the integration points below and re-classify as
ACTIVE after a live alert drill.

Application log format: single-line JSON prefixed `[fight-zone] `
(see `lib/errors.ts`). Every record carries:

| Field | Meaning |
|-------|---------|
| `ts` | ISO-8601 timestamp (UTC) |
| `level` | `error` \| `warn` (`warn` = graceful degradation, page still serves) |
| `domain` | area: `db`, `auth`, `bookings`, `notifications`, `query`, `boundary`, … |
| `op` | stable operation label (e.g. `bookings-select`, `stats`, `create`) |
| `msg` | human message |
| `category` | stable classification: VALIDATION, AUTHENTICATION, AUTHORIZATION, NOT_FOUND, CONFLICT, DB_CONSTRAINT, DB_PERMISSION, SCHEMA_MISSING, TIMEOUT, CONNECTIVITY, RATE_LIMIT, UNKNOWN |
| `dbCode` | SQLSTATE / PostgREST / GoTrue code when present |
| `ctx.requestId` | per-request correlation id minted by the proxy (`x-request-id`, also echoed on responses) |
| `durationMs` | when measured |
| `err` | sanitized error surface (name/message/code/details/hint) |

Secret-safety: keys matching password/token/secret/auth/cookie/api-key/
credential/refresh are redacted; strings truncated; raw user payloads are
never logged. One underlying failure emits one actionable record
(dedup registry on the error/cause chain; framework echo lines from Next
(`⨯ …`) are unstructured noise, not application logs).

## Signals & thresholds (provider-neutral)

| Signal | Source | Warn threshold | Critical threshold |
|--------|--------|----------------|--------------------|
| Availability | synthetic uptime probe `/` every 60s | 2 consecutive failures | 5 failures or 5 min down |
| 5xx rate | HTTP layer / edge logs | >1% over 5 min | >5% over 5 min |
| Latency | TTFB p95 per route | >1.5s for 10 min | >3s for 5 min |
| Database connectivity | logs `category=CONNECTIVITY` or `dbCode IN (57P05)` | ≥3 in 5 min | any sustained 5-min window |
| Failed Server Actions | logs `domain∈actions, category≠VALIDATION` rate | ≥5/min sustained 5 min | ≥20/min or any DB_PERMISSION burst |
| Authentication anomalies | logs `category=AUTHENTICATION` per IP/account | ≥10 failures / account / 15 min | credential-stuffing pattern (≥50/IP/15min) |
| Authorization denials | logs `category=AUTHORIZATION` or `DB_PERMISSION` | ≥3/min | any spike post-deploy |
| Booking failures | logs `domain=bookings, level=error` | ≥3 in 10 min | ≥1/hr sustained 30 min |
| Notification failures | logs `domain=notifications` | ≥3 in 15 min | repeated retries ≥3× same op |
| Repeated retries | identical `domain+op+category` ≥5× / 5 min | warn | critical if business-domain |

## Severity & escalation

| Severity | Examples | Response | Owner |
|----------|----------|----------|-------|
| SEV1 | site down, DB outage, booking writes failing | page on-call immediately; status note; rollback if deploy-correlated | Project owner (Karim) — solo project: owner = on-call |
| SEV2 | 5xx >5%, auth broken, RLS misconfig | respond within 1h; use digest/requestId triage below | owner |
| SEV3 | degraded sections (warn logs), latency warnings | same-day review | owner |
| SEV4 | single transient CONNECTIVITY blip | weekly review | owner |

Escalation path (solo project): owner → Supabase support (platform
incidents) → hosting provider support. Documented contact points to be
attached when the monitoring provider is chosen.

## Retention

- Application logs: retain ≥30 days hot (searchable), 90 days archive.
- Access/edge logs: ≥7 days hot.
- Alert history: ≥12 months.
- Configure at the provider; Supabase platform logs follow Supabase's own retention.

## Incident triage without local reproduction

1. Grab `x-request-id` from the user report / response header.
2. Filter logs by `ctx.requestId` → full server-side chain of that render/action.
3. Read `category` + `dbCode`: e.g. `DB_PERMISSION/42501` = grants/RLS
   regression; `TIMEOUT/57014` = statement timeout hit; `CONNECTIVITY` =
   network/outage; `CONFLICT/23505` = expected duplicate-slot rejection.
4. Client-side boundary records (`domain=boundary`) share the Next `digest`
   printed by the server echo line — correlate across channels via digest.
5. Business-state checks run against the database directly (RLS-scoped
   reads) — never reproduce by mutating production data.

## Integration point (when a provider is chosen)

- Ship stdout/stderr (JSON lines already structured) via the hosting
  platform's log drain (e.g. Vercel Log Drains → Datadog/Axiom/Logtail).
- Parse rule: lines starting `[fight-zone] ` → strip prefix → JSON.
- Alerts: threshold queries from the table above expressed as provider
  saved-searches/monitors on `level`, `category`, `dbCode`, `domain`.
- Uptime: external synthetic probe (provider-independent).
- Until then: **monitoring classification = UNVERIFIED**; logging itself is
  ACTIVE and verified (see Phase 17 evidence in docs/production-readiness.md).
