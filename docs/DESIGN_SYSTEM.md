# SkyStop design system ("Daylight & dusk")
Inspiration: `design-references/` (composition, photography and glass quality only; not their typography or features).

**Direction** (owner decision, 2026-11-12): a balanced light-and-dark, premium iOS-inspired travel app — not a dark dashboard and not a light/dark toggle.
- *Light* for functional screens: plan a layover / booking entry, forms, activity lists, itinerary builder, My Plans. Warm off-white canvas `#FAF6F2` with soft peach/coral ambient washes, charcoal text `#231A17`, white frosted panels.
- *Dark/atmospheric* only where photography leads: onboarding, photo heroes (airport, plan detail, home cards). White text there always sits on a dark scrim (`photo-fade` or a `from-deep` gradient), never on a light melt.

**Colour**: primary coral `#EA5139` (`accent`, gradient `btn-coral`); soft coral `#FFB5A5` (`aqua`), peach `#FFD9C7`, amber `#F6A04D`. Coral text on light uses `accent-dark` `#C23B24` (AA on the canvas). The time budget is the one strong coral surface (`sunset`, white text).

**Materials** (`@layer components`): `glass` light frosted chrome (tab bar, action bar, header buttons, sheets, dropdowns) · `glass-dark` / `glass-light` controls over photography · `panel` white content cards · `panel-accent` peach-washed highlight (selection, journey) · `sunset` coral time budget · `ph` warm photo placeholder · `photo-fade` dark progressive blur under text on photos · `hero-melt` thin fade from a photo into the canvas · `scroll-fade` faded edges on horizontal scrollers. Solid fallbacks when `backdrop-filter` is unsupported.

**Type**: system font stack (SF Pro on Apple devices), iOS rem scale (`title`, `h1`, `h2`, `card`, `body`, `sub`, `cap`, `tab`), tight negative tracking on headings.

**Layout rules** (enforced by `npm run test:layout`, 320/375/390/430 px): nothing wider than the screen (fields use `min-w-0`, grids use `minmax(0,1fr)`; no page-wide `overflow-x: hidden`); the sticky header is an opaque frosted band; every screen pads its bottom by `--nav-h` (+ the action bar where present) so content scrolls clear of the floating bars; insets via `--safe-top` / `--safe-bottom` (`viewport-fit=cover`).

**Desktop presentation**: on desktop-class browsers (fine pointer, ≥ 820 px) the same app loads in an iframe at 390 × 844 inside a phone silhouette (`src/DeviceFrame.tsx`), scaled to the window; `?frame=off` opens it without the frame. Phones always get the app full screen.

**Motion**: screen entrance, sheet slide-up, staggered rise, Ken Burns on heroes, press-scale; all disabled under `prefers-reduced-motion`.

**Airport map**: a real map (Leaflet + CARTO Voyager tiles from OpenStreetMap data, attribution always visible) with one pin per terminal at its published coordinates (`src/data/airportGeo.ts`). Venues are grouped on their terminal pin because the catalogue has no venue-level coordinates; venues that span several terminals are not pinned. Labels are placed by `placePins` so they never overlap, joined to the true point by a leader line. Not for navigation.
