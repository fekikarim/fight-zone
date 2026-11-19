# Fight Zone V1 — Release checklist (owner approval required)

V1 code depends on 9 new migrations. **Code and migrations must ship together.** Never deploy the V1
code before the migrations are applied, or the live site will query columns that don't exist.

## 0. Pending migrations (local == tested, remote == not applied)
```
20261118000000_v1_enums.sql
20261118000100_v1_core.sql
20261118000200_v1_messaging.sql
20261118000300_v1_events_registrations.sql
20261118000400_v1_attendance_gamification.sql
20261118000500_v1_cms_storage.sql
20261118000600_v1_reporting.sql
20261119000000_v1_payment_plan.sql
20261119000100_v1_default_content.sql   (publishes default Privacy/Terms v1 + FAQ only if none exist)
```
All are additive/corrective: no table/column drops, no data deletion. Existing data is backfilled
(1 registration, 4 events → `status = PUBLISHED`; private-event registrants get an invitation).

## 1. Before (owner)
- [ ] Take a backup: Supabase dashboard → Database → Backups (or `pg_dump`) — confirm restore point.
- [ ] Confirm Netlify env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `RESEND_*`, AI keys (unchanged).
- [ ] Supabase Auth → Providers → Email: "Confirm email" OFF (owner decision, already in code).
- [ ] Pick a quiet time (no event starting within the hour).

## 2. Apply (owner approves, then)
```bash
npm run db:link        # once
npx supabase db push --dry-run   # must list exactly the 9 files above
npx supabase db push
npm run db:types       # regenerate types from the live schema; diff should be ~empty
```
Then push the V1 commit to `main` (Netlify deploys).

## 3. Verify (post-deploy smoke, ~15 min)
- [ ] `/`, `/events`, `/about`, `/faq`, `/contact`, `/privacy`, `/terms` load (anonymous).
- [ ] Seif signs in → lands on `/admin`; dashboard figures load.
- [ ] Settings: enter bank-transfer instructions, contact details (only real ones).
- [ ] Create a draft event → publish → visible on `/events`.
- [ ] Test member (Seif's own second account): register → payment panel → upload proof →
      Seif confirms in `/admin/payments` → member sees "Payment confirmed" + Fight Zone message.
- [ ] Message thread both ways; read receipt updates.
- [ ] Private event: invited member sees it, another member gets 404.
- [ ] Record attendance after an event; badge awarded if a badge exists.
- [ ] Delete the test registration data afterwards via the admin UI (cancel) — never by SQL.

## 4. Rollback
- Code: redeploy the previous Netlify deploy (instant).
- Schema: migrations are additive; the previous code keeps working against the new schema **except**
  member self-registration (V0 inserted directly into `event_participants`, which V1 revokes) and the
  V0 "start conversation" flow. If a full rollback is needed, restore the backup from step 1.
- Data written after the release (registrations/payments/messages) would be lost by a backup
  restore — prefer forward fixes.

## 5. Owner decisions still open (safe defaults active)
See `V1_REPORT.md` §7.
