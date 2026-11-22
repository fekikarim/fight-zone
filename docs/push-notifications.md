# Device push notifications

Every row inserted into `public.notifications` (messages, payments, events, badges…) is also pushed to the
user's phones/computers that enabled notifications. Flow:

`notifications INSERT` → trigger `notify_push()` → `pg_net` POST → `/api/push/notify` (secret-checked) →
`web-push` → browser push service → `public/sw.js` shows the notification; clicking opens the deep link.

If the app is open and visible, the OS notification is skipped (the in-app toast already shows it).
If push isn't configured, a hidden tab still raises a local notification via the service worker.

## Production setup (one time — nothing is applied automatically)

1. Generate keys: `npx web-push generate-vapid-keys`
2. Netlify env vars: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:…`),
   `PUSH_WEBHOOK_SECRET` (random 32+ chars). Redeploy (the public key is inlined at build time).
3. Apply migration `20261122000000_v1_web_push.sql` (after a backup).
4. Point the trigger at the site (SQL editor):
   ```sql
   insert into public.push_config(key, value) values
     ('push_webhook_url', 'https://<your-site>/api/push/notify'),
     ('push_webhook_secret', '<same value as PUSH_WEBHOOK_SECRET>')
   on conflict (key) do update set value = excluded.value;
   ```
Until step 4 the trigger does nothing. Remove the two rows to switch push off.

iPhone/iPad: Web Push only works once Fight Zone is added to the Home Screen (iOS 16.4+); the app explains this.

## Local
`sh scripts/dev-local-db.sh` generates git-ignored `.local-push.env` (keys + secret). Point the local DB at your dev server
with the same SQL, using `http://host.docker.internal:3100/api/push/notify`.
