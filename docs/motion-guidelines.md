# Fight Zone motion guidelines

Motion confirms an action or introduces content once. It never delays reading. Implementation is
CSS + one IntersectionObserver per revealed block (`components/ui/reveal.tsx`) — no animation
library, no scroll listeners, only `transform` and `opacity` are animated.

## Tokens
| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 140 ms | colour/opacity feedback |
| `--dur-base` | 220 ms | hover lifts, buttons, nav |
| `--dur-slow` | 520 ms | reveals, dialogs |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | everything entering |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | position swaps |

## Patterns
| Pattern | Where | How |
|---|---|---|
| Hero entrance | every public hero, once on load | `.rise-line > span` (type slides up from its own mask) + `.sweep` slant bar |
| Section reveal | section headings / important blocks | `<Reveal>` — 18 px rise + fade |
| Stagger | card grids (events, news, badges) | `<Reveal variant="stagger">` — children 70 ms apart, capped at 260 ms |
| Hover lift | linked cards | `.lift` — translateY(-2px), border warms |
| Image zoom | linked images | `.zoom-img` — scale 1.03 inside its frame |
| Button press | all buttons | scale 0.97 on `:active`, colour step on hover |
| Underline draw | inline links | `.link-draw` |
| Dialog | ConfirmDialog / FormDialog | backdrop fade + panel rise (`fz-panel-in`) |
| Live update | messages / notifications | new item fades up (`fz-fade-up`) |

## Rules
- Never animate every element of a page; dashboards only animate feedback, not content.
- Hover effects run only on `(hover: hover)` devices — touch never gets stuck hover states.
- Content hidden for a reveal is hidden only under `html.js`; no JavaScript = everything visible.
- `prefers-reduced-motion: reduce` → reveals, staggers, hero entrances and transitions are disabled
  (globals.css), and content shows immediately.
- No parallax, scroll-jacking, carousels, tilt or looping decoration.
