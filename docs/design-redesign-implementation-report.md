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

## 10. Portal redesign — app shell (2026-11-21)
The member and coach portals no longer use a sidebar/admin layout:
- **Floating glass top bar** (logo, portal name, notifications with count, avatar menu with profile/
  settings, public site, sign out) and a **floating dock** (iOS tab-bar style) on phones *and* desktop
  with four pinned destinations + **More**, which opens a bottom sheet (phones) / floating panel
  (desktop) of large tiles grouped by section. Escape closes; scroll is locked while open.
  Member dock: Home · Events · Badges · Messages. Coach dock: Home · Events · Payments · Messages.
- **Member home:** "Let's go, {name}" hero with an activity-style progress ring (attended → next badge),
  round quick actions with live counts, payment alerts, an "Up next" event poster with countdown,
  the corner-talk card, and swipeable rails (open events, news).
- **Coach home:** "Today, {name}" scoreboard (confirmed income / still to collect, 7-30-90 day switch),
  round quick actions, "Your queue" tiles, "Next up" poster with a capacity ring, swipeable stats and
  upcoming-event rails, latest activity.
- Inside the shell the radius scale is softer (`.app-shell` overrides the theme variables), so every
  inner page reads as an app; the public site keeps its tight poster radius.
- Gates: tsc 0 · eslint 0 · npm test 104/104. Screenshots 18–22.
- **Inner pages (follow-up):** shared `EventTile` (duotone art + date stamp, title, status badges;
  coach version adds a capacity bar) replaces the member event rows and the coach events table;
  `AppTabs` pill filters on events, payments; remaining filters (notifications, registrations, contact
  inbox) restyled as pills; members as avatar cards; coach messages as chat-app conversation cards;
  round search fields. Screenshots 23–25. Gates: tsc 0 · eslint 0 · npm test 104/104.

## 11. Messaging redesign (chat-app experience)

- **Phones:** chat routes (`/member/messages`, `/admin/messages/[id]`) go full-screen. The floating top bar and dock hide and the thread owns the viewport, with safe-area insets. The coach inbox (`/admin/messages`) keeps the app shell.
- **Desktop:** the coach gets a split view, with the inbox (search, "New message to…", conversation cards) on the left and the chat card on the right. The member chat is one centred card.
- **Thread (`components/messages/message-thread.tsx`):**
  - chat header with an avatar, online dot, live "typing…" subtitle and actions (call, email, profile for the coach);
  - iMessage-style grouped bubbles (crimson gradient for mine, ink for theirs);
  - sticky day pills, automatic Fight Zone notices as cards, Sent/Seen under the last bubble;
  - typing dots, a "New messages" jump pill and an image lightbox.
- **Composer:** a floating pill with an attach button, an auto-growing textarea and a send button that scales in when there is something to send. Enter sends on desktop and makes a new line on touch devices. The focus ring sits on the pill.
- **Starting a chat:** an empty conversation shows "Say hi" with one-tap suggestion chips (member side).
- **Scrolling:** the thread stays pinned to the latest message while photos load.
- **New components:** `conversation-list.tsx`, `inbox-panel.tsx`; `new-conversation-picker.tsx` restyled.
- **Screenshots:** 26–30.

## 12. Dock, select and date pickers

- **Dock:**
  - icon over label up to `lg`, and icon beside label (sized to content) on desktop;
  - count badges are pinned to the icon, so they can no longer spill out of the active pill;
  - tighter padding and labels below 360px, checked at 320, 375, 768, 1024 and 1440px with no truncation or overflow.
- **`components/ui/select.tsx`:**
  - a drop-in replacement for `<select>` (same props and `<option>` children) that keeps a hidden native select, so FormData, `register` and `required` keep working;
  - a listbox popover on desktop and a bottom sheet on phones;
  - a check mark on the chosen option and search when there are more than 8 options;
  - full keyboard support (arrows, Home/End, typeahead, Enter, Esc).
- **`components/ui/date-input.tsx`:**
  - a drop-in replacement for `type="date"` and `type="datetime-local"` that keeps native min/max/required validation;
  - a Monday-first calendar with today marked, disabled out-of-range days and month/year quick jump;
  - hour and minute columns for date-time fields, plus Today, Clear and Done;
  - arrow / PageUp / PageDown keyboard navigation.
- **`components/ui/floating-panel.tsx`:** the shared surface for both pickers. It is portalled (never clipped by dialogs), flips above the field when there is no room below and closes on Esc or an outside click.
- **Rollout:** all 26 selects and 12 date fields, across 18 files, were switched over.
- **Screenshots:** 31–34.

## 13. Profile photo header

- **One identity header:** `components/member/avatar-uploader.tsx` replaces the separate avatar, buttons and email/Member row.
- **Avatar:** a large circle (112–128px) with a crimson gradient ring and a permanent camera badge. Tapping or clicking the circle changes the photo, and on desktop you can also drag a photo onto it. Hovering shows a "Change" overlay; during an upload or removal the overlay shows a spinner.
- **Identity:** a status chip, the name (display type) and the email, truncated with the full email on hover.
- **Actions:** a primary "Change photo" / "Add photo" pill and a quiet "Remove" pill. Remove needs a second tap ("Tap to confirm", resets after 3.5s).
- **Preview:** the new photo appears straight away while it uploads.
- **Layout:** centred, with equal-width buttons, on phones; a row from 640px. Checked at 320, 375, 768 and 1440px with no overflow and 44px tap targets.
- **Screenshots:** 35–36.

## 14. Contextual top bar

- **What it shows:** after the logo and a divider, a two-line label: a small "Member area" / "Coach console" overline with a crimson live dot, and the current screen's name in display type.
- **Screen name:** "Hi, {first name}" on Home; otherwise the matching nav label, or the URL section for screens outside the nav (e.g. Profile).
- **Motion:** the label fades in on each navigation.
- **Responsive:** it stays one line at 320px; long titles truncate. Screenshot 37.

## 15. Event detail layout

`components/events/event-detail.tsx` is shared by the member, coach and public event pages.

- **Left column:**
  - a cover image (duotone, 21:9 on desktop) with a crimson date stamp, weekday and time range, plus a live countdown chip (Happening now / Today / Tomorrow / In N days, in Tunis days);
  - "at a glance" tiles for date, time and duration, places with a capacity bar, and location;
  - About, What to bring and How payment works cards.
- **Right column:** a sticky ticket (400–420px) with a gradient price header, a one-line summary, the registration deadline and the action. The registration panel uses container queries (`@sm:`), so its fields lay out by the ticket's width instead of the viewport's.
- **Phones:** cover, then the ticket, then the details, so registering stays near the top.
- **Public page:** passes `showCover={false}` because it already has an image banner.
- **Screenshots:** 38–39.

## 16. Contact page side panel

The "Talk to Coach Seif" panel in `app/(marketing)/contact/page.tsx` was mostly empty when no contact channels are configured. It is now a guided panel, with no invented promises such as reply times:

- **Coach card:** slanted "SD" badge, Seif Dridi, head coach, "reads every message himself".
- **Topic shortcuts** (`components/marketing/contact-topics.tsx`): picking one sets the form's Topic select, scrolls to the form and focuses Subject.
- **What happens next:** a 3-step timeline (send → Seif reads it → he replies by email, or in Messages for members).
- **Contact channels:** shown when set in Settings (two columns where there is room).
- **Fast-track card:** "Open your Messages" for members, "Create a free account" for visitors; plus the privacy note.
- **Responsive:** no horizontal scroll at 320px; on desktop the panel now roughly matches the form's height.
- **Screenshots:** 40–41.

## 17. Loader, auth, live search, speed and push

- **Loader** (`components/brand-loader.tsx`): glowing ring, pulsing mark, wordmark and a sweeping slanted bar; appears only after 160ms so quick pages never flash it. Used by `app/loading.tsx` and the auth routes. `NavProgress` adds a slim crimson bar that starts on the click and finishes when the page renders.
- **Auth (phones):** brand hero with a rounded sheet over it; `AuthField` inputs (icon, 52px, 16px text, live ✓ / inline error), password strength meter on sign-up, bigger buttons. Applies to sign-in, sign-up, forgot and reset password.
- **Live search:** `components/ui/live-form.tsx` applies filters as you type (220ms debounce) or change a select/date/checkbox, via `router.replace` in a transition — no button, no reload, keeps focus, URL stays shareable. Used on events, members, admin events, messages inbox and reports. (FAQ and notification chips were already live.)
- **Speed:** router cache (`staleTimes`: 30s dynamic / 5 min static) so revisits and back are instant, full prefetch for the dock tabs, and the progress bar for instant click feedback.
- **Push:** see `docs/push-notifications.md`. Migration `20261122000000_v1_web_push.sql` applied to the LOCAL database only; production needs your go-ahead plus VAPID keys.
- **Screenshots:** 42–45.
