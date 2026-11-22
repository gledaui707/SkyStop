# Airport map and wayfinding

SkyStop's airport map helps a traveller see where their layover activities are and how to move between them. It is a
planning aid, not turn-by-turn indoor navigation. Code: `src/features/wayfinding/` (route model, pin clustering, map
view, styles) and `src/components/AirportMap.tsx` (Leaflet map).

## Three map modes, one map (22 Nov 2026)
The map serves three different goals, so it has three modes. They share the map engine (Leaflet + CARTO light,
`src/components/AirportMap.tsx`), the frame (`MapShell`: top bar, map buttons, one bottom sheet above the tab bar), the
route model (`route.ts`, `views.ts`) and the itinerary state in the store; each brings its own markers, sheet and actions.

| | Explore | Plan | Directions |
|---|---|---|---|
| Goal | What can I do here, and where? | How do my stops fit together? | How do I get from here to there? |
| Entry | Airports → an airport → **Map** | Itinerary → **View route on map** (also a saved plan) | A venue's **How to get there** (map preview or details); a leg of the route |
| Map | Terminal pins with venue counts at airport scale; **venue markers** (category icon) close up; selected = coral with a check; focused = larger, with its name. No route. | Only the plan's stops: **numbered** coral discs, start and end as dark plane discs, every leg drawn, the return leg dotted, each leg's time as a tappable chip. Other venues hidden. | **One leg**: origin (coral ring), destination (pin with the place's name), one bold line. Nothing else. |
| Sheet | Browse: time left, terminal chips, venues, **Build itinerary (N)**. Venue preview: name, category, duration, location, **Add to itinerary / In your itinerary**, Details, *How to get there* | Time budget (usable, activities, transfers, left — the builder's numbers), stops and legs in order (each leg → its directions), **Reorder** / remove in place, **Back to itinerary** / Edit itinerary | Leg n of N, time, distance, mode, one status pill, steps (folded on short phones), previous / next leg, **Back to route** or **Back to map** |
| Tab bar | shown | hidden (task screen) | hidden |

Files: `ExploreMap.tsx`, `PlanMap.tsx`, `DirectionsMap.tsx`, `MapShell.tsx`, `views.ts` (what each mode draws), `format.ts`,
`entryState.ts`.

### Navigation and state
Each mode is its own entry on the screen stack (`{ name: 'airport', code, view: 'map', map?: 'plan' | 'directions',
leg?, venue?, branch? }`), so the app's Back and the browser's Back both return to the previous mode. The stack is
mirrored in the browser history (`src/store.tsx`): a pushed screen adds a history entry, Back/Forward restore the stored
stack. Explore keeps its view (list/map), category, search, zone and terminal filters, focused venue and camera per visit
(`useEntryState`), so returning from Directions shows it exactly as it was; the list and the map share the same
category and search. The itinerary itself lives only in the store's draft: no mode copies or resets it.

### Time budget
All three modes use `computeItinerary` (current flight times, buffer, activity durations, counted transfers): the
Explore "left" line, the Plan budget strip and the builder show the same numbers. A leg's time is the planner's transfer
time where the airport's data routes it (Changi), so the Plan's travel total equals the builder's Transfers. Where there
is no routing data, legs show the illustrative walking estimate and the Plan says once that it isn't counted.

### Prototype routing
Venue spots, gate areas, route lines, distances and steps are illustrative (deterministic, `mock.ts`), as below; only
Changi's transfer minutes, modes and checkpoints come from data. One status pill per leg says which.

## Venue locations
Every venue's details sheet has a **Locations** section (one or more rows grouped by terminal, like an airport
directory). Rows from the venue's own catalogue terminal text are real ("Terminals 2, 3, 4 and 5", "Terminal 1 (D gates)
and Terminal 3"). Extra branches are simulated and vary by venue: coffee shops and bakeries 5–8, duty free and
newsagents 5–7, most others 2–4, boutiques and spas 1–2, lounges and restaurants 1, attractions 1. They are chosen
deterministically from each terminal's broad areas (gate areas, departures, arrivals), only in the venue's own zone
(an airside venue never gets an arrivals-hall branch), and small venues stay in their own terminal. Tapping a row opens
directions to that branch; on the map a venue with several locations shows chips to switch the route preview. The
terminal filter and pin counts include branches.

## Data model: verified vs simulated (owner decision, 13 Nov 2026)
| Data | Status | Where |
|---|---|---|
| Venues, categories, terminals, airside/landside | real, from each airport's website (database catalogue) | Supabase `activities` |
| Terminal coordinates | real, published (Wikipedia/Wikidata), `approx` flagged; Changi T2 approximate | `src/data/airportGeo.ts` |
| Changi transfer minutes, modes, immigration and re-entry flags | real (published) or labelled planning estimate | Supabase transfer graph |
| Venue spot inside a terminal (70–190 m from the terminal point, stable hash angle) | **simulated** | `mock.ts` `venuePoint` |
| Arrival / departure gate areas (210 m from the terminal point) | **simulated** | `mock.ts` `gatePoint` |
| Route lines: a smooth path bowing through the terminal hub; between terminals hub → curved connector → hub | **simulated**, never straight | `mock.ts` `mockPath` |
| Distance (length of that line, to 10 m) and walking time (70 m/min, min. 2 min) | **simulated** | `mock.ts` |
| Step text | **simulated**, generic | `mock.ts` `mockSteps` |
| Venue locations (details → Locations; branch chips on the map) | terminals named by the catalogue are **listed**; extra branches **simulated** | `src/data/venueLocations.ts` |

Simulated points live only in `Stop.point` / `Leg.geometry` and are never written to the database or to `airportGeo`.
Step rules: start ("Start at your arrival gate area in Terminal 1" or "Start at X"); a named crossing only from the
airport's transfer mode (Skytrain or travellator, transit shuttle bus, link bridge), else "Follow the signs to Terminal
N"; "Clear arrival immigration" and "Check in, then clear departure immigration and security" only when the airport's
data flags them; "Follow the main concourse toward the dining area / lounges / …"; "Continue to X". No gate numbers,
escalators, turns or checkpoints are invented (unit-tested). Everything is deterministic: the same plan always gives the
same route. None of it changes the planner's time calculation (`planItinerary`). The full explanation for users lives in
Profile → Settings → **About & data**.

## Indoor map data: what was checked (13 Nov 2026)
| Source | Result |
|---|---|
| Changi, Heathrow, Lisbon (ANA), Dubai official developer / open-data pages | No public indoor floor-plan or routing data or licence found. Access would need an agreement with the operator. |
| Apple Maps indoor maps | Venue-supplied (IMDF), shown in Apple's apps; Apple provides no API for indoor wayfinding, and MapKit JS floor plans may not be extracted. Not used. |
| Mapbox Airport Indoor Maps tileset | Commercial product covering 200+ airports; would replace the mapping infrastructure and needs a paid licence. Not used. |
| Mappedin, Mapxus, Mapwise, Azure Maps Creator | Commercial SDKs that need floor plans supplied by the venue. Not used. |
| OpenStreetMap indoor tagging (Simple Indoor Tagging, ODbL) | The right licence and format, but coverage inside these terminals could not be checked from the build environment (the OSM query service was not reachable). If verified later, an indoor layer and documented paths could be added under the rules above. |

Sources: [Mapbox indoor airport maps](https://www.mapbox.com/indoor-maps),
[Apple Indoor Maps guidelines](https://register.apple.com/resources/indoor/Apple-Indoor-Maps-Guidelines.pdf),
[Mappedin airports](https://www.mappedin.com/resources/blog/wayfinding-sdk-airports/), [Mapxus](https://www.mapxus.com/),
[OSM Simple Indoor Tagging](https://wiki.openstreetmap.org/wiki/Simple_Indoor_Tagging),
[Changi transfers between terminals](https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html).

## Not supported yet
Real indoor floor plans, positioning and surveyed walking paths; floor changes; checkpoint queue times; live gate
assignments; separating close terminals on very short screens (they stay in one cluster).
