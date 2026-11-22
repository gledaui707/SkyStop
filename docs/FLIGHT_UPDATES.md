# Flight updates: reactive itinerary planning (simulated)

A saved layover plan depends on the flight schedule. SkyStop can now take a change to a saved flight (earlier or later
departure, later arrival, both legs, gate), recalculate the time to explore, check whether the itinerary still fits,
tell the traveller once, and offer rule-based changes that they can apply or decline.

There is **no live airline data**. Every update comes from **Profile → Settings → Demo controls → Simulate flight
update**, is labelled "Simulated update" wherever it appears, and is never presented as information from an airline.
A booking reference does not give SkyStop access to flight status, and the app does not say that it does.

## Architecture

```
saved booking (Supabase: arrival_at, departure_at; sample booking gate)      never changed by an update
        +
flight update (this device: effective arrival / departure / gate, source, time, seen, decision)
        =
effective flight  ──► computeItinerary()  ──► Home card · layover details · builder · My Plans · My Flights · alerts
                                         └──► planningImpact() ──► notice · plan review · suggestions
```

| File | Role |
|---|---|
| `src/features/flightUpdates/updates.ts` | `FlightUpdate` record and its store (`localStorage` key `skystop.flightupdates.v1`, one record per flight). `flightView()` returns the effective flight with what changed; `withUpdate()` gives the time calculation the effective times. Scenarios, time-zone-correct shifting, gate → terminal. |
| `src/features/flightUpdates/impact.ts` | `planningImpact()` (conflict / less time / more time / gate / none), `lateActivities()`, `suggestRevisions()`. Pure, unit tested. |
| `src/features/flightUpdates/FlightUpdateUI.tsx` | Home notice, `TimeCell` / `GateRow` (current value, booked value struck through), `UpdateLine`, `PlanReview` (suggestions, Apply changes / Keep my plan). |
| `src/features/flightUpdates/DemoControls.tsx` | The Settings sheet: flight picker (when there are several), scenarios, result line, Reset, View layover. |
| `src/data/itinerary.ts` | `computeItinerary(plan, { original? })` — the one time calculation — now reads the effective flight by default. |
| `src/store.tsx` | `flightUpdates`, `simulateFlightUpdate`, `resetFlightUpdate`, `markFlightUpdate`; removing a flight removes its update. |

No new time engine: arrival, departure, buffer, activity durations, transfers (Changi's transfer graph) and the return
walk all go through the existing `layoverMinutesAt` → `budget` → `planItinerary` path. The database schema is
unchanged.

### Data separation

* The booking row is the original. An update never writes to Supabase; saving a plan always writes the booked times.
* The update stores the effective values, `source: 'simulation'` (a future provider would write `'provider'`),
  `updatedAt`, the booked times it was made against (`basis`), `seen` and `decision` (`kept` / `applied`).
* If the flight's own times are later edited, `basis` no longer matches and the update is ignored.
* **Reset** deletes the update; every screen is back on the booking. Applying a scenario twice gives the same result
  (scenarios are relative to the booking, not stacked). A gate change keeps an earlier time change and vice versa.
* One record per flight: no duplicate flights or plans are created.

### Ready for a real provider (not built)

A provider adapter would map a status response (estimated arrival / departure, terminal, gate, cancellation) to the same
`FlightUpdate` with `source: 'provider'`; the screens would not change. Not built: live integration, background
monitoring, push notifications, cancellation handling.

## Calculation

`connection = departure − arrival` in the connecting airport's time zone (overnight and DST handled by Temporal);
`usable = max(0, connection − buffer)`; `remaining = usable − activities − counted transfers`. The buffer is counted
once; usable time is never negative. "Over by" is `−remaining` when it is negative, the same number the time budget
shows.

| Scenario (from the brief) | Booking → update | Effect |
|---|---|---|
| A. Earlier departure | 23:35 → 22:50 (AXR7KD, Singapore) | −45m to explore |
| B. Departure delayed | 23:35 → 01:35 next day | +2h; the plan is unchanged |
| C. Arrival delayed | 11:15 → 12:45 | −1h 30m |
| D. Both flights changed | arrival +65m, departure +50m (11:15 → 12:20, 23:35 → 00:25 +1) | recomputed from both times |
| E. Gate changed | B12 → D24 | see below |
| Reset | — | booked times and gate |

All scenarios are relative to the selected flight, so on DH5PRZ (Dubai, 00:45 → 07:45) "Earlier departure" is
07:45 → 07:00.

**Gate change.** The new gate is shown with the old one struck through. Gate letters map to a terminal only where the
airport's gate areas belong to one terminal (Changi, Dubai). If the terminal changes:
* the airport has transfer data and the plan has a departure terminal (Changi): the departure point moves to that
  terminal's transit area and the walk back is recalculated from Changi's published transfers ("Return: 5–10m ·
  Skytrain or walk" for T3 → T1);
* otherwise (Dubai has no transfer data): nothing is invented; the walk to the new gate is marked "isn't verified, so it
  isn't counted".

## Planning impact and notices

Three separate things:

| | What | Where |
|---|---|---|
| Flight update | What changed (times, gate) | With the flight: Home card, layover details, builder, My Plans, My Flights |
| Planning impact | What it means for the plan | Time budget, timeline ("beyond your usable time"), plan review |
| Notification | A one-off note that something changed | Home, above the flight card; dismissed once seen or handled |

Notices only appear when an update exists and changes something; a conflict is raised only when the update makes the
plan go over (`remaining < 0` and worse than with the booked times). Wording: "Your flight time changed." /
"Your current layover plan no longer fits the available time." → **Review plan**. Less or more time that still fits
gets a short line ("45m less to explore. Your plan still fits.") and **View layover**. A notice is shown once per update.

## Suggestions (deterministic)

Generated only when the plan no longer fits; each candidate is run through `computeItinerary` and kept only if it fits.

1. **Change the order** (only where route data makes order matter; every stop stays).
2. **Swap a stop for a shorter one** of the same category whose access is at least as certain (an "unverified" venue is
   never swapped in for an airside one).
3. **Skip one stop**, or **End after …** (skip the final stop; or the last few stops when no single change is enough).

Ranked by activity time given up, then by touching later stops first (so the start of the day stays as planned), then
by time left. The best suggestion is shown with the best one of a different kind (at most two). "Reduce duration" is not
offered: a plan stores catalogue activities with their typical durations, and changing that would need a schema change.

Nothing changes until **Apply changes**. On a saved plan it saves the revision through `save_plan` (booked times
unchanged; revision + 1). In the builder it changes the draft, which the traveller then saves. **Keep my plan** keeps
the over-budget plan with a short persistent warning ("You kept your plan. It's 25m over the time available." →
Review).

## Demo flow (genuine conflict)

DH5PRZ (Paris → Dubai → Tokyo): 7h connection − 2h buffer = **5h** to explore. Sleepover lounge 2h + Al Majlis 1h +
Timeless Spa 1h + Dubai Duty Free 40m = **4h 40m** → 20m left. Earlier departure (07:45 → 07:00) → 4h 15m → **25m
over**; Dubai Duty Free no longer fits.

1. Add flight → **DH5PRZ** → Find my journey → Explore Dubai.
2. Add Sleepover lounge, Al Majlis, Timeless Spa, Dubai Duty Free → Build itinerary (4): **20m left**.
3. Save plan → Home: Depart DXB 07:45, Gate B12, 5h to explore.
4. Profile → Settings → **Demo controls** → **Earlier departure** → "Departure 07:00 (was 07:45). Your plan no longer
   fits: 25m over."
5. Close, back to Home: notice "Your flight time changed." + **Review plan**; card shows 07:00 with 07:45 struck,
   6h 15m connection, 4h 15m to explore.
6. Review plan: Was 5h · Now 4h 15m · Over by 25m · Doesn't fit: Dubai Duty Free. Suggestions: **End after Timeless
   Spa** (15m left), **Swap Sleepover lounge for Be Relax spa** (50m left).
7. (Optional) Keep my plan → warning stays; Review → back.
8. **Apply changes** → "Plan updated: 15m left to explore." Three stops; the flight update line stays.
9. Demo controls → **Reset** → Home shows 07:45, B12, 5h.

Other scenarios on the same flight: Arrival delayed (00:45 → 02:15) → 30m over with three stops; Departure delayed →
+2h; Gate changed → D24, Terminal 1, walk not verified. For the brief's exact times use **AXR7KD** (Singapore).

## Tests

* Unit (`src/features/flightUpdates/flightUpdates.test.ts`, 21 tests): time-zone shifting across midnight and DST;
  scenarios A–D; buffer counted once and no negative usable time; same scenario twice; booking unchanged and reset;
  update ignored after the booking is edited; gate change with and without route data; conflict vs no conflict; late
  activity; suggestions (order, fit, no less-certain swaps, reorder first); the original plan is never modified.
* Browser (`npm run test:e2e`, "flight update" / "controls" / "review" / "keep" / "apply" / "A.–E." checks): the demo
  flow above end to end against the simulated API, the Singapore times, booking row unchanged until Apply, notice not
  repeated, reset, no "demo" wording on the planning screen.
* Layout (`node tests/e2e/layout-audit.mjs`): Demo controls, Home with notice, plan review and builder at
  320/375/390/430.

Screenshots: `docs/screenshots/flight-updates/`.
