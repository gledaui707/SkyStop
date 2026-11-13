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
- **No venue pins and no floors**: the catalogue gives a venue's terminal, not its indoor position or floor.

## Controls and the sheet
Top: back, List/Map, category chips. Right, above the sheet: zone filter (all / airside / landside) and "whole airport".
One bottom sheet floats above the tab bar: **browse** (terminal filter, venues, main action, *Route*), **venue**
(Add, *How to get there*, Details) or **directions**. Short phones (< 720 px tall) start with the sheet collapsed; the
handle expands it; tapping a terminal expands it. Controls hide when an expanded sheet leaves no room for them.
Nothing overlaps: sheet above the tab bar, controls and attribution above the sheet (browser-tested).

## Directions ("How to get there")
Available where SkyStop has a transfer graph (Changi pilot; see `CONSTRAINT_AWARE_PLANNING.md`). For the whole
itinerary or a single venue (from the arrival terminal and back to the departure terminal). Opens as a step card
(Step n of N, from → to, mode, minutes, status, checkpoints) with previous/next; *All steps* lists every stop and leg
with notes and sources. The map frames the current leg's two terminals (start: coral ring; end: coral fill).

Each leg's status says where its minutes come from:
| Status | Meaning |
|---|---|
| Published time | every step is an airport-published time (`verification = official`) |
| Estimate | at least one step is a labelled planning estimate |
| No directions | no recorded route between the two places: no minutes are shown or counted |

Border and security steps (arrival immigration; check-in, departure immigration and security; through-check only) are
listed on the leg **without a time**: none is published. They are the same flags the planner uses.

## Routing integrity rules
- A route **line** is drawn only from `PATH_GEOMETRY` in `src/features/wayfinding/route.ts`: geometry that represents a
  documented or explicitly modelled traversable path, with a source for the geometry itself. It is empty, so no lines are
  drawn. Two places' coordinates are never joined with a line and presented as a route (unit-tested).
- Changi T2 has no published coordinate, so a T2 stop says "not on the map" instead of getting an invented pin.
- Floors are not modelled; no floor control is shown.
- Lisbon, Heathrow and Dubai have no transfer data: their venues show "Directions aren't available … follow airport
  signs" and no directions button.

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
Indoor floor plans and positioning; walking paths inside terminals; floor changes; checkpoint queue times; directions at
LIS, LHR and DXB; separating close terminals on very short screens (they stay in one highlighted cluster).
