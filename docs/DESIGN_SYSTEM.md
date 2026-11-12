# SkyStop design system ("Daylight & dusk")

Everything below exists in code. Tokens and materials live in `src/index.css` (`@theme`, `:root`, `@layer components`);
shared components live in `src/components/ui.tsx`. Inspiration: `design-references/` plus the owner's three references
(Nov 2026): floating layered surfaces (composition), warm orange illumination (lighting), high-gloss glass at about
"0.8 glossiness" (material). They inform the look; they are not features.

## Principles
- **Light and warm first.** Functional screens sit on a warm off-white canvas lit by soft peach and orange light. Dark
  surfaces appear only where photography leads (onboarding, photo heroes). No dark mode.
- **One main action per screen**, in coral. Everything else is quieter.
- **Glass is a material, used sparingly.** Physical, glossy slabs for floating chrome and hero moments; solid panels for
  forms and dense information. Never glass on glass for content.
- **Consistency from shared parts, not identical screens.** Screens keep their own composition; they share type,
  materials, radii, spacing, components and motion.
- **Accessible by default.** 44 px minimum touch targets, AA text on light surfaces, visible focus, reduced motion.

## Colour (`@theme` → Tailwind `bg-*`, `text-*`, `border-*`)
| Token | Value | Use |
|---|---|---|
| `accent` | `#EA5139` | primary coral (fills, `btn-coral` gradient) |
| `accent-dark` | `#C23B24` | coral text and icons on light surfaces (AA) |
| `accent-tint` | `#FFE4DC` | soft coral wash (icon wells, selected rows) |
| `aqua` | `#FFB5A5` | secondary coral (historic name kept) |
| `peach` / `amber` / `rose` / `plum` | `#FFD9C7` / `#F6A04D` / `#F0738A` / `#4A2335` | accents |
| `canvas` | `#FAF6F2` | warm off-white background |
| `surface` | `#FFFFFF` | solid surfaces |
| `ink` | `#231A17` | charcoal text |
| `muted-text` / `muted` | `#6B5F59` / `#A1958F` | secondary text / placeholders |
| `line` / `ink-tint` | 10 % / 5 % ink | hairlines / neutral fills |
| `success` (+`-tint`) | `#1D7F45` / `#E3F3E8` | positive status |
| `warning` (+`-tint`) | `#9A5A00` / `#FFF1DC` | caution status |
| `error` (+`-tint`) | `#C4321F` / `#FDE7E3` | errors, destructive |
| `deep` | `#1C1412` | dark photographic surface |

Gradients (`:root`): `--coral-grad` (buttons), `--sunset-grad` (time budget). Ambient light (`body::before`, fixed):
peach from the top right, a softer peach on the left, an orange bounce bottom right, on a warm vertical gradient.

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
- **Spacing**: Tailwind's 4 px scale. Screen gutter `px-gutter` = 1.25 rem (same value as `px-5`, used on screen edges and
  the header). Groups inside a card `gap-3`; sections `gap-6`/`mt-6`.
- **Safe areas**: `--safe-top`, `--safe-bottom`, `--nav-h` (tab bar + home indicator). Screens pad their bottom by
  `--nav-h` (plus the action bar where present). The desktop device frame sets its own insets.
- **Radii**: `rounded-control` 1 rem (inputs, thumbnails, small tiles) · `rounded-card` 1.5 rem (cards, panels, rows,
  tooltips) · `rounded-surface` 1.75 rem (photo heroes, large cards, empty states) · `rounded-tray` 2 rem (action trays,
  sheets) · `rounded-full` (buttons, pills, icon buttons).
- **Borders**: 1 px. Hairline `line` on solid surfaces, white rims on glass.
- **Elevation**: `shadow-e1` rest (panels) · `shadow-e2` raised (subtle glass) · `shadow-e3` floating (trays, sheets) ·
  `shadow-glow` coral (primary buttons).

## Materials (`@layer components`)
Glass is a physical slab, not a blurred white rectangle: a tinted body whose translucency varies (clearer through the
middle, milkier at the rim), a specular highlight where the light lands (top left), a bright top edge and bevel, a
warm-lit bottom edge that reads as thickness, and a contact shadow. Blur supports it. Shared optics are `:root`
variables (`--glass-edge-top`, `--glass-bevel`, `--glass-edge-warm`, `--glass-thickness`, `--glass-specular`,
`--glass-streak`).

| Class | Look | Use |
|---|---|---|
| `glass-subtle` (= `glass`) | light frost, specular, top edge, e2 | tab bar, header and map buttons, small chrome |
| `glass-medium` | thicker frost, bevel, warm bottom edge, e3 | `ActionBar` tray, `Sheet`, floating toolbars |
| `glass-premium` | high gloss: light tint, 8 px blur, diagonal streak, bright rim, warm thickness, coral shadow | at most one hero slab per screen, over warm light or photos (Account Access tray) |
| `glass-dark` | dark tint with a specular and rim | controls and labels over photography |
| `sunset` | coral glass slab: brand gradient with streak, bevel and thickness | the time budget (`BudgetHero`) |
| `panel` | solid white, hairline, white top edge, e1, **no blur** | forms, lists, dense information |
| `panel-accent` | peach-washed solid | the one highlighted solid surface on a screen |
| `btn-coral` / `btn-secondary` | coral gradient with gloss and glow / white pill with hairline and lit edge | buttons |
| `ph`, `photo-fade`, `hero-melt`, `scroll-fade`, `scrim` | placeholders and photo treatments | as named |

Without `backdrop-filter` every glass class falls back to a near-opaque fill. Not implemented: true refraction
(displacement) — browsers outside Chromium cannot filter the backdrop with SVG; the optics above are layered light.

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
- Patterns: press-scale (`press`), screen fade (`anim-screen`), sheet slide (`anim-sheet`), rise (`anim-rise`), Ken Burns.
  Onboarding uses Motion springs (≈0.75 s) for its card morph; Account Access animates its light with CSS transforms.
- Reduced motion: global CSS rule plus `useReducedMotion` in onboarding; everything becomes instant or still.

## Accessibility rules
Touch targets ≥ 44 px (`IconButton sm`, `Button sm`, chips `min-h-11`). Icon-only buttons need `label`. Coral text on
light uses `accent-dark`. Small text never sits on the moving glow (Account Access tagline is an owner-approved
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
