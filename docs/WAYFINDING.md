# Airport map and wayfinding

SkyStop's airport map helps a traveller see where their layover activities are and how to move between them. It is a
planning aid, not turn-by-turn indoor navigation. Code: `src/features/wayfinding/` (route model, pin clustering, map
view, styles) and `src/components/AirportMap.tsx` (Leaflet map).

## What the map shows
- **Basemap**: CARTO light style (OpenStreetMap data) with a CARTO key, OpenStreetMap tiles otherwise. Attribution is
  always visible, bottom left, above the sheet.
- **Terminal pins**: one per terminal at its published coordinate (`src/data/airportGeo.ts`, each with a source). A
  capsule sits above the true point with a pointer and a dot on the point. The count is the venues matching the filters.
- **Clusters**: pins whose capsules would touch at the current zoom merge into one ("Jewel · T1", "3 terminals"); tapping
  zooms in. Pins never overlap (unit- and browser-tested). Pins under the top controls are not drawn (pan to see them).
- **Itinerary stops**: numbered badges on the stop's terminal pin (arrival and departure as plane icons).
- **Route layer** (when a venue is selected or directions are open): a dashed, faint coral circle around each involved
  terminal (a *schematic zone*, not a floor plan), numbered stop markers, the active leg in coral over a white casing,
  other legs as faint dotted coral lines, the leg's start as a filled coral dot and its destination as a coral pin.
  The map frames the active leg. Terminal clusters become small labels so they never cover the route.
- **No floors**: no floor data exists for these airports, so there is no floor control.

## Controls and the sheet
Top: back, List/Map, category chips. Right, above the sheet: zone filter (all / airside / landside) and "whole airport".
One bottom sheet floats above the tab bar: **browse** (terminal filter, venues, main action, *Directions*), **venue**
(preview line "5–10 min · 1.1 km from Arrival", Add, *How to get there*, Details) or **directions**. Short phones
(< 720 px tall) start with the sheet collapsed; the handle expands it. Nothing overlaps: sheet above the tab bar,
controls and attribution above the sheet (browser-tested at 320, 375 and 390 px).

## Directions ("How to get there")
Entry points: **See how to get there** under the time card on the itinerary (Builder) and on a saved plan; *Directions*
in the map sheet; *How to get there* on a venue in the map and in every activity details sheet (opens the map focused
on that venue). Works at every airport (LIS, SIN, LHR, DXB).

One leg at a time, like a maps app: Step n of N, To / From (with terminal), a summary (time, distance, mode, one status
pill), 2–5 short numbered steps (collapsed: the first two plus every border/security step), *Next stop* or *Done*, and,
expanded, *All stops* (each with time and distance). Back returns to discovery with the plan intact. The route follows
the plan's order, so reordering or removing an activity updates it.

| Status pill | Meaning |
|---|---|
| Airport transfer time | the minutes are Changi's published transfer times (`verification = official`); the line is still simulated |
| Estimated route | simulated walking estimate, or a Changi planning estimate |
| No directions | no recorded route between two Changi locations |

The pill appears once per leg; steps carry no per-step disclaimer.

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
