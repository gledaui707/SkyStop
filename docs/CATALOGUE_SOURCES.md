# Airport catalogue: venues and verification sources

Supported airports: **SIN, LIS, LHR, DXB**. Data lives in Supabase (`activities`, `itinerary_templates`), applied by the idempotent migration `supabase/migrations/202611120001_catalogue_four_airports.sql` (additive; nothing deleted). The eight former "Demo" rows were converted in place (same ids), so existing saved plans still resolve.

Rules used: facts come from the airports' official websites, checked 12 Nov 2026. Terminal and airside/landside are recorded only when the source states them, otherwise `unknown`. Times are **planning estimates**, not official figures. Price is `Free`/`Paid` only where the source says so; otherwise "Price not listed". Opening hours change — the app tells travellers to check before they go. Photos are licensed Unsplash images used as **illustrative** pictures (labelled in the app), not photos of the venue.

## Singapore Changi (SIN)

| Venue | Category | Terminal | Access | Est. time | Price | Source |
|---|---|---|---|---|---|---|
| LeMa Dumpling and LE Congee & Noodle House | food | Terminal 3 transit, Level 2 | airside | 45 min | Unknown | [link](https://www.changiairport.com/id/en/experience/transit/transit-dapat-lebih/t3-more-than-12-hours.html) |
| Jewel Rain Vortex | culture | Jewel (public area, linked to T1, T2, T3) | landside | 40 min | Free | [link](https://www.jewelchangiairport.com/en/attractions/rain-vortex.html) |
| Free Snooze Lounge | rest | Transit areas, T1–T4 | airside | 45 min | Free | [link](https://www.changiairport.com/en/at-changi/facilities-and-services-directory/free-snooze-lounges-changi-airport-rest-areas.html) |
| Butterfly Garden | culture | Terminal 3 transit, Levels 2–3 | airside | 30 min | Free | [link](https://www.changiairport.com/en/experience/attractions-directory/butterfly-garden.html) |
| Canopy Park | culture | Jewel, top level (public area) | landside | 75 min | Paid | [link](https://www.jewelchangiairport.com/en/attractions.html) |
| Rooftop pool with jacuzzi | rest | Terminal 1 transit, Level 3 | airside | 60 min | Paid | [link](https://www.changiairport.com/en/at-changi/facilities-and-services-directory/swimming-pool-with-jacuzzi.html) |
| Free Singapore Tour | culture | Booths in T2 and T3 transit | landside | 150 min | Free | [link](https://www.changiairport.com/en/experience/tours/free-singapore-tour.html) |
| Harry's | food | Terminal 3 transit, Level 2 | airside | 40 min | Unknown | [link](https://www.changiairport.com/id/en/experience/transit/transit-dapat-lebih/t3-more-than-12-hours.html) |

## Lisbon (LIS)

| Venue | Category | Terminal | Access | Est. time | Price | Source |
|---|---|---|---|---|---|---|
| O Mercado food court | food | Terminal 1, after security | airside | 40 min | Unknown | [link](https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/o-mercado) |
| ANA Lounge | rest | Terminal 1, after security | airside | 60 min | Paid | [link](https://www.lisbonairport.pt/en/lis/services-shopping/premium-services/ana-lounge) |
| Lisboa Duty Free | shopping | Terminal 1, after security | airside | 30 min | Unknown | [link](https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/lisboa-duty-free) |
| Fnac | shopping | Terminal 1 | unknown | 20 min | Unknown | [link](https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/shops) |
| LEGO Store | shopping | Terminal 1 | unknown | 15 min | Unknown | [link](https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/shops) |
| Padaria Lisboa | food | Terminal 1 | unknown | 25 min | Unknown | [link](https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/restaurants-and-cafes) |

## London Heathrow (LHR)

| Venue | Category | Terminal | Access | Est. time | Price | Source |
|---|---|---|---|---|---|---|
| Gordon Ramsay Plane Food Market | food | Terminal 5, after security | airside | 45 min | Unknown | [link](https://www.heathrow.com/at-the-airport/restaurants-a-z/gordon-ramsay-plane-food) |
| Fortnum & Mason Bar | food | Terminal 5, after security | airside | 40 min | Unknown | [link](https://www.heathrow.com/at-the-airport/restaurants-a-z) |
| The Queen's Arms | food | Terminal 2 departures | unknown | 45 min | Unknown | [link](https://www.heathrow.com/at-the-airport/restaurants-a-z/the-queens-arms) |
| The Curator Bar & Dining | food | Terminal 3 departures | unknown | 50 min | Unknown | [link](https://www.heathrow.com/at-the-airport/restaurants-a-z/the-curator) |
| Star Light (Wetherspoon) | food | Terminal 4 | unknown | 40 min | Unknown | [link](https://www.heathrow.com/at-the-airport/restaurants-a-z/star-light) |
| Plaza Premium Lounge (T2) | rest | Terminal 2, after security | airside | 90 min | Paid | [link](https://www.heathrow.com/at-the-airport/lounges-hotels-spas/terminal-2/plaza-premium) |
| Plaza Premium Lounge (T4) | rest | Terminal 4 | unknown | 90 min | Paid | [link](https://www.heathrow.com/at-the-airport/lounges-hotels-spas/terminal-4/plaza-premium) |
| Harrods | shopping | Terminals 2, 3, 4 and 5 | unknown | 25 min | Unknown | [link](https://www.heathrow.com/at-the-airport/shops-a-z/harrods) |

## Dubai International (DXB)

| Venue | Category | Terminal | Access | Est. time | Price | Source |
|---|---|---|---|---|---|---|
| Sleepover lounge | rest | Terminal 3, Concourses A, B and C | airside | 120 min | Paid | [link](https://dubaiairports.ae/experiences/shops/details/sleepover) |
| Timeless Spa | rest | Terminal 3, B and C gates | airside | 60 min | Paid | [link](https://connectblog.dubaiairports.ae/airport-life/5-massages-to-try-at-dxb/) |
| Be Relax spa | rest | Terminal 1 (D gates) and Terminal 3 | airside | 45 min | Paid | [link](https://dubaiairports.ae/experiences/shops/details/be-relax) |
| Al Majlis | food | Terminal 3, C gates | airside | 60 min | Unknown | [link](https://dubaiairports.ae/experiences/restaurants) |
| The Daily DXB | food | Unverified | unknown | 40 min | Unknown | [link](https://dubaiairports.ae/experiences/restaurants) |
| Dubai Duty Free | shopping | Terminals 1 and 3 | airside | 40 min | Unknown | [link](https://dubaiairports.ae/experiences/shops) |
| Aesop | shopping | Terminal 3 | unknown | 15 min | Unknown | [link](https://dubaiairports.ae/experiences/shops) |

## Curated itineraries

- **Market lunch and lounge** (LIS): O Mercado food court → ANA Lounge
- **Dumplings and a nap** (SIN): LeMa Dumpling and LE Congee & Noodle House → Free Snooze Lounge
- **Butterflies and dinner** (SIN): Butterfly Garden → Harry's
- **Terminal 2 pub and lounge** (LHR): The Queen's Arms → Plaza Premium Lounge (T2)
- **Emirati dinner and spa** (DXB): Al Majlis → Timeless Spa

## Map positions (terminal level)
The map pins terminals, not venues. Coordinates and sources are in `src/data/airportGeo.ts`: Lisbon T1 (via the Aeroporto metro station beneath it, approximate); Changi Jewel (Wikipedia), T3 and T4 (Wikidata), T1 (single third-party source, approximate); Heathrow T2–T5 (Wikipedia); Dubai T3 (Wikipedia) and T1 (its metro station, approximate). Venues spanning several terminals (e.g. Changi Snooze Lounges, Harrods, Dubai Duty Free) and venues with an unverified terminal are listed under the map but not pinned.

## Known gaps
- Specific photos of Jewel's Rain Vortex and Heathrow could not be licence-checked from the build environment (Unsplash pages were blocked by a bot check), so airport/venue photos remain illustrative.
- Where official pages disagreed (e.g. Changi pool price, Heathrow Fortnum & Mason terminals), the uncertain detail was left out.
