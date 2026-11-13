# SkyStop design system ("Dusk")

Everything below exists in code. Tokens and materials live in `src/index.css` (`@theme`, `:root`, `@layer components`);
shared components live in `src/components/ui.tsx`. Inspiration: the screenshots in `design-references/` (composition:
full-bleed travel photography, floating capsule navigation, layered frosted glass, one coral action per screen). They
inform the look; their typography and features are not copied.

## Principles
- **Dusk, not white.** Screens sit on a warm charcoal canvas lit by fixed ambient light (coral sun top right, plum on the
  left, coral/amber bounce at the bottom; `div.ambient`, rendered once in `App`). Text is warm white. Photography carries
  colour: Home, Airport and Plan heroes are full-bleed photos that melt into the canvas.
- **One main action per screen**, in coral. Everything else is quieter (frosted secondary pills, text links).
- **Glass with a job.** Content sits on frosted `panel` surfaces (real backdrop blur over the ambient light); floating
  chrome (tab bar, action tray, sheets, toasts) uses denser `glass-medium`; at most one `glass-premium` hero slab (the
  boarding pass). Text never sits on glass over busy photography without a scrim.
- **Consistency from shared parts, not identical screens.**
- **Accessible by default.** 44 px minimum touch targets, AA text on the dark canvas and glass, visible focus, reduced
  motion, iOS safe areas.

## Colour (`@theme` → Tailwind `bg-*`, `text-*`, `border-*`)
Token names are kept from the earlier light system, so `ink` means "primary text" (now warm white).
| Token | Value | Use |
|---|---|---|
| `accent` | `#EA5139` | primary coral (fills, `btn-coral` gradient, active tab) |
| `accent-dark` | `#FF8A70` | coral text and icons on dark surfaces (AA) |
| `accent-tint` | coral 20 % | coral wash (icon wells, selected rows) |
| `aqua` | `#FFB5A5` | soft coral (eyebrow labels) |
| `peach` / `amber` / `rose` / `plum` | `#FFD9C7` / `#F6A04D` / `#F0738A` / `#4A2335` | accents |
| `canvas` | `#150E0C` | warm charcoal page |
| `surface` | `#221816` | raised solid surface |
| `ink` | `#FBF2EC` | primary text (warm white) |
| `muted-text` / `muted` | `#C8B6AD` / `#8E7C74` | secondary text (9:1 on canvas) / placeholders |
| `line` / `ink-tint` | warm white 12 % / 7 % | hairlines / neutral fills |
| `success` / `warning` / `error` (+`-tint`) | `#6FD99A` / `#FFBF6E` / `#FF7F6B`, tints 15–16 % | status |
| `deep` | `#0E0908` | darkest photographic surface; dark text on light pills |

Gradients (`:root`): `--coral-grad` (buttons), `--sunset-grad` (time budget), `--dusk-grad`.

## Typography (`text-*`; system font stack, SF Pro on Apple devices; rem so it follows text-size settings)
| Token | Size / line height | Use |
|---|---|---|
| `display` | 2.375 / 1.05, −0.03em | onboarding and hero headlines |
| `metric` | 2.75 / 1, −0.035em | large numbers: time left, durations |
| `title` | 2.125 / 1.12 | large screen titles (`LargeTitle`) |
| `h1` | 1.75 / 1.18 | screen headings, airport codes in cards |
| `h2` | 1.375 / 1.25 | section headings (`SectionHeader`) |
| `code` | 1.375 / 1.1, +0.01em | airport codes in compact rows |
| `card` | 1.125 / 1.3 | card titles, primary button label |
| `body` | 1.0625 / 1.35 | body text, inputs, buttons |
| `sub` | 0.9375 / 1.35 | secondary text, labels |
| `cap` | 0.8125 / 1.35 | captions, pills |
| `micro` | 0.75 / 1.3 | dense ticket metadata |
| `tab` | 0.6875 / 1.2 | tab bar labels, tiny badges |

Headings use −0.022em tracking; numbers that change use `tabular-nums`. Weights: 400 body, 500–600 labels, 700 titles.

## Spacing, radii, borders, elevation
- **Spacing**: Tailwind's 4 px scale. Screen gutter `px-gutter` = 1.25 rem. Groups inside a card `gap-3`; sections `gap-6`/`mt-6`.
- **Safe areas**: `--safe-top`, `--safe-bottom`, `--nav-lift` (gap under the floating tab bar: the home-indicator inset
  or 0.75 rem), `--nav-h` (tab bar + lift). Screens pad their bottom by `--nav-h` (plus the action bar where present).
- **Radii**: `rounded-control` 1 rem · `rounded-card` 1.5 rem · `rounded-surface` 1.75 rem · `rounded-tray` 2 rem · `rounded-full`.
- **Borders**: 1 px warm-white hairlines (`line`); lit top rims on glass.
- **Elevation**: `shadow-e1`–`e3` are deep black shadows for the dark canvas; `shadow-glow` is the coral bloom under primary buttons.

## Materials (`@layer components`)
| Class | Look | Use |
|---|---|---|
| `glass-subtle` (= `glass`) | warm smoked glass, 24 px blur, lit rim | small chrome, secondary tiles |
| `glass-medium` | denser smoked glass, 30 px blur, bevel, coral-lit bottom edge, e3 | floating tab bar, `ActionBar`, `Sheet`, toast, map sheet, picker list |
| `glass-premium` | luminous glass with streak, bright rim, coral bloom | one hero slab per screen (boarding pass) |
| `glass-dark` / `glass-light` | dark / bright frost with rim | controls and labels over photography |
| `sunset` | coral glass slab | the time budget (`BudgetHero`) |
| `panel` | frosted content surface (20 px blur, soft rim, e1) | forms, lists, dense information |
| `panel-accent` | coral-lit glass | the one highlighted surface on a screen |
| `field` | recessed dark well with inner shadow | text inputs, selects, pickers (`inputCls` uses it) |
| `pill-on` | warm-white pill, dark text | selected chips, segments, terminal and buffer choices |
| `btn-coral` / `btn-secondary` | coral gradient with gloss and glow / frosted pill with lit rim | buttons |
| `ph`, `photo-fade`, `hero-melt`, `scroll-fade`, `scrim` | photo placeholder and photo treatments | as named |

Without `backdrop-filter` every glass class falls back to a near-opaque warm fill.

## Components (`src/components/ui.tsx`)
| Component | API | Notes |
|---|---|---|
| `Button` | `variant`: `primary` · `secondary` · `tertiary` (`ghost` alias) · `danger`; `size`: `sm` 44 px · `md` 52 px · `lg` 56 px; `icon` | one primary per screen |
| `IconButton` | `label` (required, accessible name), `icon`, `tone`: `glass` · `dark` · `plain` · `coral` · `danger` · `accent` · `quiet`; `size`: `sm` 44 · `md` 48 · `lg` 56 | back, close, reorder, delete, map controls |
| `Surface` | `material`: `panel` · `accent` · `subtle` · `medium` · `premium` · `sunset` · `dark`; `radius`: `control` · `card` · `surface` · `tray`; `as` | any card or slab |
| `Pill` | `tone`: `neutral` · `accent` · `success` · `warning` · `error` · `dark`; `icon` | status labels |
| `SectionHeader` | `kind`: `title` (h2) · `label` (small muted, settings style); `action` | `SectionTitle` = title with standard margins |
| `TextField` | `label`, `hint`, `error`, `icon`, input props | labelled, described, `aria-invalid` on error; `inputCls` for custom inputs |
| `Field` | `label` + any control | wraps selects and custom inputs |
| `Chip` / `ChipRow` | `active` | filters and toggles (`aria-pressed`); row scrolls with faded edges |
| `Segmented` | `value`, `onChange`, `options` | List / Map and similar |
| `EmptyState` | `icon`, `title`, children, `action` | dashed, quiet; one sentence max |
| `LoadingState` / `Skeleton` | `label` / `className` | `role="status"`; pulse only when motion is allowed |
| `Notice` / `InfoTip` | `tone`: `info` · `warn` / "What is this?" bubble | inline guidance |
| `Header` / `LargeTitle` | back button (`IconButton`), centred title / large title | sticky under the progressive top blur |
| `ActionBar` | children | `glass-medium` tray above the tab bar |
| `Sheet`, `ActivitySheet`, `ActivityRow`, `Photo` | | bottom sheet in `glass-medium` |

Domain components reuse these: `BudgetHero` (time budget, `sunset`), `TripTicket`, `FlightStack`, `AirportPicker`,
`AirportMap`, `SSMark` (white monogram for dark backgrounds).

## Motion
- Tokens: `--dur-fast` 160 ms (press feedback), `--dur-base` 280 ms (component changes), `--dur-slow` 560 ms (screen-level);
  easings `--ease-ios` (`ease-ios`) and `--ease-glide` (`ease-glide`).
- Screen transitions: the View Transitions API (`transition()` in `src/store.tsx`). Push slides the new screen in from the
  right while the old one recedes; back reverses; tab switches crossfade. Only `main` animates (`view-transition-name`
  is set only while a transition runs); the ambient light, floating tab bar and toast stay still. Unsupported browsers
  fall back to the CSS screen fade.
- Patterns: press-scale (`press`), sheet slide (`anim-sheet`), rise (`anim-rise`), Ken Burns on heroes, the coral tab
  indicator gliding between tabs.
  Onboarding uses Motion springs (≈0.75 s) for its card morph; Account Access animates its light with CSS transforms.
- Reduced motion: no view transitions, global CSS rule plus `useReducedMotion` in onboarding; everything becomes instant or still.

## Accessibility rules
Touch targets ≥ 44 px (`IconButton sm`, `Button sm`, chips `min-h-11`). Icon-only buttons need `label`. Coral text uses
`accent-dark`. Small text never sits on the moving glow (Account Access tagline is an owner-approved
exception, 1.4:1). Focus: 2 px coral outline. Status changes use `role="status"` / `alert`.

## Layout rules (enforced by `npm run test:layout`, 320/375/390/430 px)
Nothing wider than the screen (fields use `min-w-0`, grids `minmax(0,1fr)`; no page-wide `overflow-x: hidden`);
content scrolls clear of the floating tab bar and action bar; insets via `--safe-top` / `--safe-bottom`
(`viewport-fit=cover`).

## Usage examples
```tsx
<ActionBar>
  <div className="grid gap-2">
    <Button className="w-full" onClick={explore}>Explore activities</Button>
    <Button variant="secondary" className="w-full" onClick={save}>Save plan</Button>
  </div>
</ActionBar>

<SectionHeader action={<Chip active={reorder} onClick={toggle}>Reorder</Chip>}>Your plan</SectionHeader>
<Surface className="grid gap-3 p-4"><TextField label="Email" type="email" hint="We send a sign-in link." /></Surface>
<IconButton label="Back" icon={ChevronLeft} tone="dark" onClick={back} />
<EmptyState title="No flights yet">Add a booked flight with its booking reference or by hand.</EmptyState>
```

## Desktop presentation
On desktop-class browsers (fine pointer, ≥ 820 px) the app loads in an iframe at 390 × 844 inside a phone silhouette
(`src/DeviceFrame.tsx`), scaled to the window; `?frame=off` opens it without the frame. Phones get the app full screen.

## Airport map
Leaflet + CARTO Voyager tiles (OSM fallback; attribution always visible). Zoomed out: one bubble per terminal; zoomed
in: approximate venue pins inside their terminal, laid out without overlaps. Not for navigation.
