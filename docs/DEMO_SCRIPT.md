# Five-minute live demo script (matches the app as deployed)
Public app: **https://skystop.vercel.app** (production, Vercel; data in Supabase project `sgwbtgwccskqamzttczz`).
On a laptop the app opens inside an iPhone frame; on a phone it is full screen. Sample journeys are generated a week or more ahead, so dates are always in the future.

## Before you present (2 minutes)
1. Open the URL in a **private/incognito window** (new guest → you get the onboarding and an empty My Plans).
2. Confirm the onboarding loads ("Your layover, reimagined."). If **"We could not load the airports"** appears, tap **Try again**, then switch network.
3. Second browser/network ready. Optional: Supabase dashboard on `layovers` / `plan_items`.

## Timed script (300 seconds)
| Time | Do | Say / point out | Expect on screen |
|---|---|---|---|
| 0:00–0:30 | Swipe or tap **Next** through the three onboarding screens → **Plan a layover** | "First visit only; skippable; replay from the ⓘ button on Home." | "Your layover, reimagined." → "Discover what's possible." → "Make every minute count." → **Find your journey** |
| 0:30–1:10 | Type **AXR7KD** → **Find my journey** | "Sample references only — SkyStop doesn't connect to airline systems, and says so." | Journey overview: Jakarta CGK → **Singapore SIN** → Paris CDG; timeline in local times; **12h 20m layover − 2h planning buffer = 10h 20m usable** |
| 1:10–2:00 | **Explore Singapore** → List view; open **Butterfly Garden** | "Real venues from changiairport.com: terminal and airside only where the airport states it; time is an estimate; source link at the bottom." | Sheet: Terminal 3 transit, Levels 2–3 · Free · Airside · source **changiairport.com** |
| 2:00–2:40 | Add **Butterfly Garden**, **Harry's** and **Free Snooze Lounge** → **Build itinerary (3)** | "The time budget is the hero: usable time minus planned time." | 30m + 40m + 45m = 1h 55m planned → **8h 25m left** |
| 2:40–3:20 | **Save plan** | "One atomic server function; success only after the server confirms." | Home: "…is saved" and the **Next connection** ticket CGK → SIN → CDG |
| 3:20–3:45 | **Refresh** | "Read back from PostgreSQL for this guest." | Same ticket |
| 3:45–4:30 | **Plan a layover** → type **DH5PRZ** → **Find my journey** (Paris → Dubai → Tokyo) → **Explore Dubai** | "Four supported airports — Singapore, Lisbon, London Heathrow, Dubai — each shows only its own venues." | 7h layover − 2h = **5h usable**; Al Majlis, Timeless Spa… and the itinerary **Emirati dinner and spa** |
| 4:30–5:00 | **My Plans** | "Plans belong to this browser's anonymous guest; row-level security keeps other guests out." | The saved Singapore plan |

Alternatives: **Enter flight details manually** on Find your journey leads to the same overview → builder → save. **BQ3LMV** (Porto → Lisbon → New York, 5h 20m layover) and **CJ8NWT** (New York → London → Singapore, 5h 30m) also work.

Verification (2026-11-12): the booking-reference flow, all four references, Explore for LHR/DXB and a full save are covered by `npm run test:e2e` against a simulated API (64 checks). On the live site, onboarding → CJ8NWT → Explore London → venue sheet was checked read-only (no records created). The 8h 25m figure is arithmetic from the tested builder, not yet seen on the live site — rehearse once before the demo.

## If something goes wrong
- **Catalogue error:** Try again; second network.
- **Save error ("Plan not saved"):** the draft is kept; tap **Try again**.
- Do **not** save the same plan from two tabs during the demo.

## Rehearsal log (fill in)
| # | Date | Build/commit | Duration | Problems |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
