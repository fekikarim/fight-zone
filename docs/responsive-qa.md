# Fight Zone redesign — responsive & accessibility QA

Date: 2026-11-20 · Environment: local stack (`scripts/dev-local-db.sh`, port 3100), Claude in-app
browser with viewport emulation. Signed in with the local seed accounts (member, coach).

## Method
- **Overflow:** on each route, `document.documentElement.scrollWidth` compared to `innerWidth`, plus a
  scan for elements whose right edge passes the viewport.
- **Structure:** count of `<h1>`, heading-level jumps, links/buttons without an accessible name,
  `<img>` without `alt`, skip link + `#main` landmark.
- **Visual:** screenshots at 1440 and 390 (`docs/redesign-screenshots/`).

## Overflow results
| Route | 320 | 390 | 1440 |
|---|---|---|---|
| `/` | ✅ | ✅ | ✅ |
| `/events`, `/events/[id]` | ✅ | ✅ | ✅ |
| `/about`, `/faq`, `/news` | ✅ | ✅ | ✅ |
| `/privacy`, `/terms` | ✅ *(fixed: legal table widened page to 498 px)* | ✅ | ✅ |
| `/contact` | ✅ *(fixed: quick cards widened page to 347 px)* | ✅ | ✅ |
| `/sign-in`, `/sign-up` | ✅ | ✅ | ✅ |
| `/member`, `/member/events/[id]` | — | ✅ | ✅ |
| `/admin`, `/admin/events`, `/admin/events/[id]`, `/admin/payments`, `/admin/calendar` | — | ✅ | ✅ |
| `/admin/members`, `/admin/reports`, `/admin/messages`, `/admin/settings/messages`, `/admin/content/about`, `/admin/events/new` | ✅ | — | — |

Intentional horizontal scrollers (filter tab rows) stay inside their own container.

## Structure results
| Page | h1 | Heading jumps | Unnamed controls | Images without alt |
|---|---|---|---|---|
| `/` | 1 | 0 | 0 | 0 |
| `/events/[id]` | 1 | 0 | 0 | — |
| `/admin` | 1 | 0 | 0 | — |
| `/admin/events/[id]` | 1 | 0 | — | — |
| `/member/events/[id]` | 1 | — | — | — |
Previously `/events/[id]`, `/member/events/[id]` and `/admin/events/[id]` rendered **two** h1s; fixed.

## Behaviour checked
- Mobile public menu: full-screen panel, Escape closes, body scroll locked, `aria-expanded` state.
- Dashboard: bottom tab bar (≥ 64 px targets) + drawer (Escape closes, focusable close button).
- Admin calendar on phones switches to the agenda list (existing behaviour preserved).
- Dialog (Record payment): opens, labelled close button, submits; success toast only after the
  server confirmed (status badge changed to "Paid · 30.000 TND", Paid counter 0 → 1).
- Inputs use 16 px text on phones (prevents iOS zoom on focus).
- `prefers-reduced-motion`: reveals, staggers and hero entrances are disabled in CSS; content is
  never hidden without JavaScript (`html.js` gate).

## Not covered
- Real devices (iPhone/Android hardware) and Safari/Firefox engines — only Chromium emulation.
- 768 / 1024 / 1920 widths were checked through the layout breakpoints in code, not screenshot-audited
  page by page.
- Automated contrast audit (axe/Lighthouse) was not run; colours were chosen against measured
  ratios (`docs/design-system.md`).
- Screen-reader walkthrough (VoiceOver/NVDA) not performed.
