# Device push notifications

Every row inserted into `public.notifications` (messages, payments, events, badges…) is also pushed to the
user's phones/computers that enabled notifications. Flow:

`notifications INSERT` → trigger `notify_push()` → `pg_net` POST → `/api/push/notify` (secret-checked) →
`web-push` → browser push service → `public/sw.js` shows the notification; clicking opens the deep link.

If the app is open and visible, the OS notification is skipped (the in-app toast already shows it).
If push isn't configured, a hidden tab still raises a local notification via the service worker.

## Production setup

1. Generate keys once: `npx web-push generate-vapid-keys`
2. Netlify env vars: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:…`). Redeploy
   (the public key is inlined at build time). `PUSH_WEBHOOK_SECRET` is optional — the secret now lives in the database.
3. Migrations `20261122000000_v1_web_push.sql` and `20261124000000_v1_push_timeout.sql` (after a backup).
4. Switch it on (SQL editor) — the secret is generated inside the database and never leaves it:
   ```sql
   insert into public.push_config(key, value) values
     ('push_webhook_url', 'https://<your-site>/api/push/notify'),
     ('push_webhook_secret', encode(gen_random_bytes(24), 'hex'))
   on conflict (key) do update set value = excluded.value;
   ```
5. Health check: `GET https://<your-site>/api/push/notify` → `{"vapidPublicKey":true,"vapidPrivateKey":true,"canSend":true}`.
   Every device's state is also shown under Notifications → "Notifications on this device" (with a Retry on errors).

Remove the two `push_config` rows to switch push off.

## When does an alert arrive?
| Situation | Works? |
|---|---|
| Android, app installed or just Chrome, app closed | Yes |
| iPhone/iPad (iOS 16.4+), app **installed to Home Screen**, closed | Yes — permission must be asked from inside the installed app |
| iPhone in plain Safari (not installed) | No (Apple limitation) — the app shows how to install |
| Computer, browser running (even with the site's tab closed) | Yes |
| Computer, browser fully quit | No — browsers only receive push while running (enable "continue running background apps" in Chrome/Edge settings) |

Every push shows a notification (required by iOS/Chrome). When the app is in front it is silent and auto-dismissed.
A device whose subscription was made with an old key is dropped and re-registered automatically on next open.

## Local
`sh scripts/dev-local-db.sh` generates git-ignored `.local-push.env` (keys + secret). Point the local DB at your dev server
with the same SQL, using `http://host.docker.internal:3100/api/push/notify`.
