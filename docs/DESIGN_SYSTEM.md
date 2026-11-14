# SkyStop design system ("Golden hour")

Everything below exists in code. Tokens and materials live in `src/index.css` (`@theme`, `:root`, `@layer components`);
shared components live in `src/components/ui.tsx`. Revised 14 Nov 2026 from the owner's visual direction (references in
`design-references/`): rich, layered glassmorphism over darker photographic surfaces, warm gradients around coral, no
plain white screens. The 13 Nov owner review still applies: glass is **matte** (no specular highlights, streaks, bevels
or reflective rims) so it never competes with flight information, and flight passes stay on a crisp light surface.
Same token names, components and layouts as before; the values changed.

## Principles
- **Dark, warm and photographic.** Screens sit on an espresso canvas lit by slowly drifting coral, plum and amber light
  (`div.ambient`, still under reduced motion). Photography is full-bleed where it helps: Home and Airport heroes,
  onboarding, and a `Backdrop` photo behind form screens (Add flight, Compare flights, manual connection).
- **Layered, matte glass.** Content sits on frosted panels with real backdrop blur over the light and photos; floating
  chrome (tab bar, trays, toasts) is a denser smoked glass. One quiet top hairline, a soft shadow; nothing glossy.
- **Journey information leads.** Flight passes are warm "paper" (`.theme-paper` + `.paper`): dark ink on light, the
  brightest surface on Home, so times and codes read instantly. Oversized codes and times, clear headings.
- **One focal point, one dominant action per screen.** Coral (`btn-coral`) is the main action; with no flights, Add flight
  is a coral-lit tile. Selected chips and segments are warm white (`pill-on`), the brightest small thing on a dark screen.
- **Accessible by default.** 44 px touch targets, AA text (muted text ≥ 6:1 on glass), visible focus, reduced motion,
  iOS safe areas. Glass falls back to near-opaque fills without `backdrop-filter`.

## Colour (`@theme` → Tailwind `bg-*`, `text-*`, `border-*`)
| Token | Value | Use |
|---|---|---|
| `accent` | `#EA5139` | primary coral (`btn-coral`, time budget, rails) |
| `accent-dark` | `#FF8D73` | coral text and icons on dark surfaces (AA); `#C23B24` inside `.theme-paper` |
| `accent-tint` | coral 20 % | coral wash (icon wells, pills) |
| `aqua` / `peach` / `amber` / `rose` / `plum` | `#FFB5A5` / `#FFD9C7` / `#F6A04D` / `#F0738A` / `#4A2335` | accents, gradients |
| `canvas` | `#150E0C` | espresso page (under the ambient light) |
| `surface` | `#221815` | solid raised surface |
| `ink` | `#FBF3EE` | warm-white text (`#1F1A17` inside `.theme-paper`) |
| `muted-text` / `muted` | `#CBBAB1` / `#94817A` | secondary text / placeholders |
| `line` / `ink-tint` | warm white 12 % / 7 % | hairlines / neutral fills |
| `success`, `warning`, `error` (+ `-tint`) | `#74D9A0`, `#FFC074`, `#FF8673` | status on dark |
| `deep` | `#0F0907` | darkest photographic surface, scrims |

Gradients (`:root`): `--coral-grad` (buttons), `--sunset-grad` (time budget: amber → coral → rose), `--rail-grad`
(itinerary and journey timelines: soft coral → coral → amber), `--dusk-grad`.

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
- **Safe areas**: `--safe-top`, `--safe-bottom`, `--nav-lift` (gap under the floating tab bar), `--nav-h` (tab bar + lift).
  Screens pad their bottom by `--nav-h` (plus the action bar where present).
- **Radii**: `rounded-control` 1 rem · `rounded-card` 1.5 rem · `rounded-surface` 1.75 rem · `rounded-tray` 2 rem · `rounded-full`.
- **Borders**: 1 px warm-white hairlines at 10–18 % on glass; a single inset top hairline (`--glass-edge`), no rims.
- **Elevation**: `shadow-e1` rest, `shadow-e2` raised (flight pass), `shadow-e3` floating (tab bar, trays, sheets), all
  dark and soft. `shadow-glow` is a coral shadow under primary buttons.

## Materials (`@layer components`)
| Class | Look | Use |
|---|---|---|
| `panel` | frosted warm glass (6–9 % white, 24 px blur), hairline, e1 | cards, forms, lists, activity rows |
| `panel-accent` | coral-lit frosted glass, coral hairline | the one highlighted surface on a screen |
| `glass-medium` | smoked glass (≈ 75–80 %), 28 px blur, e3 | tab bar, action trays, toasts, suggestion lists |
| `glass-subtle` (= `glass`) | light frost (10 %), 20 px blur | small floating controls, segmented tracks |
| `glass-premium` | brighter frost (7–16 %), e2 | one hero slab per screen (booking form, compare form) |
| `glass-dark` / `glass-light` | dark or light tint, 18 px blur | controls and labels over photography |
| `sheet-solid` | solid warm dark gradient | modal sheets (content behind never shows through) |
| `sunset` | warm coral gradient, matte | the time budget |
| `theme-paper` + `paper` | warm light paper, dark-ink tokens inside | flight passes and Wallet strips |
| `btn-coral` / `btn-secondary` / `pill-on` | coral gradient / frosted glass / warm white with dark text | buttons, chips |
| `field` | recessed dark well, clear outline (white inside paper) | inputs |
| `ph`, `photo-fade`, `hero-melt`, `scroll-fade`, `scrim` | placeholders and photo treatments | as named |

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
| `Header` / `LargeTitle` | back button (`IconButton`), centred title / large title | sticky under the progressive top blur (dark band) |
| `Backdrop` | `img`, `className` | full-bleed photo behind a form screen's header, dissolving into the canvas |
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
(`src/DeviceFrame.tsx`), scaled to the window, on a dark atmospheric stage (`html.device-stage`: charcoal with a faint
coral light). The drawn status bar and home indicator are white. `?frame=off` opens it without the frame. Phones get the app full screen.

## Airport map and wayfinding
A clean light map (CARTO light, OSM fallback). Map chrome uses `map-glass` (light, dark text) from
`src/features/wayfinding/map.css`: terminal pins, clusters and round map buttons. One bottom sheet (`glass-medium`)
floats above the tab bar; controls and attribution sit above it. Coral is used only for meaning: the active route (coral
over a white casing), the destination pin (`.wf-pin`), the leg's start (`.wf-stop--origin`) and numbered stop rings
(`.wf-stop`); inactive legs are faint dotted coral; terminal zones are dashed, 5% coral circles (schematic). One status
pill per leg: Airport transfer time (success tint), Estimated route (neutral), No directions (neutral). Border and
security steps use `text-warning`. Modal sheets (`Sheet`) are solid (`sheet-solid`) so content behind never shows through. The map itself stays light (CARTO light) with light `map-glass` chrome; the sheet over it is dark glass.
Full rules and the verified/simulated data model: `docs/WAYFINDING.md`.
