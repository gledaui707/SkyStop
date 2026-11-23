# Five-minute live demo script (verified on the live app)
Public app: **https://skystop.vercel.app** (production; data in Supabase project `sgwbtgwccskqamzttczz`).
Steps from **View layover** on were observed on the live site on 22 Nov 2026 (fresh browser at 390×844, 375×667 and
320×568). The onboarding rows (restored 23 Nov) were verified on the local build with the same app code; re-check them
once on the live site after deployment.
Sample journeys are generated about a week ahead, so the dates change with the day; the times and durations do not.

## Before you present (2 minutes)
1. Open the URL in a **private/incognito window** (new guest: you get the splash and the three intro slides).
2. If **"We could not load the airports"** appears, tap **Try again**, then switch network.
3. Keep a second private window ready in case the first one gets stuck.

## Timed script (300 seconds)
| Time | Do | Expect on screen | Say |
|---|---|---|---|
| 0:00–0:20 | Watch the splash; on the first slide tap **Get started** | Splash → "Your layover, reimagined." → SkyStop: "Already have a flight booked?" | "The intro slides are optional: Get started goes straight to planning." |
| 0:20–0:55 | **Yes, I'm booked** → type **AXR7KD** → **Find my flight** | Short lookup animation → "Found your journey!" → journey draws itself: **CGK 08:20 → SIN 11:15**, connection **12h 20m**, **SIN 23:35 → CDG 06:20** (+1 day) | "Sample booking references only; SkyStop doesn't connect to airlines. All times are local to each airport." |
| 0:55–1:10 | (watch) | "You'll have 12h 20m at Singapore Changi Airport." Connection 12h 20m − planning buffer 2h = **10h 20m to explore** | "The buffer covers leaving the aircraft, screening and boarding." |
| 1:10–1:30 | Pick **Dining** and **Attractions** → **That's it (2)** | SS transition → Home: Jakarta → Paris via **SIN**, Arrive SIN **11:15**, Connection **12h 20m**, Depart SIN **23:35**, Time to explore **10h 20m** | "A guest session was created and the flight saved in PostgreSQL — no sign-up." |
| 1:30–1:50 | **View layover** → **Explore activities** | Layover: Singapore Changi, 10h 20m remaining, "No activities planned yet" → Changi activities, "Dining and Attractions first, from your interests", "10h 20m usable time · 10h 20m still free" | "From my flight straight into the airport, ordered by what I picked." |
| 1:50–2:40 | Tap **Food** (shows Harry's and LeMa Dumpling), back to **All**; add **Butterfly Garden** and **Harry's**; tap **Map**, open **Rooftop pool with jacuzzi** in the venue strip, tap **Add** | Map (Explore): terminal pins with counts, no route; the preview shows "Rest · 1h · Paid entry, Terminal 1 · Transit area – Level 3 · Airside"; sheet "3 selected" | "Explore is for deciding what to do. Real Changi venues from the airport's website." |
| 2:40–3:25 | **Build itinerary (3)** → Arriving at **T1**, Departing from **T3** | Time card: Layover 12h 20m · Buffer 2h · Activities **2h 10m** · Transfers **40m** → **7h 30m** remaining; transfers between stops ("5–10m · Skytrain or walk") | "Usable time minus activities minus counted transfers; Changi's published transfer times." |
| 3:25–4:00 | **View route on map** → tap the first **Directions** (A → 1) → **Back to route** → **Back to itinerary** | Route map: stops **1 Butterfly Garden, 2 Harry's, 3 Rooftop pool**, same 7h 30m left. Directions: Arrival T1 → Butterfly Garden T3, **5–10 min**, 1.1 km, Skytrain | "Route lines are illustrative; the minutes are the airport's." |
| 4:00–4:40 | **Save changes** → **Home** → **My Plans** → open the plan; refresh the page | My Plans: "Singapore layover · **3 activities · 7h 30m left**"; after refresh the plan opens with the same three stops | "Saved and read back from the database, owned only by this guest." |
| 4:40–5:00 | Wrap up | | "Booking → layover → activities → itinerary → saved." |

If the visitor has no booking, **Not yet** shows the airports to explore, asks for interests and opens Home without a
flight (nothing is invented or saved).

## Optional 30-second extension (if time allows)
Profile → Settings → **Demo controls** → **Earlier departure** → "Departure 22:50 (was 23:35). 45m less to explore;
your plan still fits." Close → Home shows "Your flight time changed." (labelled *Simulated update*) and the card shows
22:50 with 23:35 struck through. Then Demo controls → **Reset**. Say: "Simulated, not airline data; the saved booking
is untouched." (A plan that no longer fits, with suggestions, is shown in docs/FLIGHT_UPDATES.md using DH5PRZ.)

## If something goes wrong
- **Catalogue error:** Try again; second network.
- **Save error ("not saved"):** the draft is kept; tap **Try again**.
- Do **not** save the same plan from two tabs during the demo.

## Rehearsal log (fill in)
| Date | Duration | Issues |
|---|---|---|
| | | |
