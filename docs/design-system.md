# Fight Zone design system

One brand, three experiences: **public** (expressive, editorial), **member** (personal,
motivating), **admin** (structured, operational). All three share the tokens and components below.
Source of truth: `app/globals.css` (tokens + utilities) and `components/ui/*`.

## Identity
- **Colour:** black arena ground, white type, **crimson used only where something can be acted on
  or is the brand mark** (primary buttons, the active nav mark, the slant tag). Status colours are
  separate (green/amber/sky/red) so "error" never looks like "brand".
- **Signature shape:** the logo's **12° shear**. It appears as `.slant-bar` (eyebrows, active nav,
  section marks), `.tag-slant` (round numbers, live labels) and `.clip-slant` (framed art). It is
  the only decorative device — no glass, glows, floating blobs or gradients-for-their-own-sake.
- **Imagery:** the repo only holds illustrations in four different styles. `.duotone` prints any
  of them as grayscale-on-crimson so they read as one poster series. Real photographs of the gym,
  Coach Seif and events (uploaded through the admin) replace them as they arrive.

## Tokens (`:root` / `@theme`)
| Role | Token | Value |
|---|---|---|
| Ground | `ink` / `background` | `#09090a` |
| Surface (cards, panels) | `ink-soft` | `#111113` |
| Raised (inputs, hover rows) | `ink-softer` | `#19191c` |
| Hairline | `ink-border` | `#27272b` |
| Strong border | `ink-strong` | `#3a3a40` |
| Light editorial band | `bone` / `bone-ink` / `bone-muted` | `#f1eee8` / `#121214` / `#5b5a57` |
| Brand | `primary` / `-hover` / `-soft` / `-ring` | `#e11d48` … |
| Brand as small text | `primary-readable` (auto via `.text-primary`) | `#fb7185` (AA) |
| Text | `foreground` / `muted` / `muted-foreground` | 18:1 / 7.5:1 / 5.6:1 on ground |
| Status | `success` `warning` `info` `danger` (+ `-soft`) | green / amber / sky / red |
| Destructive action | `destructive` | `#dc2626` |

Radius is deliberately tight and overrides Tailwind's scale: `sm 2 · md 4 · lg 6 · xl 8 · 2xl 12 ·
3xl 16 px` (pills keep `rounded-full`). Shadows: `--shadow-lift` (elevated panels only) and
`--shadow-hit` (primary button hover).

## Typography
Oswald (display, uppercase, 500–700) + Geist (body, UI) + Geist Mono (codes).
| Style | Utility | Size |
|---|---|---|
| Display | `type-display` | clamp 52 → 136 px, lh 0.9 |
| H1 | `type-h1` | clamp 40 → 76 px |
| H2 | `type-h2` | clamp 32 → 56 px |
| H3 | `type-h3` | clamp 20 → 26 px |
| Dashboard H1 | `PageHeader` | 28 → 36 px |
| Body L / Body / Small | `text-lg` / `text-base` / `text-sm` | 18 / 16 / 14 px |
| Caption | `text-xs` + `text-muted-foreground` | 12 px |
| Overline | `type-overline` | 12 px, 0.22em tracking |
Numbers use `tabular` (automatic in tables).

## Spacing & layout
4-px base (Tailwind scale). Public sections `py-20 lg:py-28`; dashboard pages `space-y-8`.
`Container` = max 1280 px, gutters 16/24/32 px. Header height `--header-h` 64 px. Dashboard
sidebar 248 px (desktop), bottom tab bar on phones (member) / drawer (admin).

## Components
- **Button** (`ui/button`): `primary · outline · secondary · ghost · link · white · danger`, sizes
  `sm 36 · md 44 · lg 48 · icon 40`. Hover steps colour, press scales 0.97, focus ring.
- **Badge** (`ui/badge`): `default · outline · solid · neutral · success · warning · info · danger`,
  optional `dot`. **StatusBadge** (`ui/status-badge`) maps every backend status to one label + tone:
  pending/under review = warning, confirmed/paid/attended = success, waitlisted/reward = info,
  declined/rejected/no-show = danger, inactive = outline.
- **Card** (`ui/card`): flat surface + hairline. Linked cards add `.lift` (2 px lift) and images
  `.zoom-img` (1.03).
- **PageHeader** (dashboards), **PageHero** (public inner pages), **EmptyState**, **MetricCard**,
  **SectionHeading**, **Reveal**, **ConfirmDialog**, **FormDialog**, skeletons.

## Rules
- Real data only: a section with no content is hidden or shows an honest empty state.
- Status is always text + tone, never colour alone.
- One primary action per view; destructive actions confirm first.
