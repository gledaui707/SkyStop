# SkyStop design system ("Dusk")
Inspiration: `design-references/` (composition and glass quality only; not their typography or features).

**Type**: system font stack (SF Pro on Apple devices), iOS-sized rem scale in `src/index.css` (`title`, `h1`, `h2`, `card`, `body`, `sub`, `cap`, `tab`); tight negative tracking on headings. No decorative fonts.

**Colour**: primary coral `#EA5139` (`accent`, gradient `btn-coral`), complemented by amber `#F6A04D`, rose and plum glows. Dark warm canvas `#171110` with a fixed ambient gradient (`body::before`) so glass surfaces have light to blur. Coral text on dark uses `accent-dark` (#FF8F78) for contrast. `color-scheme: dark` makes native date/time pickers match.

**Materials** (`@layer components`):
- `glass` — floating chrome: tab bar, action bar, header buttons, sheets.
- `glass-dark` / `glass-light` — chips and controls laid over photography.
- `panel` — content surfaces (forms, rows, cards); `panel-accent` — the one highlighted surface per screen (time budget, selection).
- `ph` — warm gradient placeholder behind every photo; shown while loading or if the image fails.
- `photo-fade` (progressive blur at the bottom of photos) and `hero-melt` (full-bleed hero fades into the canvas).
All glass has a solid fallback when `backdrop-filter` is unsupported.

**Composition**: full-bleed heroes for Welcome, Airport and Plan detail; one dominant coral action per screen (floating action bar above the floating tab bar); photo cards with a coral "notch" action; arrive → depart rail in the setup form; itinerary timeline with plane markers, photo thumbnails and a hatched buffer block.

**Motion**: screen entrance on every route change (`anim-screen`), sheet slide-up, staggered card rise, Ken Burns on heroes, press-scale on tappable cards. All disabled under `prefers-reduced-motion`.

**Safe areas**: `--safe-top` and `env(safe-area-inset-bottom)` for headers, tab bar and action bar; `viewport-fit=cover` in index.html.
