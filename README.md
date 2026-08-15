# Fight Zone — Gym Platform

Production foundation and marketing website for **Fight Zone**, a boxing / kickboxing gym coached by **Seif Dridi**.

Built with **Next.js 16** (App Router, Turbopack) + **Supabase** (Postgres, RLS, auth, storage).

## Stack

- **Next.js 16** — App Router, server components, server actions, `proxy.ts` (replaces `middleware.ts`) for session refresh
- **Supabase** — Postgres schema, Row Level Security, Supabase Auth, Storage
- **React Hook Form + Zod** — form validation (client + server)
- **Tailwind CSS 4** — dark "arena" theme (bg `#0a0a0a`, accent `rose-600`), Oswald display + Geist

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local database (optional, requires Docker)

The Supabase schema lives in `supabase/migrations/` and demo data in `supabase/seed.sql`. To run a full local stack:

```bash
npm run db:start    # supabase start (local Postgres + Studio + auth)
npm run db:reset    # supabase db reset --local (apply migrations + seed)
```

The seed creates demo users:

| Email | Password | Roles |
| --- | --- | --- |
| `coach@fightzone.example` | `Coach-1234` | ADMIN, COACH |
| `member@fightzone.example` | `Member-1234` | MEMBER |

### Remote project

The linked remote project is `jdbythhwikqvqenxyuqw` (eu-west-1). Useful scripts:

```bash
npm run db:push     # push local migrations to the remote database
npm run db:types    # regenerate types/database.types.ts from remote
```

## Project layout

```
app/
  (marketing)/       Public site: /, about, services, events, news, contact
  (auth)/            sign-in, sign-up, forgot-password, reset-password
  member/            Member dashboard (/member, requires sign-in)
  admin/             Admin/coach area (/admin, requires ADMIN or COACH)
components/
  marketing/         Public site sections, page hero, contact form
  dashboard/         Shared member/admin shell
  ui/                Button, Badge, Card, Input, reveal, etc.
lib/
  supabase/          client / server / admin clients + config + typed queries
  actions/           Server actions: auth, contact
  auth/guards.ts     requireUser / requireRole (DB-backed roles)
  validations/       Zod schemas
supabase/migrations/ Schema, RLS, storage — applied & versioned
types/database.types.ts  Generated Supabase types
```

## Auth & authorization

- Auth flows are server actions in `lib/actions/auth.ts` (sign-in, sign-up, password reset via email recovery codes).
- Role checks use **database-backed roles** via `user_role_assignments` — never client input.
- `proxy.ts` refreshes the Supabase session on matched routes; `lib/supabase/server.ts` reads the server session.

## Database / security notes

- All tables are behind RLS (see `supabase/migrations/20260815000500_rls.sql`).
- Anonymous visitors can read public content (`sessions`, `achievements`, `events`, `news`, `media`, `coach_profiles`) and submit the contact form; private tables are denied.
- Public helper function `get_public_coach()` is exposed for anonymous reads.

## Known gaps / next steps

- Admin CRUD modules (bookings, messages, content) are placeholders behind the guard.
- Remote database has no seed content yet; the public site shows branded empty states until data is added via the admin area.
