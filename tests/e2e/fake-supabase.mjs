// In-browser stand-in for the Supabase HTTP API, used ONLY by the UI journey test.
// It mirrors the hosted seed (verified 2026-11-12) and the save_plan contract. It is not evidence about the real database.
// Generated from the hosted catalogue after migration 202611130001 (read-only query, 2026-11-13).
export const SEED = {
 "airports": [
  {
   "id": "DXB",
   "name": "Dubai International Airport",
   "timezone": "Asia/Dubai",
   "dataset_label": "Venues from dubaiairports.ae, checked Nov 2026",
   "entry_guidance_url": "https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/do-you-need-an-entry-permit-or-a-visa-to-enter-the-uae"
  },
  {
   "id": "LHR",
   "name": "London Heathrow Airport",
   "timezone": "Europe/London",
   "dataset_label": "Venues from heathrow.com, checked Nov 2026",
   "entry_guidance_url": "https://www.gov.uk/transit-visa"
  },
  {
   "id": "LIS",
   "name": "Lisbon Airport",
   "timezone": "Europe/Lisbon",
   "dataset_label": "Venues from lisbonairport.pt, checked Nov 2026",
   "entry_guidance_url": "https://vistos.mne.gov.pt/en/short-stay-visas-schengen/general-information/who-needs-a-visa"
  },
  {
   "id": "SIN",
   "name": "Singapore Changi Airport",
   "timezone": "Asia/Singapore",
   "dataset_label": "Venues from changiairport.com and jewelchangiairport.com, checked Nov 2026",
   "entry_guidance_url": "https://www.ica.gov.sg/enter-transit-depart/entering-singapore/visa_requirements"
  }
 ],
 "activities": [
  {
   "id": "10000000-0000-4000-8000-000000000001",
   "airport_id": "LIS",
   "name": "O Mercado food court",
   "description": "Food court styled on a Portuguese market, after security in Terminal 1. Listed hours 05:30–22:00.",
   "category": "food",
   "terminal": "Terminal 1, after security",
   "access_zone": "airside",
   "duration_minutes": 40,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/o-mercado"
  },
  {
   "id": "10000000-0000-4000-8000-000000000002",
   "airport_id": "LIS",
   "name": "ANA Lounge",
   "description": "Airport lounge after security in Terminal 1. Listed hours 04:00–23:00; maximum stay three hours. Paid access.",
   "category": "rest",
   "terminal": "Terminal 1, after security",
   "access_zone": "airside",
   "duration_minutes": 60,
   "budget_label": "Paid",
   "is_demo": false,
   "source_url": "https://www.lisbonairport.pt/en/lis/services-shopping/premium-services/ana-lounge"
  },
  {
   "id": "10000000-0000-4000-8000-000000000003",
   "airport_id": "LIS",
   "name": "Lisboa Duty Free",
   "description": "Duty-free shopping in Terminal 1 departures, after security. Listed hours 04:30–23:00 (non-Schengen area from 06:00).",
   "category": "shopping",
   "terminal": "Terminal 1, after security",
   "access_zone": "airside",
   "duration_minutes": 30,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/lisboa-duty-free"
  },
  {
   "id": "10000000-0000-4000-8000-000000000004",
   "airport_id": "LIS",
   "name": "Fnac",
   "description": "Books, music and electronics in Terminal 1.",
   "category": "shopping",
   "terminal": "Terminal 1",
   "access_zone": "unknown",
   "duration_minutes": 20,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/shops"
  },
  {
   "id": "10000000-0000-4000-8000-000000000005",
   "airport_id": "LIS",
   "name": "LEGO Store",
   "description": "LEGO shop in Terminal 1.",
   "category": "shopping",
   "terminal": "Terminal 1",
   "access_zone": "unknown",
   "duration_minutes": 15,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/shops"
  },
  {
   "id": "10000000-0000-4000-8000-000000000006",
   "airport_id": "LIS",
   "name": "Padaria Lisboa",
   "description": "Bakery and café listed among Lisbon Airport's restaurants and cafés.",
   "category": "food",
   "terminal": "Terminal 1",
   "access_zone": "unknown",
   "duration_minutes": 25,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/restaurants-and-cafes"
  },
  {
   "id": "20000000-0000-4000-8000-000000000001",
   "airport_id": "SIN",
   "name": "LeMa Dumpling and LE Congee & Noodle House",
   "description": "Handmade dumplings, congee and noodles in the Terminal 3 transit area, Level 2. Listed hours 06:00–01:00.",
   "category": "food",
   "terminal": "Terminal 3 transit, Level 2",
   "access_zone": "airside",
   "duration_minutes": 45,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.changiairport.com/id/en/experience/transit/transit-dapat-lebih/t3-more-than-12-hours.html"
  },
  {
   "id": "20000000-0000-4000-8000-000000000002",
   "airport_id": "SIN",
   "name": "Jewel Rain Vortex",
   "description": "The 40-metre indoor waterfall at the heart of Jewel's Shiseido Forest Valley. Jewel is in the public area, linked to Terminal 1 arrivals: you must clear immigration to visit. Listed hours 10:00–22:00.",
   "category": "culture",
   "terminal": "Jewel (public area, linked to T1, T2, T3)",
   "access_zone": "landside",
   "duration_minutes": 40,
   "budget_label": "Free",
   "is_demo": false,
   "source_url": "https://www.jewelchangiairport.com/en/attractions/rain-vortex.html"
  },
  {
   "id": "20000000-0000-4000-8000-000000000003",
   "airport_id": "SIN",
   "name": "Free Snooze Lounge",
   "description": "Free rest areas open 24 hours to all passengers, in the transit areas of Terminals 1, 2, 3 and 4.",
   "category": "rest",
   "terminal": "Transit areas, T1–T4",
   "access_zone": "airside",
   "duration_minutes": 45,
   "budget_label": "Free",
   "is_demo": false,
   "source_url": "https://www.changiairport.com/en/at-changi/facilities-and-services-directory/free-snooze-lounges-changi-airport-rest-areas.html"
  },
  {
   "id": "20000000-0000-4000-8000-000000000004",
   "airport_id": "SIN",
   "name": "Butterfly Garden",
   "description": "Tropical garden with over 1,000 butterflies and a 6-metre grotto waterfall in the Terminal 3 transit area. Open 24 hours.",
   "category": "culture",
   "terminal": "Terminal 3 transit, Levels 2–3",
   "access_zone": "airside",
   "duration_minutes": 30,
   "budget_label": "Free",
   "is_demo": false,
   "source_url": "https://www.changiairport.com/en/experience/attractions-directory/butterfly-garden.html"
  },
  {
   "id": "20000000-0000-4000-8000-000000000005",
   "airport_id": "SIN",
   "name": "Canopy Park",
   "description": "Gardens, a walking net and the Canopy Bridge on Jewel's top level. Requires clearing immigration. Paid entry.",
   "category": "culture",
   "terminal": "Jewel, top level (public area)",
   "access_zone": "landside",
   "duration_minutes": 75,
   "budget_label": "Paid",
   "is_demo": false,
   "source_url": "https://www.jewelchangiairport.com/en/attractions.html"
  },
  {
   "id": "20000000-0000-4000-8000-000000000006",
   "airport_id": "SIN",
   "name": "Rooftop pool with jacuzzi",
   "description": "Rooftop swimming pool at the transit hotel, Terminal 1, Level 3 near the D gates. Paid entry; hotel guests free.",
   "category": "rest",
   "terminal": "Terminal 1 transit, Level 3",
   "access_zone": "airside",
   "duration_minutes": 60,
   "budget_label": "Paid",
   "is_demo": false,
   "source_url": "https://www.changiairport.com/en/at-changi/facilities-and-services-directory/swimming-pool-with-jacuzzi.html"
  },
  {
   "id": "20000000-0000-4000-8000-000000000007",
   "airport_id": "SIN",
   "name": "Free Singapore Tour",
   "description": "Free 2.5-hour guided city bus tour for transit passengers with a layover of about 5.5–24 hours. Register at the T2 or T3 transit booths (08:00–19:00) or pre-book; seats are limited. Leaves the airport.",
   "category": "culture",
   "terminal": "Booths in T2 and T3 transit",
   "access_zone": "landside",
   "duration_minutes": 150,
   "budget_label": "Free",
   "is_demo": false,
   "source_url": "https://www.changiairport.com/en/experience/tours/free-singapore-tour.html"
  },
  {
   "id": "20000000-0000-4000-8000-000000000008",
   "airport_id": "SIN",
   "name": "Harry's",
   "description": "Comfort food and coffee in the Terminal 3 transit area, Level 2. Open 24 hours.",
   "category": "food",
   "terminal": "Terminal 3 transit, Level 2",
   "access_zone": "airside",
   "duration_minutes": 40,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.changiairport.com/id/en/experience/transit/transit-dapat-lebih/t3-more-than-12-hours.html"
  },
  {
   "id": "40000000-0000-4000-8000-000000000001",
   "airport_id": "LHR",
   "name": "Gordon Ramsay Plane Food Market",
   "description": "Market-style dining with breakfast, sushi, burgers and pizza, upstairs in Terminal 5 after security. Listed hours 05:00–21:30.",
   "category": "food",
   "terminal": "Terminal 5, after security",
   "access_zone": "airside",
   "duration_minutes": 45,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.heathrow.com/at-the-airport/restaurants-a-z/gordon-ramsay-plane-food"
  },
  {
   "id": "40000000-0000-4000-8000-000000000002",
   "airport_id": "LHR",
   "name": "Fortnum & Mason Bar",
   "description": "Bar from the London grocer, listed among Terminal 5's after-security restaurants.",
   "category": "food",
   "terminal": "Terminal 5, after security",
   "access_zone": "airside",
   "duration_minutes": 40,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.heathrow.com/at-the-airport/restaurants-a-z"
  },
  {
   "id": "40000000-0000-4000-8000-000000000003",
   "airport_id": "LHR",
   "name": "The Queen's Arms",
   "description": "Pub overlooking the airfield in the Terminal 2 departure hall.",
   "category": "food",
   "terminal": "Terminal 2 departures",
   "access_zone": "unknown",
   "duration_minutes": 45,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.heathrow.com/at-the-airport/restaurants-a-z/the-queens-arms"
  },
  {
   "id": "40000000-0000-4000-8000-000000000004",
   "airport_id": "LHR",
   "name": "The Curator Bar & Dining",
   "description": "British-inspired seasonal food and cocktails in Terminal 3 departures.",
   "category": "food",
   "terminal": "Terminal 3 departures",
   "access_zone": "unknown",
   "duration_minutes": 50,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.heathrow.com/at-the-airport/restaurants-a-z/the-curator"
  },
  {
   "id": "40000000-0000-4000-8000-000000000005",
   "airport_id": "LHR",
   "name": "Star Light (Wetherspoon)",
   "description": "Wetherspoon pub with quick service in Terminal 4. Listed hours 05:30–21:30.",
   "category": "food",
   "terminal": "Terminal 4",
   "access_zone": "unknown",
   "duration_minutes": 40,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.heathrow.com/at-the-airport/restaurants-a-z/star-light"
  },
  {
   "id": "40000000-0000-4000-8000-000000000006",
   "airport_id": "LHR",
   "name": "Plaza Premium Lounge (T2)",
   "description": "Pay-in lounge after security in Terminal 2 with food, drinks, Wi-Fi and showers. Paid entry; pre-book or walk in subject to capacity.",
   "category": "rest",
   "terminal": "Terminal 2, after security",
   "access_zone": "airside",
   "duration_minutes": 90,
   "budget_label": "Paid",
   "is_demo": false,
   "source_url": "https://www.heathrow.com/at-the-airport/lounges-hotels-spas/terminal-2/plaza-premium"
  },
  {
   "id": "40000000-0000-4000-8000-000000000007",
   "airport_id": "LHR",
   "name": "Plaza Premium Lounge (T4)",
   "description": "Pay-in lounge in Terminal 4. Paid entry; pre-book or walk in subject to capacity.",
   "category": "rest",
   "terminal": "Terminal 4",
   "access_zone": "unknown",
   "duration_minutes": 90,
   "budget_label": "Paid",
   "is_demo": false,
   "source_url": "https://www.heathrow.com/at-the-airport/lounges-hotels-spas/terminal-4/plaza-premium"
  },
  {
   "id": "40000000-0000-4000-8000-000000000008",
   "airport_id": "LHR",
   "name": "Harrods",
   "description": "The London department store, with a shop in each of Terminals 2, 3, 4 and 5.",
   "category": "shopping",
   "terminal": "Terminals 2, 3, 4 and 5",
   "access_zone": "unknown",
   "duration_minutes": 25,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://www.heathrow.com/at-the-airport/shops-a-z/harrods"
  },
  {
   "id": "50000000-0000-4000-8000-000000000001",
   "airport_id": "DXB",
   "name": "Sleepover lounge",
   "description": "Sleep pods and cabins, some with showers, for a short nap or overnight, in Terminal 3 Concourses A, B and C. Paid.",
   "category": "rest",
   "terminal": "Terminal 3, Concourses A, B and C",
   "access_zone": "airside",
   "duration_minutes": 120,
   "budget_label": "Paid",
   "is_demo": false,
   "source_url": "https://dubaiairports.ae/experiences/shops/details/sleepover"
  },
  {
   "id": "50000000-0000-4000-8000-000000000002",
   "airport_id": "DXB",
   "name": "Timeless Spa",
   "description": "Spa in the Dubai International Hotel, Terminal 3, at the B and C gates. Paid treatments.",
   "category": "rest",
   "terminal": "Terminal 3, B and C gates",
   "access_zone": "airside",
   "duration_minutes": 60,
   "budget_label": "Paid",
   "is_demo": false,
   "source_url": "https://connectblog.dubaiairports.ae/airport-life/5-massages-to-try-at-dxb/"
  },
  {
   "id": "50000000-0000-4000-8000-000000000003",
   "airport_id": "DXB",
   "name": "Be Relax spa",
   "description": "Airport spa at Terminal 1 D gates and several Terminal 3 gates. Paid treatments.",
   "category": "rest",
   "terminal": "Terminal 1 (D gates) and Terminal 3",
   "access_zone": "airside",
   "duration_minutes": 45,
   "budget_label": "Paid",
   "is_demo": false,
   "source_url": "https://dubaiairports.ae/experiences/shops/details/be-relax"
  },
  {
   "id": "50000000-0000-4000-8000-000000000004",
   "airport_id": "DXB",
   "name": "Al Majlis",
   "description": "Contemporary Emirati restaurant in Terminal 3 at the C gates.",
   "category": "food",
   "terminal": "Terminal 3, C gates",
   "access_zone": "airside",
   "duration_minutes": 60,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://dubaiairports.ae/experiences/restaurants"
  },
  {
   "id": "50000000-0000-4000-8000-000000000005",
   "airport_id": "DXB",
   "name": "The Daily DXB",
   "description": "Food hall with several stalls under one roof.",
   "category": "food",
   "terminal": "Unverified",
   "access_zone": "unknown",
   "duration_minutes": 40,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://dubaiairports.ae/experiences/restaurants"
  },
  {
   "id": "50000000-0000-4000-8000-000000000006",
   "airport_id": "DXB",
   "name": "Dubai Duty Free",
   "description": "The airport's duty-free retailer, with shops across Terminals 1 and 3.",
   "category": "shopping",
   "terminal": "Terminals 1 and 3",
   "access_zone": "airside",
   "duration_minutes": 40,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://dubaiairports.ae/experiences/shops"
  },
  {
   "id": "50000000-0000-4000-8000-000000000007",
   "airport_id": "DXB",
   "name": "Aesop",
   "description": "Skin and body care store in Terminal 3.",
   "category": "shopping",
   "terminal": "Terminal 3",
   "access_zone": "unknown",
   "duration_minutes": 15,
   "budget_label": "Unknown",
   "is_demo": false,
   "source_url": "https://dubaiairports.ae/experiences/shops"
  }
 ],
 "itinerary_templates": [
  {
   "id": "30000000-0000-4000-8000-000000000001",
   "airport_id": "LIS",
   "name": "Market lunch and lounge",
   "description": "A food-court meal at O Mercado, then a rest in the ANA Lounge. Both after security in Terminal 1."
  },
  {
   "id": "30000000-0000-4000-8000-000000000002",
   "airport_id": "SIN",
   "name": "Dumplings and a nap",
   "description": "Dumplings in the T3 transit area, then a free Snooze Lounge. No immigration needed."
  },
  {
   "id": "30000000-0000-4000-8000-000000000003",
   "airport_id": "SIN",
   "name": "Butterflies and dinner",
   "description": "The T3 Butterfly Garden, then comfort food at Harry's on the same level. No immigration needed."
  },
  {
   "id": "30000000-0000-4000-8000-000000000004",
   "airport_id": "LHR",
   "name": "Terminal 2 pub and lounge",
   "description": "Lunch at The Queen's Arms, then the Plaza Premium Lounge. Both in Terminal 2."
  },
  {
   "id": "30000000-0000-4000-8000-000000000005",
   "airport_id": "DXB",
   "name": "Emirati dinner and spa",
   "description": "Dinner at Al Majlis, then a treatment at Timeless Spa. Both in Terminal 3 at the B/C gates."
  }
 ],
 "template_items": [
  {
   "template_id": "30000000-0000-4000-8000-000000000001",
   "airport_id": "LIS",
   "activity_id": "10000000-0000-4000-8000-000000000001",
   "position": 1
  },
  {
   "template_id": "30000000-0000-4000-8000-000000000001",
   "airport_id": "LIS",
   "activity_id": "10000000-0000-4000-8000-000000000002",
   "position": 2
  },
  {
   "template_id": "30000000-0000-4000-8000-000000000002",
   "airport_id": "SIN",
   "activity_id": "20000000-0000-4000-8000-000000000001",
   "position": 1
  },
  {
   "template_id": "30000000-0000-4000-8000-000000000002",
   "airport_id": "SIN",
   "activity_id": "20000000-0000-4000-8000-000000000003",
   "position": 2
  },
  {
   "template_id": "30000000-0000-4000-8000-000000000003",
   "airport_id": "SIN",
   "activity_id": "20000000-0000-4000-8000-000000000004",
   "position": 1
  },
  {
   "template_id": "30000000-0000-4000-8000-000000000003",
   "airport_id": "SIN",
   "activity_id": "20000000-0000-4000-8000-000000000008",
   "position": 2
  },
  {
   "template_id": "30000000-0000-4000-8000-000000000004",
   "airport_id": "LHR",
   "activity_id": "40000000-0000-4000-8000-000000000003",
   "position": 1
  },
  {
   "template_id": "30000000-0000-4000-8000-000000000004",
   "airport_id": "LHR",
   "activity_id": "40000000-0000-4000-8000-000000000006",
   "position": 2
  },
  {
   "template_id": "30000000-0000-4000-8000-000000000005",
   "airport_id": "DXB",
   "activity_id": "50000000-0000-4000-8000-000000000004",
   "position": 1
  },
  {
   "template_id": "30000000-0000-4000-8000-000000000005",
   "airport_id": "DXB",
   "activity_id": "50000000-0000-4000-8000-000000000002",
   "position": 2
  }
 ],
 "airport_locations": [
  {
   "id": "SIN-JEWEL",
   "airport_id": "SIN",
   "name": "Jewel (public area)",
   "kind": "public_area",
   "zone": "landside",
   "terminal": null,
   "source_url": "https://www.jewelchangiairport.com/en/getting-to-jewel.html"
  },
  {
   "id": "SIN-T1-TRANSIT",
   "airport_id": "SIN",
   "name": "Terminal 1 transit area",
   "kind": "transit_area",
   "zone": "airside",
   "terminal": "T1",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html"
  },
  {
   "id": "SIN-T2-TRANSIT",
   "airport_id": "SIN",
   "name": "Terminal 2 transit area",
   "kind": "transit_area",
   "zone": "airside",
   "terminal": "T2",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html"
  },
  {
   "id": "SIN-T3-TRANSIT",
   "airport_id": "SIN",
   "name": "Terminal 3 transit area",
   "kind": "transit_area",
   "zone": "airside",
   "terminal": "T3",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html"
  },
  {
   "id": "SIN-T4-TRANSIT",
   "airport_id": "SIN",
   "name": "Terminal 4 transit area",
   "kind": "transit_area",
   "zone": "airside",
   "terminal": "T4",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html"
  }
 ],
 "airport_transfers": [
  {
   "id": "SIN-JWT1",
   "airport_id": "SIN",
   "from_location": "SIN-JEWEL",
   "to_location": "SIN-T1-TRANSIT",
   "mode": "walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": false,
   "requires_departure_checks": true,
   "requires_through_check": false,
   "verification": "planning_estimate",
   "source_url": "https://www.jewelchangiairport.com/en/getting-to-jewel.html",
   "note": "Walk to Terminal 1, then check-in, departure immigration and security. No walking time is published."
  },
  {
   "id": "SIN-JWT2",
   "airport_id": "SIN",
   "from_location": "SIN-JEWEL",
   "to_location": "SIN-T2-TRANSIT",
   "mode": "link_bridge_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": false,
   "requires_departure_checks": true,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.jewelchangiairport.com/en/getting-to-jewel.html",
   "note": "Link bridge to the T2 Departure Hall, then check-in, departure immigration and security before the transit area."
  },
  {
   "id": "SIN-JWT3",
   "airport_id": "SIN",
   "from_location": "SIN-JEWEL",
   "to_location": "SIN-T3-TRANSIT",
   "mode": "link_bridge_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": false,
   "requires_departure_checks": true,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.jewelchangiairport.com/en/getting-to-jewel.html",
   "note": "Link bridge to the T3 Departure Hall, then check-in, departure immigration and security before the transit area."
  },
  {
   "id": "SIN-T1JW",
   "airport_id": "SIN",
   "from_location": "SIN-T1-TRANSIT",
   "to_location": "SIN-JEWEL",
   "mode": "walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": true,
   "requires_departure_checks": false,
   "requires_through_check": false,
   "verification": "planning_estimate",
   "source_url": "https://www.jewelchangiairport.com/en/getting-to-jewel.html",
   "note": "After arrival immigration: Jewel is directly connected to the T1 Arrival Hall. No walking time is published."
  },
  {
   "id": "SIN-T1T2",
   "airport_id": "SIN",
   "from_location": "SIN-T1-TRANSIT",
   "to_location": "SIN-T2-TRANSIT",
   "mode": "skytrain_or_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Skytrain 05:00–02:00; travellators 24 hours."
  },
  {
   "id": "SIN-T1T3",
   "airport_id": "SIN",
   "from_location": "SIN-T1-TRANSIT",
   "to_location": "SIN-T3-TRANSIT",
   "mode": "skytrain_or_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Skytrain 05:00–02:00; travellators 24 hours."
  },
  {
   "id": "SIN-T1T4",
   "airport_id": "SIN",
   "from_location": "SIN-T1-TRANSIT",
   "to_location": "SIN-T4-TRANSIT",
   "mode": "shuttle_bus",
   "min_minutes": 10,
   "max_minutes": 18,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": true,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Transit shuttle bus; only for passengers through-checked to their final destination."
  },
  {
   "id": "SIN-T2JW",
   "airport_id": "SIN",
   "from_location": "SIN-T2-TRANSIT",
   "to_location": "SIN-JEWEL",
   "mode": "link_bridge_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": true,
   "requires_departure_checks": false,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.jewelchangiairport.com/en/getting-to-jewel.html",
   "note": "After arrival immigration: link bridge from the T2 Departure Hall (Level 2, near row 1). Time from immigration to the hall is not published."
  },
  {
   "id": "SIN-T2T1",
   "airport_id": "SIN",
   "from_location": "SIN-T2-TRANSIT",
   "to_location": "SIN-T1-TRANSIT",
   "mode": "skytrain_or_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Skytrain 05:00–02:00; travellators 24 hours."
  },
  {
   "id": "SIN-T2T3",
   "airport_id": "SIN",
   "from_location": "SIN-T2-TRANSIT",
   "to_location": "SIN-T3-TRANSIT",
   "mode": "skytrain_or_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Skytrain 05:00–02:00; travellators 24 hours."
  },
  {
   "id": "SIN-T2T4",
   "airport_id": "SIN",
   "from_location": "SIN-T2-TRANSIT",
   "to_location": "SIN-T4-TRANSIT",
   "mode": "shuttle_bus",
   "min_minutes": 10,
   "max_minutes": 18,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": true,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Transit shuttle bus; only for passengers through-checked to their final destination."
  },
  {
   "id": "SIN-T3JW",
   "airport_id": "SIN",
   "from_location": "SIN-T3-TRANSIT",
   "to_location": "SIN-JEWEL",
   "mode": "link_bridge_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": true,
   "requires_departure_checks": false,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.jewelchangiairport.com/en/getting-to-jewel.html",
   "note": "After arrival immigration: link bridge from the T3 Departure Hall (Level 2, near row 11). Time from immigration to the hall is not published."
  },
  {
   "id": "SIN-T3T1",
   "airport_id": "SIN",
   "from_location": "SIN-T3-TRANSIT",
   "to_location": "SIN-T1-TRANSIT",
   "mode": "skytrain_or_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Skytrain 05:00–02:00; travellators 24 hours."
  },
  {
   "id": "SIN-T3T2",
   "airport_id": "SIN",
   "from_location": "SIN-T3-TRANSIT",
   "to_location": "SIN-T2-TRANSIT",
   "mode": "skytrain_or_walk",
   "min_minutes": 5,
   "max_minutes": 10,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": false,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Skytrain 05:00–02:00; travellators 24 hours."
  },
  {
   "id": "SIN-T3T4",
   "airport_id": "SIN",
   "from_location": "SIN-T3-TRANSIT",
   "to_location": "SIN-T4-TRANSIT",
   "mode": "shuttle_bus",
   "min_minutes": 10,
   "max_minutes": 18,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": true,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Transit shuttle bus; only for passengers through-checked to their final destination."
  },
  {
   "id": "SIN-T4T1",
   "airport_id": "SIN",
   "from_location": "SIN-T4-TRANSIT",
   "to_location": "SIN-T1-TRANSIT",
   "mode": "shuttle_bus",
   "min_minutes": 10,
   "max_minutes": 18,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": true,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Transit shuttle bus; only for passengers through-checked to their final destination."
  },
  {
   "id": "SIN-T4T2",
   "airport_id": "SIN",
   "from_location": "SIN-T4-TRANSIT",
   "to_location": "SIN-T2-TRANSIT",
   "mode": "shuttle_bus",
   "min_minutes": 10,
   "max_minutes": 18,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": true,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Transit shuttle bus; only for passengers through-checked to their final destination."
  },
  {
   "id": "SIN-T4T3",
   "airport_id": "SIN",
   "from_location": "SIN-T4-TRANSIT",
   "to_location": "SIN-T3-TRANSIT",
   "mode": "shuttle_bus",
   "min_minutes": 10,
   "max_minutes": 18,
   "requires_immigration": false,
   "requires_departure_checks": false,
   "requires_through_check": true,
   "verification": "official",
   "source_url": "https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html",
   "note": "Transit shuttle bus; only for passengers through-checked to their final destination."
  }
 ],
 "activity_locations": [
  {
   "activity_id": "20000000-0000-4000-8000-000000000001",
   "airport_id": "SIN",
   "location_id": "SIN-T3-TRANSIT"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000002",
   "airport_id": "SIN",
   "location_id": "SIN-JEWEL"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000003",
   "airport_id": "SIN",
   "location_id": "SIN-T1-TRANSIT"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000003",
   "airport_id": "SIN",
   "location_id": "SIN-T2-TRANSIT"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000003",
   "airport_id": "SIN",
   "location_id": "SIN-T3-TRANSIT"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000003",
   "airport_id": "SIN",
   "location_id": "SIN-T4-TRANSIT"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000004",
   "airport_id": "SIN",
   "location_id": "SIN-T3-TRANSIT"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000005",
   "airport_id": "SIN",
   "location_id": "SIN-JEWEL"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000006",
   "airport_id": "SIN",
   "location_id": "SIN-T1-TRANSIT"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000007",
   "airport_id": "SIN",
   "location_id": "SIN-T2-TRANSIT"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000007",
   "airport_id": "SIN",
   "location_id": "SIN-T3-TRANSIT"
  },
  {
   "activity_id": "20000000-0000-4000-8000-000000000008",
   "airport_id": "SIN",
   "location_id": "SIN-T3-TRANSIT"
  }
 ]
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** One fake backend shared by every browser context in a test run (so "another guest" is really isolated by token). */
export function createFakeSupabase() {
  const plans = new Map(); let users = 0;
  const db = { plans, calls: [], failNext: {} };
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  const userOf = (req) => { const m = /^Bearer (.+)$/.exec(req.headers()['authorization'] || ''); try { return JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url')).sub; } catch { return null; } };
  const withItems = (p) => ({ ...p.row, plan_items: p.items });

  db.handler = async (route) => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname; const method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    db.calls.push(`${method} ${path}`);
    const fail = Object.keys(db.failNext).find((k) => path.includes(k) && db.failNext[k] > 0);
    if (fail) { db.failNext[fail]--; return json(route, 500, { message: 'simulated server failure', code: 'XX000' }); }

    if (path === '/auth/v1/signup') {
      const sub = `00000000-0000-4000-8000-${String(++users).padStart(12, '0')}`; const exp = Math.floor(Date.now() / 1000) + 3600;
      const user = { id: sub, aud: 'authenticated', role: 'authenticated', is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
      return json(route, 200, { access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', exp, is_anonymous: true })}.sig`, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: `r-${sub}`, user });
    }
    const table = path.replace('/rest/v1/', '');
    if (method === 'GET' && SEED[table]) {
      let rows = SEED[table];
      for (const [k, v] of url.searchParams) {
        if (v.startsWith('eq.')) rows = rows.filter((r) => String(r[k]) === v.slice(3));
        if (v.startsWith('in.(')) { const set = v.slice(4, -1).split(',').map((x) => x.replace(/"/g, '')); rows = rows.filter((r) => set.includes(String(r[k]))); }
      }
      return json(route, 200, rows);
    }
    if (path === '/rest/v1/rpc/save_plan') {
      const uid = userOf(req); if (!uid) return json(route, 401, { code: '42501', message: 'permission denied for function save_plan' });
      const a = req.postDataJSON(); const cur = plans.get(a.p_id);
      if (a.p_expected_revision === 0 ? !!cur : !cur || cur.row.owner_id !== uid) return json(route, 403, { code: '42501', message: 'PLAN_UNAVAILABLE' });
      if (cur && cur.row.revision !== a.p_expected_revision) return json(route, 409, { code: '40001', message: 'PLAN_CONFLICT' });
      const acts = a.p_activity_ids.map((id) => SEED.activities.find((x) => x.id === id && x.airport_id === a.p_airport_id));
      if (acts.some((x) => !x) || new Date(a.p_departure_at) <= new Date(a.p_arrival_at)) return json(route, 400, { code: '22023', message: 'INVALID_INPUT' });
      const now = new Date().toISOString();
      const row = { id: a.p_id, owner_id: uid, airport_id: a.p_airport_id, arrival_at: a.p_arrival_at, departure_at: a.p_departure_at, buffer_minutes: a.p_buffer_minutes, revision: a.p_expected_revision + 1, created_at: cur?.row.created_at ?? now, updated_at: now };
      plans.set(a.p_id, { row, items: acts.map((x, i) => ({ position: i + 1, activity_id: x.id, duration_minutes: x.duration_minutes })) });
      return json(route, 200, row);
    }
    if (table === 'layovers' && method === 'GET') {
      const uid = userOf(req); if (!uid) return json(route, 401, { code: '42501', message: 'permission denied for table layovers' });
      let mine = [...plans.values()].filter((p) => p.row.owner_id === uid);
      const id = url.searchParams.get('id'); if (id) mine = mine.filter((p) => p.row.id === id.replace('eq.', ''));
      mine.sort((x, y) => y.row.created_at.localeCompare(x.row.created_at));
      const single = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
      return single ? (mine.length === 1 ? json(route, 200, withItems(mine[0])) : json(route, 406, { code: 'PGRST116', message: 'not a single row', details: `The result contains ${mine.length} rows` })) : json(route, 200, mine.map(withItems));
    }
    return json(route, 404, { message: `fake backend: unhandled ${method} ${path}` });
  };
  return db;
}
