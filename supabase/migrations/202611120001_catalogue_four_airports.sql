-- SkyStop catalogue: four supported airports (SIN, LIS, LHR, DXB) with real venues.
-- Additive and idempotent: safe to run more than once. Nothing is deleted.
-- * Adds a nullable source_url column (verification source per venue).
-- * Adds LHR and DXB.
-- * Converts the eight former "Demo" rows IN PLACE (same ids) into real venues, so saved plans and
--   curated itineraries that reference them stay valid (plan_items keep their own duration snapshot).
-- * Upserts the new venues and curated itineraries with fixed ids.
-- Facts come from the official airport websites (checked 12 Nov 2026). Terminal and airside/landside are
-- only stated where the source states them; otherwise 'unknown'. Durations are planning estimates.
-- Prices: 'Free' / 'Paid' only where the source says so; otherwise 'Unknown'. Hours change: confirm before travel.
begin;

alter table public.activities add column if not exists source_url text;

insert into public.airports(id,name,timezone,dataset_label) values
 ('LIS','Lisbon Airport','Europe/Lisbon','Venues from lisbonairport.pt, checked Nov 2026'),
 ('SIN','Singapore Changi Airport','Asia/Singapore','Venues from changiairport.com and jewelchangiairport.com, checked Nov 2026'),
 ('LHR','London Heathrow Airport','Europe/London','Venues from heathrow.com, checked Nov 2026'),
 ('DXB','Dubai International Airport','Asia/Dubai','Venues from dubaiairports.ae, checked Nov 2026')
on conflict(id) do update set name=excluded.name, timezone=excluded.timezone, dataset_label=excluded.dataset_label;

insert into public.activities(id,airport_id,name,description,category,terminal,access_zone,duration_minutes,budget_label,is_demo,source_url) values
-- Lisbon (Humberto Delgado)
 ('10000000-0000-4000-8000-000000000001','LIS','O Mercado food court','Food court styled on a Portuguese market, after security in Terminal 1. Listed hours 05:30–22:00.','food','Terminal 1, after security','airside',40,'Unknown',false,'https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/o-mercado'),
 ('10000000-0000-4000-8000-000000000002','LIS','ANA Lounge','Airport lounge after security in Terminal 1. Listed hours 04:00–23:00; maximum stay three hours. Paid access.','rest','Terminal 1, after security','airside',60,'Paid',false,'https://www.lisbonairport.pt/en/lis/services-shopping/premium-services/ana-lounge'),
 ('10000000-0000-4000-8000-000000000003','LIS','Lisboa Duty Free','Duty-free shopping in Terminal 1 departures, after security. Listed hours 04:30–23:00 (non-Schengen area from 06:00).','shopping','Terminal 1, after security','airside',30,'Unknown',false,'https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/lisboa-duty-free'),
 ('10000000-0000-4000-8000-000000000004','LIS','Fnac','Books, music and electronics in Terminal 1.','shopping','Terminal 1','unknown',20,'Unknown',false,'https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/shops'),
 ('10000000-0000-4000-8000-000000000005','LIS','LEGO Store','LEGO shop in Terminal 1.','shopping','Terminal 1','unknown',15,'Unknown',false,'https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/shops'),
 ('10000000-0000-4000-8000-000000000006','LIS','Padaria Lisboa','Bakery and café listed among Lisbon Airport''s restaurants and cafés.','food','Terminal 1','unknown',25,'Unknown',false,'https://www.lisbonairport.pt/en/lis/services-shopping/shops-and-food/restaurants-and-cafes'),
-- Singapore Changi
 ('20000000-0000-4000-8000-000000000001','SIN','LeMa Dumpling and LE Congee & Noodle House','Handmade dumplings, congee and noodles in the Terminal 3 transit area, Level 2. Listed hours 06:00–01:00.','food','Terminal 3 transit, Level 2','airside',45,'Unknown',false,'https://www.changiairport.com/id/en/experience/transit/transit-dapat-lebih/t3-more-than-12-hours.html'),
 ('20000000-0000-4000-8000-000000000002','SIN','Jewel Rain Vortex','The 40-metre indoor waterfall at the heart of Jewel''s Shiseido Forest Valley. Jewel is in the public area, linked to Terminal 1 arrivals: you must clear immigration to visit. Listed hours 10:00–22:00.','culture','Jewel (public area, linked to T1, T2, T3)','landside',40,'Free',false,'https://www.jewelchangiairport.com/en/attractions/rain-vortex.html'),
 ('20000000-0000-4000-8000-000000000003','SIN','Free Snooze Lounge','Free rest areas open 24 hours to all passengers, in the transit areas of Terminals 1, 2, 3 and 4.','rest','Transit areas, T1–T4','airside',45,'Free',false,'https://www.changiairport.com/en/at-changi/facilities-and-services-directory/free-snooze-lounges-changi-airport-rest-areas.html'),
 ('20000000-0000-4000-8000-000000000004','SIN','Butterfly Garden','Tropical garden with over 1,000 butterflies and a 6-metre grotto waterfall in the Terminal 3 transit area. Open 24 hours.','culture','Terminal 3 transit, Levels 2–3','airside',30,'Free',false,'https://www.changiairport.com/en/experience/attractions-directory/butterfly-garden.html'),
 ('20000000-0000-4000-8000-000000000005','SIN','Canopy Park','Gardens, a walking net and the Canopy Bridge on Jewel''s top level. Requires clearing immigration. Paid entry.','culture','Jewel, top level (public area)','landside',75,'Paid',false,'https://www.jewelchangiairport.com/en/attractions.html'),
 ('20000000-0000-4000-8000-000000000006','SIN','Rooftop pool with jacuzzi','Rooftop swimming pool at the transit hotel, Terminal 1, Level 3 near the D gates. Paid entry; hotel guests free.','rest','Terminal 1 transit, Level 3','airside',60,'Paid',false,'https://www.changiairport.com/en/at-changi/facilities-and-services-directory/swimming-pool-with-jacuzzi.html'),
 ('20000000-0000-4000-8000-000000000007','SIN','Free Singapore Tour','Free 2.5-hour guided city bus tour for transit passengers with a layover of about 5.5–24 hours. Register at the T2 or T3 transit booths (08:00–19:00) or pre-book; seats are limited. Leaves the airport.','culture','Booths in T2 and T3 transit','landside',150,'Free',false,'https://www.changiairport.com/en/experience/tours/free-singapore-tour.html'),
 ('20000000-0000-4000-8000-000000000008','SIN','Harry''s','Comfort food and coffee in the Terminal 3 transit area, Level 2. Open 24 hours.','food','Terminal 3 transit, Level 2','airside',40,'Unknown',false,'https://www.changiairport.com/id/en/experience/transit/transit-dapat-lebih/t3-more-than-12-hours.html'),
-- London Heathrow
 ('40000000-0000-4000-8000-000000000001','LHR','Gordon Ramsay Plane Food Market','Market-style dining with breakfast, sushi, burgers and pizza, upstairs in Terminal 5 after security. Listed hours 05:00–21:30.','food','Terminal 5, after security','airside',45,'Unknown',false,'https://www.heathrow.com/at-the-airport/restaurants-a-z/gordon-ramsay-plane-food'),
 ('40000000-0000-4000-8000-000000000002','LHR','Fortnum & Mason Bar','Bar from the London grocer, listed among Terminal 5''s after-security restaurants.','food','Terminal 5, after security','airside',40,'Unknown',false,'https://www.heathrow.com/at-the-airport/restaurants-a-z'),
 ('40000000-0000-4000-8000-000000000003','LHR','The Queen''s Arms','Pub overlooking the airfield in the Terminal 2 departure hall.','food','Terminal 2 departures','unknown',45,'Unknown',false,'https://www.heathrow.com/at-the-airport/restaurants-a-z/the-queens-arms'),
 ('40000000-0000-4000-8000-000000000004','LHR','The Curator Bar & Dining','British-inspired seasonal food and cocktails in Terminal 3 departures.','food','Terminal 3 departures','unknown',50,'Unknown',false,'https://www.heathrow.com/at-the-airport/restaurants-a-z/the-curator'),
 ('40000000-0000-4000-8000-000000000005','LHR','Star Light (Wetherspoon)','Wetherspoon pub with quick service in Terminal 4. Listed hours 05:30–21:30.','food','Terminal 4','unknown',40,'Unknown',false,'https://www.heathrow.com/at-the-airport/restaurants-a-z/star-light'),
 ('40000000-0000-4000-8000-000000000006','LHR','Plaza Premium Lounge (T2)','Pay-in lounge after security in Terminal 2 with food, drinks, Wi-Fi and showers. Paid entry; pre-book or walk in subject to capacity.','rest','Terminal 2, after security','airside',90,'Paid',false,'https://www.heathrow.com/at-the-airport/lounges-hotels-spas/terminal-2/plaza-premium'),
 ('40000000-0000-4000-8000-000000000007','LHR','Plaza Premium Lounge (T4)','Pay-in lounge in Terminal 4. Paid entry; pre-book or walk in subject to capacity.','rest','Terminal 4','unknown',90,'Paid',false,'https://www.heathrow.com/at-the-airport/lounges-hotels-spas/terminal-4/plaza-premium'),
 ('40000000-0000-4000-8000-000000000008','LHR','Harrods','The London department store, with a shop in each of Terminals 2, 3, 4 and 5.','shopping','Terminals 2, 3, 4 and 5','unknown',25,'Unknown',false,'https://www.heathrow.com/at-the-airport/shops-a-z/harrods'),
-- Dubai International
 ('50000000-0000-4000-8000-000000000001','DXB','Sleepover lounge','Sleep pods and cabins, some with showers, for a short nap or overnight, in Terminal 3 Concourses A, B and C. Paid.','rest','Terminal 3, Concourses A, B and C','airside',120,'Paid',false,'https://dubaiairports.ae/experiences/shops/details/sleepover'),
 ('50000000-0000-4000-8000-000000000002','DXB','Timeless Spa','Spa in the Dubai International Hotel, Terminal 3, at the B and C gates. Paid treatments.','rest','Terminal 3, B and C gates','airside',60,'Paid',false,'https://connectblog.dubaiairports.ae/airport-life/5-massages-to-try-at-dxb/'),
 ('50000000-0000-4000-8000-000000000003','DXB','Be Relax spa','Airport spa at Terminal 1 D gates and several Terminal 3 gates. Paid treatments.','rest','Terminal 1 (D gates) and Terminal 3','airside',45,'Paid',false,'https://dubaiairports.ae/experiences/shops/details/be-relax'),
 ('50000000-0000-4000-8000-000000000004','DXB','Al Majlis','Contemporary Emirati restaurant in Terminal 3 at the C gates.','food','Terminal 3, C gates','airside',60,'Unknown',false,'https://dubaiairports.ae/experiences/restaurants'),
 ('50000000-0000-4000-8000-000000000005','DXB','The Daily DXB','Food hall with several stalls under one roof.','food','Unverified','unknown',40,'Unknown',false,'https://dubaiairports.ae/experiences/restaurants'),
 ('50000000-0000-4000-8000-000000000006','DXB','Dubai Duty Free','The airport''s duty-free retailer, with shops across Terminals 1 and 3.','shopping','Terminals 1 and 3','airside',40,'Unknown',false,'https://dubaiairports.ae/experiences/shops'),
 ('50000000-0000-4000-8000-000000000007','DXB','Aesop','Skin and body care store in Terminal 3.','shopping','Terminal 3','unknown',15,'Unknown',false,'https://dubaiairports.ae/experiences/shops')
on conflict(id) do update set airport_id=excluded.airport_id, name=excluded.name, description=excluded.description, category=excluded.category,
  terminal=excluded.terminal, access_zone=excluded.access_zone, duration_minutes=excluded.duration_minutes, budget_label=excluded.budget_label,
  is_demo=excluded.is_demo, source_url=excluded.source_url;

insert into public.itinerary_templates(id,airport_id,name,description) values
 ('30000000-0000-4000-8000-000000000001','LIS','Market lunch and lounge','A food-court meal at O Mercado, then a rest in the ANA Lounge. Both after security in Terminal 1.'),
 ('30000000-0000-4000-8000-000000000002','SIN','Dumplings and a nap','Dumplings in the T3 transit area, then a free Snooze Lounge. No immigration needed.'),
 ('30000000-0000-4000-8000-000000000003','SIN','Butterflies and dinner','The T3 Butterfly Garden, then comfort food at Harry''s on the same level. No immigration needed.'),
 ('30000000-0000-4000-8000-000000000004','LHR','Terminal 2 pub and lounge','Lunch at The Queen''s Arms, then the Plaza Premium Lounge. Both in Terminal 2.'),
 ('30000000-0000-4000-8000-000000000005','DXB','Emirati dinner and spa','Dinner at Al Majlis, then a treatment at Timeless Spa. Both in Terminal 3 at the B/C gates.')
on conflict(id) do update set airport_id=excluded.airport_id, name=excluded.name, description=excluded.description;

insert into public.template_items(template_id,airport_id,activity_id,position) values
 ('30000000-0000-4000-8000-000000000003','SIN','20000000-0000-4000-8000-000000000004',1),
 ('30000000-0000-4000-8000-000000000003','SIN','20000000-0000-4000-8000-000000000008',2),
 ('30000000-0000-4000-8000-000000000004','LHR','40000000-0000-4000-8000-000000000003',1),
 ('30000000-0000-4000-8000-000000000004','LHR','40000000-0000-4000-8000-000000000006',2),
 ('30000000-0000-4000-8000-000000000005','DXB','50000000-0000-4000-8000-000000000004',1),
 ('30000000-0000-4000-8000-000000000005','DXB','50000000-0000-4000-8000-000000000002',2)
on conflict do nothing;
-- the two original itineraries' items (already present on the hosted DB; included so a fresh database is complete)
insert into public.template_items(template_id,airport_id,activity_id,position) values
 ('30000000-0000-4000-8000-000000000001','LIS','10000000-0000-4000-8000-000000000001',1),
 ('30000000-0000-4000-8000-000000000001','LIS','10000000-0000-4000-8000-000000000002',2),
 ('30000000-0000-4000-8000-000000000002','SIN','20000000-0000-4000-8000-000000000001',1),
 ('30000000-0000-4000-8000-000000000002','SIN','20000000-0000-4000-8000-000000000003',2)
on conflict do nothing;

commit;
