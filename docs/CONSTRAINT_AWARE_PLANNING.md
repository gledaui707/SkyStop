# Constraint-aware itinerary planning (Changi pilot)

SkyStop estimates whether a layover plan fits **in time** and, separately, whether it stays **inside the transit area**. It is a planning assistant, not indoor navigation and not a visa or entry decision.

## Data model (Supabase, migration `202611130001_transfer_graph.sql`, additive)
- `airport_locations`: places a traveller moves between. Changi: the T1, T2, T3 and T4 transit areas (airside) and Jewel (public area, landside).
- `airport_transfers`: **directed** connections with `min_minutes`/`max_minutes`, `mode`, the checkpoints involved (`requires_immigration` = arrival immigration to enter the country; `requires_departure_checks` = check-in, departure immigration and security to return airside; `requires_through_check`), `verification` (`official` or `planning_estimate`) and `source_url`.
- `activity_locations`: which location(s) a venue is in (the Snooze Lounges are in all four transit areas; the Free Singapore Tour booths in T2 and T3).
- `airports.entry_guidance_url`: the official immigration page per country.

No checkpoint waiting time is stored: none is published. Routes are never inferred from map distance; venues are not given indoor coordinates.

## Changi routing and access sources (checked 13 Nov 2026)
| Fact encoded | Value | Source |
|---|---|---|
| T1 ↔ T2 ↔ T3 transit areas by Skytrain (05:00–02:00) or inter-terminal travellators (24 h) | 5–10 min, official | [Transfer between terminals & Jewel](https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html) |
| T4 ↔ other transit areas: transit shuttle bus only; through-checked passengers only | 10–18 min, official | same page |
| Jewel is in the public area; transit passengers must clear arrival immigration to visit | flag, official | same page; [Getting to Jewel](https://www.jewelchangiairport.com/en/getting-to-jewel.html) |
| T2/T3 Departure Hall (L2) ↔ Jewel by link bridge | 5–10 min, official | [Getting to Jewel](https://www.jewelchangiairport.com/en/getting-to-jewel.html) |
| T1 ↔ Jewel (directly connected to the T1 Arrival Hall) | 5–10 min, **planning estimate** (no published time) | same |
| Moving within one transit/public area (gate → venue, venue → venue) | 2–10 min, **planning estimate** | none published |
| Official entry guidance | ICA (SIN), GOV.UK transit visa (LHR), Portuguese visa portal (LIS), UAE government portal (DXB) | links stored in `airports.entry_guidance_url` |

## Time calculation (no double counting)
```
usable    = total layover − planning buffer
remaining = usable − activity durations − transfers
```
- The **planning buffer** (unchanged) covers what every connecting passenger does anyway: leaving the aircraft, transfer screening, the final walk to the gate and boarding.
- **Transfers** are everything else the plan adds: arrival terminal → first activity, between activities (in the chosen order), and last activity → departure terminal's transit area (the "return transfer"). Each is the cheapest published route between the locations; SkyStop counts the **upper end** of each range and shows the lower end for comparison.
- **Leaving and re-entering the transit area** (arrival immigration, check-in, departure immigration, security) is *not* in the buffer and has no published time, so it is never given a number. It is shown on the transfer and makes the time result "Cannot verify feasibility".

Time states: *Fits within estimated time budget* (≥ 15 min to spare) · *Tight connection* (< 15 min) · *Exceeds available time* (activities + the lower end of transfers already exceed usable time) · *Cannot verify feasibility* (an unverified transfer, terminals not chosen, or immigration/re-entry time involved).
Access states (separate): *Stays in the transit area* · *Entry verification required* · *Access conditions unknown*.

## Entry check (landside activities)
Shown only when a landside activity is in the plan. Asks passport nationality (optional) and whether the traveller already has permission to enter (Yes / No / I'm not sure). Answers stay on screen; they are not saved or sent. The panel explains the zone transition, links to the official authority, and offers *Continue provisionally* or *Remove landside activity*. SkyStop never states that a visa is approved, eligible or guaranteed.

## Persistence
Activity order is saved in `plan_items.position` (unchanged). Arrival/departure terminal are stored with the plan's other browser-side labels (`skystop.planmeta.v1`), like its name. Nationality and entry answers are not stored.

## Not supported yet
- Lisbon, Heathrow and Dubai have no routing data: the builder counts activity time only and says so (venues, map and saving work as before).
- Changi T2 has no map coordinate, so it has no map pin (routing still works). Indoor venue positions are not shown on the map.
- Skytrain/shuttle operating hours are noted, not checked against the plan's clock times. Opening hours are not checked.
- The Free Singapore Tour's own eligibility rules (layover length, registration) are described, not enforced.
- Checkpoint queues, walking speed, mobility needs and terminal closures are not modelled.
