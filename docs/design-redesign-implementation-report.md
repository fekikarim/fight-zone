# Fight Zone V1 — Design & UX redesign: implementation report

Date: 2026-11-20 · Spec: `FIGHT_ZONE_V1_DESIGN_REDESIGN_SPECIFICATION.md` · Audit:
`docs/design-redesign-audit.md` · System: `docs/design-system.md`, `docs/motion-guidelines.md` ·
QA: `docs/responsive-qa.md` · Screenshots: `docs/redesign-screenshots/`.

**Status: implemented and verified locally. Not deployed** (no commit/push made; production untouched).

## 1. Summary
Fight Zone kept its brand (black, crimson, Oswald) and gained a real system around it: semantic
tokens, a tight radius scale, a type scale, a status vocabulary and one signature shape — the
logo's 12° shear — used for eyebrows, active navigation, tags and frames. The mismatched cartoon
library is unified by a duotone treatment so it reads as one poster series. All three portals were
rebuilt on these foundations; every data-driven block shows real records only.

Content-integrity fixes shipped with the redesign (also visible in production today):
- Homepage CTA linked to `/services` (404) → now `/events`.
- Invented figures removed: "15 years" fallback, "Champion athlete", "15+ years coaching", and on
  `/about` "100+ athletes trained" / "∞ dedication". Facts appear only when Seif records them.
- Empty "Programs" grid (0 sessions in production) removed; sections hide when they have no data.
- Article bodies used `prose` classes without the typography plugin (paragraphs collapsed) → now
  rendered with the shared `RichText`.

## 2. Public portal
Navigation (active slant underline, full-screen mobile menu, Escape) · Footer (wordmark band, settings-
driven contact) · **Homepage** rebuilt: type-led hero with the real next event as a ticket, three
disciplines, upcoming events (honest short-row tile), "four rounds" how-it-works on a light band,
coach (real profile only), palmares/transformations/testimonials/gallery only when data exists,
editorial news, closing statement · Events listing (Upcoming/Past switch, type tabs, live count,
empty states) · Event detail (duotone banner, two-column layout with sticky "ticket", one h1) ·
News listing (feature + grid, category tabs) · Article (reading measure, RichText) · About (real
data, CMS blocks restyled) · Contact (layout fix) · FAQ (search + topics + accordion) · Privacy/Terms
(table of contents, version history) · Sign-in/up and password pages (split layout, danger-token errors).

## 3. Member portal
Shell (grouped sidebar, slant active marker, top bar with notification dot, bottom tab bar, drawer)
· Dashboard (personal hero with attended count, payment alerts, next-event ticket, progress, live
shortcut tiles, lists) · Events (shared StatusBadge for registration/payment/attendance) · Event
detail (registration & payment-plan panel inside the ticket) · Achievements, messages,
notifications, profile, schedule, reviews inherit the system (page headers, chips, tokens).

## 4. Admin portal
Shell (Operate / Engage / Publish / Insight groups) · Overview (money-first panel, attention queue in
warning tone, compact KPI strip, next events with capacity bars, activity timeline; invalid `<dl>`
markup fixed) · Events (data table on desktop, rows on phones, StatusBadge, capacity bars) · Event
detail (title in header, stat tiles, ticket layout) · Payments (evidence tile, review badge, amount
mismatch warning, empty state) · Members (search, inactive badge, button pagination, empty state) ·
Calendar, reports, badges, news, content/CMS, settings, messages, inbox, notifications inherit the
system and section eyebrows.

## 5. Design system
See `docs/design-system.md`. Key components added/refined: `Button` (+danger), `Badge` (+status
tones, dot), **`StatusBadge`** (one label+tone per backend status), `Card`, `PageHeader` (eyebrow),
`PageHero`, `SectionHeading` (index, light tone), `EmptyState` (panel/inline), `EventCard`,
`NewsCard` (default/feature/compact), `AchievementCard` (text-led), shared field style
(`components/ui/field-styles.ts`), `Reveal` (fade/stagger). Motion: CSS + IntersectionObserver only.

## 6. Engineering
- **No dependencies added or removed.** No database, RLS, RPC or server-action changes.
- `getCurrentUser` now resolves avatar storage paths to URLs (`lib/avatar.ts`) — the shell and navbar
  previously received a raw path.
- Duotone/skeleton rules live in `@layer components` so utilities can override them.
- `html.js` gate: content is only hidden for scroll reveal when JavaScript runs.
- Skip link + `#main` on every layout; 16 px inputs on phones; `aria-current` on all nav/tab links.
- Orphans removed (made unused by the homepage rebuild): `sections/stats.tsx`,
  `sections/services-preview.tsx`, `marketing/session-card.tsx`.

## 7. Testing (actual results)
| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint app components lib --quiet` | ✅ 0 problems |
| `npm test` | ✅ 104/104 (22 + 10 + 40 + 32) |
| `npm run test:db` | ⚠️ 106/109 on the live local DB — the 3 failures are global ledger sums broken by the 30 TND payment I recorded through the UI during QA. Re-run in the same transaction with that row set aside: ✅ **109/109**; race ✅ 20/20 |
| `npx next build` | ✅ success |
| Browser: visual (1440, 390, 320) | ✅ see `responsive-qa.md`, 13 screenshots |
| Browser: workflow | ✅ coach records in-person payment → toast, badge "Paid", counter updates; sign-in/out; navigation |
| Homepage perf (dev server) | LCP ≈ 1.1 s, CLS 0, 5 images / 208 KB |
| Lighthouse / axe | ❌ not run (no tool in this environment) |

## 8. Remaining issues & owner input
1. **Photography** — the repo contains only illustrations. The duotone makes them consistent, but real
   photos of the gym, Coach Seif and events (uploaded through the admin) would lift every page. No stock
   photos were downloaded (needs your approval and licensing choice).
2. **Coach profile in production is empty** (no experience, specialization, biography) → coach and
   About sections show a neutral line instead of facts. Fill it in to show them.
3. **`lib/site.ts`** still has `url: fightzone.example.com` (wrong canonical/OG URLs) and `#` social
   placeholders (unused by the footer, which reads Settings). Needs the real domain confirmed
   (`https://fight-zone.app`?).
4. Seed coach account also holds the MEMBER role, so it can open `/member` (pre-existing, not changed).
5. 21 orphan `loading.tsx` files for retired V0 routes remain (harmless; listed in the audit).
6. Not done: news related-articles by category, dedicated analytics charts (reports page unchanged
   apart from tokens), per-page screenshot audit at 768/1024/1920, real-device and screen-reader tests.
7. Local DB contains one recorded 30 TND test payment from QA (local only).

## 9. Follow-up round (2026-11-21)
- **Mobile menu fixed:** the full-screen menu panel was a `position: fixed` child of the header, whose
  `backdrop-filter` made the header its containing block, so on phones the panel collapsed into the
  64 px bar (only the close button was visible). The panel now renders outside the header, slides in,
  locks page scroll and closes on Escape. Verified at 375 px (panel 748 px tall). Other fixed overlays
  (dialogs, dashboard drawer, bottom tab bar) were checked and are not inside a blurred or transformed
  parent.
- **Daily motivation redesigned as "Corner talk":** no blocking dialog or spinner any more. The line is
  fetched silently once the page is idle and only plays when ready (and only when the tab is visible):
  a full-screen crimson wipe on the logo's angle, the member's first name, the line rising word by word,
  "Today's round" action, one "Let's go" button. Plays once per day per session; the dashboard card
  ("Corner talk · Category", poster style) can replay it. Reduced motion shows it static.
- **AI prompt** rewritten in a corner-coach voice (second person, ≤170 characters, concrete gym
  imagery, a short imperative action every time). No personal data is sent to the AI providers; the
  name is added on screen only. All 29 fallback lines now carry an action too.
- Gates: tsc 0 · eslint 0 · npm test 104/104 · next build ✅. Screenshots 14–17.
