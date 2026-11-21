# Fight Zone V1 — Design & UX redesign audit

Date: 2026-11-20 · Input: `FIGHT_ZONE_V1_DESIGN_REDESIGN_SPECIFICATION.md` · Method: code reading,
local stack (`scripts/dev-local-db.sh`, port 3100) in a real browser as visitor, member and admin,
read-only counts on production (`jdbythhwikqvqenxyuqw`).

## 1. Architecture (unchanged by the redesign)
- Next.js 16.3 App Router, React 19, Server Components by default, server actions in `lib/actions/*`,
  `proxy.ts` for session refresh. Route groups: `(marketing)` public, `(auth)`, `member/`, `admin/`.
- Supabase: SSR client (`lib/supabase/server.ts`), RLS + SECURITY DEFINER RPCs for every write
  (registrations, payments, messaging, attendance, rewards, CMS publish). Authorization is enforced
  in `lib/auth/guards.ts` (server) and the database — never by UI visibility.
- Styling: Tailwind 4 (`@theme inline` in `app/globals.css`), `class-variance-authority` for
  `Button`/`Badge`, `lucide-react` icons, `sonner` toasts. Fonts: Oswald (display), Geist (body).
- Motion: one `Reveal` component (IntersectionObserver + CSS), CSS keyframes, reduced-motion
  handled globally. No animation library — the redesign keeps it that way.

## 2. Route inventory
**Public** `/` · `/events` · `/events/[id]` · `/news` · `/news/[slug]` · `/about` (CMS blocks) ·
`/contact` · `/faq` · `/privacy` · `/terms` · `/sitemap.xml` · `/robots.txt`.
**Auth** `/sign-in` · `/sign-up` · `/forgot-password` · `/reset-password` · `/verify-email` (legacy) ·
`/auth/callback`.
**Member** `/member` · `/member/events` · `/member/events/[id]` · `/member/schedule` ·
`/member/achievements` · `/member/reviews` · `/member/messages` (+ thread) ·
`/member/notifications` · `/member/profile`.
**Admin** `/admin` · `/admin/events` (+ `new`, `[id]`) · `/admin/calendar` · `/admin/payments` ·
`/admin/members` (+ `[id]`) · `/admin/reports` · `/admin/badges` · `/admin/news` (+ `new`, `[id]`) ·
`/admin/reviews` (+ `transformations`) · `/admin/messages` (+ thread) · `/admin/inbox` ·
`/admin/notifications` · `/admin/content` (+ `about`, `faq`, `legal`, `media`, `achievements`) ·
`/admin/settings` (+ `payments`, `contact`, `messages`).

**Not in V1 (not built, will not be invented):** a membership/subscription product (retired with V0;
`/pricing`, `/member/subscription`, `/member/payments` redirect to events), a "sports/disciplines"
table, analytics beyond `/admin/reports`, news categories/related articles. Payments in V1 are
per-event manual payments, which the redesign treats as the "membership & payment" experience.

## 3. Component inventory
`components/ui` (button, card, badge, input, textarea, label, confirm-dialog, form-dialog,
form-feedback, skeleton, spinner, reveal, container, section-heading, image-upload-field,
placeholder-image, app-toaster) · `components/dashboard` (dashboard-shell, page-header,
page-skeletons, live-updates, access-denied) · `components/marketing` (navbar, footer, page-hero,
event-card, news-card, achievement-card, session-card, contact-form, 12 homepage sections) ·
feature folders: events, messages, notifications, payments, badges, cms, site-content, settings,
content, members, member, reviews, motivation, preview.

## 4. Findings

### 4.1 Functional / content-integrity issues (must fix)
| # | Issue | Evidence |
|---|---|---|
| F1 | Hero primary CTA links to `/services` → **404** | `components/marketing/sections/hero.tsx`; route has only a `loading.tsx` |
| F2 | **Invented figures**: `experience_years ?? 15`, "Champion athlete", "15+ years coaching", "Pro-level discipline" shown while production has no coach experience recorded | `stats.tsx`, `about-preview.tsx`, `about/page.tsx` |
| F3 | Homepage "Programs built for fighters" renders an **empty grid** — 0 active sessions in production (V0 product) | `services-preview.tsx` |
| F4 | `siteConfig.url = fightzone.example.com` feeds `metadataBase` → wrong canonical/OG URLs | `lib/site.ts` |
| F5 | Social links are `"#"` placeholders | `lib/site.ts` |
| F6 | 21 orphan `loading.tsx` folders for retired V0 routes (redirected) — dead code, harmless | `app/**/loading.tsx` |
| F7 | Stats strip counts V0 sessions ("Training programs: 0") | `stats.tsx` |

### 4.2 Visual inconsistencies
- Every surface is the same 1px `ink-border` box on near-black; dashboards read as grids of
  identical rectangles with no hierarchy (admin overview: 8 equal metric cards).
- Imagery mixes four unrelated illustration styles (flat vector gym, cartoon boxers, poster
  silhouette, photo collage). No photography of the real gym or coach exists in the repo.
- Brand red is used for small text, borders, pills, badges, icons and buttons at once — it stops
  meaning "act here".
- Radius drifts between `rounded-md`, `-lg`, `-xl`, `-2xl`, `-3xl`, `-full` on similar elements.
- Section headings use 3 different eyebrow styles; status colours differ per screen (registration
  status uses ad-hoc classes in several components).
- Admin and member headers repeat the public nav (Home/About/News/Events) beside the sidebar's own
  "Explore Fight Zone" block.

### 4.3 Responsive
- Admin list pages cap content at ~700px and leave the right half of a 1280px screen empty.
- Dashboard sidebar on mobile is a hamburger drawer only; frequent member tasks (events, messages)
  are two taps away. Hero is `94svh` with a decorative mouse indicator on phones.

### 4.4 Accessibility
- Good base: skip of focus ring, labelled inputs, `prefers-reduced-motion` honoured, readable red
  token for small text. Gaps: some icon-only buttons rely on `title`; status conveyed partly by
  colour; Reveal hides content until JS runs (no-JS users see blank sections).

### 4.5 Performance
- Hero/section images are 1.5–4.9 MB sources (served through `next/image`, so delivered sizes are
  fine; source weight only matters for build/cache). Two display font weights unused.
- Homepage issues 9 parallel Suspense data loads, several for V0 tables that are empty.

## 5. Tools evaluated
| Tool | Decision |
|---|---|
| Browser pane (screenshots, viewport emulation, a11y tree) | **Used** for every visual check |
| Supabase MCP (read-only counts) | **Used** to check what real content exists |
| `design-taste-frontend` skill | Principles adopted (headline names the subject, no invented figures, hover feedback on every link/card, equal edges, no image captions, one entrance per hero). Its static kit/CSS/gate **not** adopted: it would create a second design system inside the Next.js app (spec §2.5) and its stock-photo search downloads files (needs owner approval) |
| Framer Motion / GSAP | **Not added** — the required motion (reveals, stagger, hover, dialogs) is achievable with CSS + the existing IntersectionObserver at zero bundle cost |
| Figma MCP | Requires authorization; not needed |

## 6. Implementation sequence
1. Tokens + primitives (`globals.css`, Button, Card, Badge/StatusBadge, inputs, PageHeader,
   EmptyState, MetricCard) — propagates to every page.
2. Shells: public navbar/footer; dashboard shell (member + admin) with a mobile tab bar.
3. Public: homepage rebuilt on real data only (fixes F1–F3, F7), events, event detail, news,
   about, contact, FAQ, legal, auth.
4. Member: dashboard, events, achievements, messages, notifications, profile.
5. Admin: dashboard, events, payments, members, CMS, settings, reports, calendar.
6. Motion polish, responsive + a11y QA (320–1920), gates, report.
