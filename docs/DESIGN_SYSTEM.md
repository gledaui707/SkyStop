# SkyStop design system ("Restrained light")

Everything below exists in code. Tokens and materials live in `src/index.css` (`@theme`, `:root`, `@layer components`);
shared components live in `src/components/ui.tsx`. Revised 13 Nov 2026 (owner review): the high-gloss "Dusk" glass
was too shiny and competed with flight information, so the system was corrected, not rebuilt: same token names,
components and layouts; light warm surfaces, subtle glass, quieter coral.

## Principles
- **Light and warm inside the app.** Screens sit on a warm-neutral canvas; content is on solid white surfaces.
  Photography stays immersive (Home, Airport and plan heroes, onboarding); the desktop stage around the phone is dark.
- **Typography and journey information lead.** Oversized airport codes and times, clear headings, few secondary labels.
- **Coral is an accent,** for the one main action and meaningful highlights (time remaining, selected state).
- **Glass is subtle and selective:** the floating tab bar, sheets, action trays, small floating controls, labels on photos.
  Never on ordinary cards, flight details, forms, activity lists or the time budget.
- **Depth is quiet:** a hairline and a soft shadow; no specular highlights, reflective rims, bevels or glows.
- **Accessible by default.** 44 px touch targets, AA text, visible focus, reduced motion, iOS safe areas.

## Colour (`@theme` → Tailwind `bg-*`, `text-*`, `border-*`)
| Token | Value | Use |
|---|---|---|
| `accent` | `#EA5139` | primary coral (`btn-coral`, selected tab) |
| `accent-dark` | `#C23B24` | coral text and icons on light surfaces (AA) |
| `accent-tint` | `#FDEBE6` | soft coral wash (icon wells) |
| `aqua` / `peach` / `amber` / `rose` / `plum` | `#FFB5A5` / `#FFD9C7` / `#F6A04D` / `#F0738A` / `#4A2335` | accents |
| `canvas` | `#F6F3F0` | warm-neutral page |
| `surface` | `#FFFFFF` | solid surfaces |
| `ink` | `#1F1A17` | charcoal text |
| `muted-text` / `muted` | `#6B625D` / `#A39A95` | secondary text / placeholders |
| `line` / `ink-tint` | 9 % / 5 % ink | hairlines / neutral fills |
| `success`, `warning`, `error` (+ `-tint`) | `#1D7F45`, `#9A5A00`, `#C4321F` | status |
| `deep` | `#1C1412` | dark photographic surface, scrims |

Gradients (`:root`): `--coral-grad` (buttons, nearly flat), `--sunset-grad` (time budget). Page background
(`div.ambient`): warm neutral with a faint peach light at the top.

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
- **Borders**: 1 px hairlines in charcoal at 6–12 % (no white rims).
- **Elevation**: `shadow-e1` rest (cards), `shadow-e2` raised (the boarding pass), `shadow-e3` floating (tab bar,
  sheets, trays): soft and low-contrast. `shadow-glow` is a faint coral shadow under primary buttons.

## Materials (`@layer components`)
| Class | Look | Use |
|---|---|---|
| `panel` | solid white, hairline, e1, no blur | cards, forms, lists, flight details |
| `panel-accent` | solid soft-coral wash, coral hairline | the one highlighted surface on a screen |
| `sunset` | solid coral, matte, soft coral shadow | the time budget |
| `glass-medium` | white at 90 %, 16 px blur, hairline, e3 | tab bar, action trays, sheets, toasts |
| `glass-subtle` (= `glass`) | white at 82 %, 12 px blur, hairline, e1 | small floating controls (header buttons) |
| `glass-premium` | near-solid white, e2 | an occasional hero surface (Account Access tray) |
| `glass-dark` / `glass-light` | dark or light tint, 14 px blur, thin border | controls and labels over photography |
| `btn-coral` / `btn-secondary` / `pill-on` | coral / white with hairline / charcoal selected state | buttons, chips |
| `field` | white, clear outline | inputs |
| `ph`, `photo-fade`, `hero-melt`, `scroll-fade`, `scrim` | placeholders and photo treatments | as named |

Photo heroes end with rounded corners on the canvas and carry a dark scrim (`from-deep`) under white text.
Without `backdrop-filter`, glass falls back to near-opaque fills.

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
(`src/DeviceFrame.tsx`), scaled to the window, on a dark atmospheric stage (`html.device-stage`: charcoal with a faint
coral light). The app inside stays light. `?frame=off` opens it without the frame. Phones get the app full screen.

## Airport map and wayfinding
A clean light map (CARTO light, OSM fallback). Map chrome uses `map-glass` (light, dark text) from
`src/features/wayfinding/map.css`: terminal pins, clusters and round map buttons. One bottom sheet (`glass-medium`)
floats above the tab bar; controls and attribution sit above it. Coral is used only for meaning: the active route (coral
over a white casing), the destination pin (`.wf-pin`), the leg's start (`.wf-stop--origin`) and numbered stop rings
(`.wf-stop`); inactive legs are faint dotted coral; terminal zones are dashed, 5% coral circles (schematic). One status
pill per leg: Airport transfer time (success tint), Estimated route (neutral), No directions (neutral). Border and
security steps use `text-warning`. Modal sheets (`Sheet`) are solid white so content behind never shows through.
Full rules and the verified/simulated data model: `docs/WAYFINDING.md`.
