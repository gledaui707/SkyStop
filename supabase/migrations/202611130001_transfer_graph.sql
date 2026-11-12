-- SkyStop: airport transfer graph (Changi pilot). Additive and idempotent: no existing table, row or policy is changed
-- or removed; saved plans are untouched (plans reference activities, never locations).
--  * airports.entry_guidance_url      official immigration page for the airport's country
--  * airport_locations                places a traveller moves between (transit areas, public areas such as Jewel)
--  * airport_transfers                DIRECTED connections between locations, with a minute range, the checkpoints the
--                                     move involves, and whether the figures are official or a labelled planning estimate
--  * activity_locations               which location(s) each venue is in (a venue may exist in several terminals)
-- Changi facts are from changiairport.com / jewelchangiairport.com (checked 13 Nov 2026). Where the airport publishes
-- no time, the row says 'planning_estimate'. No checkpoint waiting time is stored anywhere: none is published.
begin;

alter table public.airports add column if not exists entry_guidance_url text;

create table if not exists public.airport_locations (
  id text primary key check (id ~ '^[A-Z]{3}-[A-Z0-9-]+$'),
  airport_id text not null references public.airports(id),
  name text not null,
  kind text not null check (kind in ('transit_area','public_area','terminal','concourse','checkpoint','transport')),
  zone text not null check (zone in ('airside','landside','unknown')),
  terminal text,
  source_url text,
  unique (id, airport_id)
);

create table if not exists public.airport_transfers (
  id text primary key,
  airport_id text not null,
  from_location text not null,
  to_location text not null,
  mode text not null check (mode in ('walk','skytrain_or_walk','shuttle_bus','link_bridge_walk')),
  min_minutes integer not null check (min_minutes between 0 and 600),
  max_minutes integer not null check (max_minutes between 0 and 600),
  -- entering the country: arrival immigration (and customs) before reaching the destination
  requires_immigration boolean not null default false,
  -- returning airside: check-in/boarding pass, departure immigration and security before reaching the destination
  requires_departure_checks boolean not null default false,
  -- the route is only open to passengers whose bags/tickets are through-checked
  requires_through_check boolean not null default false,
  verification text not null check (verification in ('official','planning_estimate')),
  source_url text,
  note text not null default '',
  check (max_minutes >= min_minutes),
  check (from_location <> to_location),
  foreign key (from_location, airport_id) references public.airport_locations(id, airport_id),
  foreign key (to_location, airport_id) references public.airport_locations(id, airport_id)
);

create table if not exists public.activity_locations (
  activity_id uuid not null,
  airport_id text not null,
  location_id text not null,
  primary key (activity_id, location_id),
  foreign key (activity_id, airport_id) references public.activities(id, airport_id),
  foreign key (location_id, airport_id) references public.airport_locations(id, airport_id)
);

-- Same access model as the rest of the catalogue: public read, no client writes.
alter table public.airport_locations enable row level security;
alter table public.airport_transfers enable row level security;
alter table public.activity_locations enable row level security;
revoke all on public.airport_locations, public.airport_transfers, public.activity_locations from anon, authenticated;
grant select on public.airport_locations, public.airport_transfers, public.activity_locations to anon, authenticated;
drop policy if exists catalogue_read on public.airport_locations;
drop policy if exists catalogue_read on public.airport_transfers;
drop policy if exists catalogue_read on public.activity_locations;
create policy catalogue_read on public.airport_locations for select to anon, authenticated using (true);
create policy catalogue_read on public.airport_transfers for select to anon, authenticated using (true);
create policy catalogue_read on public.activity_locations for select to anon, authenticated using (true);

update public.airports set entry_guidance_url = 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore/visa_requirements' where id = 'SIN';
update public.airports set entry_guidance_url = 'https://www.gov.uk/transit-visa' where id = 'LHR';
update public.airports set entry_guidance_url = 'https://vistos.mne.gov.pt/en/short-stay-visas-schengen/general-information/who-needs-a-visa' where id = 'LIS';
update public.airports set entry_guidance_url = 'https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/do-you-need-an-entry-permit-or-a-visa-to-enter-the-uae' where id = 'DXB';

-- Changi locations
insert into public.airport_locations(id, airport_id, name, kind, zone, terminal, source_url) values
 ('SIN-T1-TRANSIT','SIN','Terminal 1 transit area','transit_area','airside','T1','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html'),
 ('SIN-T2-TRANSIT','SIN','Terminal 2 transit area','transit_area','airside','T2','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html'),
 ('SIN-T3-TRANSIT','SIN','Terminal 3 transit area','transit_area','airside','T3','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html'),
 ('SIN-T4-TRANSIT','SIN','Terminal 4 transit area','transit_area','airside','T4','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html'),
 ('SIN-JEWEL','SIN','Jewel (public area)','public_area','landside',null,'https://www.jewelchangiairport.com/en/getting-to-jewel.html')
on conflict (id) do update set name = excluded.name, kind = excluded.kind, zone = excluded.zone, terminal = excluded.terminal, source_url = excluded.source_url;

-- Changi transfers (directed). T = transfer page, J = Getting to Jewel page.
insert into public.airport_transfers(id, airport_id, from_location, to_location, mode, min_minutes, max_minutes, requires_immigration, requires_departure_checks, requires_through_check, verification, source_url, note) values
 -- T1, T2, T3 transit areas: Skytrain (05:00–02:00) or inter-terminal travellators (24 h); 5–10 min, official
 ('SIN-T1T2','SIN','SIN-T1-TRANSIT','SIN-T2-TRANSIT','skytrain_or_walk',5,10,false,false,false,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Skytrain 05:00–02:00; travellators 24 hours.'),
 ('SIN-T2T1','SIN','SIN-T2-TRANSIT','SIN-T1-TRANSIT','skytrain_or_walk',5,10,false,false,false,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Skytrain 05:00–02:00; travellators 24 hours.'),
 ('SIN-T2T3','SIN','SIN-T2-TRANSIT','SIN-T3-TRANSIT','skytrain_or_walk',5,10,false,false,false,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Skytrain 05:00–02:00; travellators 24 hours.'),
 ('SIN-T3T2','SIN','SIN-T3-TRANSIT','SIN-T2-TRANSIT','skytrain_or_walk',5,10,false,false,false,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Skytrain 05:00–02:00; travellators 24 hours.'),
 ('SIN-T1T3','SIN','SIN-T1-TRANSIT','SIN-T3-TRANSIT','skytrain_or_walk',5,10,false,false,false,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Skytrain 05:00–02:00; travellators 24 hours.'),
 ('SIN-T3T1','SIN','SIN-T3-TRANSIT','SIN-T1-TRANSIT','skytrain_or_walk',5,10,false,false,false,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Skytrain 05:00–02:00; travellators 24 hours.'),
 -- T4 is not walkable from the other transit areas: transit shuttle bus, 10–18 min, through-checked passengers only
 ('SIN-T4T1','SIN','SIN-T4-TRANSIT','SIN-T1-TRANSIT','shuttle_bus',10,18,false,false,true,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Transit shuttle bus; only for passengers through-checked to their final destination.'),
 ('SIN-T1T4','SIN','SIN-T1-TRANSIT','SIN-T4-TRANSIT','shuttle_bus',10,18,false,false,true,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Transit shuttle bus; only for passengers through-checked to their final destination.'),
 ('SIN-T4T2','SIN','SIN-T4-TRANSIT','SIN-T2-TRANSIT','shuttle_bus',10,18,false,false,true,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Transit shuttle bus; only for passengers through-checked to their final destination.'),
 ('SIN-T2T4','SIN','SIN-T2-TRANSIT','SIN-T4-TRANSIT','shuttle_bus',10,18,false,false,true,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Transit shuttle bus; only for passengers through-checked to their final destination.'),
 ('SIN-T4T3','SIN','SIN-T4-TRANSIT','SIN-T3-TRANSIT','shuttle_bus',10,18,false,false,true,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Transit shuttle bus; only for passengers through-checked to their final destination.'),
 ('SIN-T3T4','SIN','SIN-T3-TRANSIT','SIN-T4-TRANSIT','shuttle_bus',10,18,false,false,true,'official','https://www.changiairport.com/en/at-changi/transport-and-directions/transferring-between-terminals-jewel.html','Transit shuttle bus; only for passengers through-checked to their final destination.'),
 -- Jewel is in the public area: transit passengers must clear arrival immigration to enter Singapore first.
 -- From the T2/T3 Departure Hall (Level 2) it is a 5–10 min walk via a link bridge (official). Jewel is directly
 -- connected to the T1 Arrival Hall; no walking time is published, so that leg is a planning estimate.
 ('SIN-T2JW','SIN','SIN-T2-TRANSIT','SIN-JEWEL','link_bridge_walk',5,10,true,false,false,'official','https://www.jewelchangiairport.com/en/getting-to-jewel.html','After arrival immigration: link bridge from the T2 Departure Hall (Level 2, near row 1). Time from immigration to the hall is not published.'),
 ('SIN-T3JW','SIN','SIN-T3-TRANSIT','SIN-JEWEL','link_bridge_walk',5,10,true,false,false,'official','https://www.jewelchangiairport.com/en/getting-to-jewel.html','After arrival immigration: link bridge from the T3 Departure Hall (Level 2, near row 11). Time from immigration to the hall is not published.'),
 ('SIN-T1JW','SIN','SIN-T1-TRANSIT','SIN-JEWEL','walk',5,10,true,false,false,'planning_estimate','https://www.jewelchangiairport.com/en/getting-to-jewel.html','After arrival immigration: Jewel is directly connected to the T1 Arrival Hall. No walking time is published.'),
 ('SIN-JWT2','SIN','SIN-JEWEL','SIN-T2-TRANSIT','link_bridge_walk',5,10,false,true,false,'official','https://www.jewelchangiairport.com/en/getting-to-jewel.html','Link bridge to the T2 Departure Hall, then check-in, departure immigration and security before the transit area.'),
 ('SIN-JWT3','SIN','SIN-JEWEL','SIN-T3-TRANSIT','link_bridge_walk',5,10,false,true,false,'official','https://www.jewelchangiairport.com/en/getting-to-jewel.html','Link bridge to the T3 Departure Hall, then check-in, departure immigration and security before the transit area.'),
 ('SIN-JWT1','SIN','SIN-JEWEL','SIN-T1-TRANSIT','walk',5,10,false,true,false,'planning_estimate','https://www.jewelchangiairport.com/en/getting-to-jewel.html','Walk to Terminal 1, then check-in, departure immigration and security. No walking time is published.')
on conflict (id) do update set from_location = excluded.from_location, to_location = excluded.to_location, mode = excluded.mode,
  min_minutes = excluded.min_minutes, max_minutes = excluded.max_minutes, requires_immigration = excluded.requires_immigration,
  requires_departure_checks = excluded.requires_departure_checks, requires_through_check = excluded.requires_through_check,
  verification = excluded.verification, source_url = excluded.source_url, note = excluded.note;

-- Where each Changi venue is (venue terminals as already recorded in the catalogue)
insert into public.activity_locations(activity_id, airport_id, location_id) values
 ('20000000-0000-4000-8000-000000000001','SIN','SIN-T3-TRANSIT'), -- LeMa Dumpling (T3 transit, L2)
 ('20000000-0000-4000-8000-000000000002','SIN','SIN-JEWEL'),      -- Jewel Rain Vortex
 ('20000000-0000-4000-8000-000000000003','SIN','SIN-T1-TRANSIT'), -- Free Snooze Lounges: transit areas T1–T4
 ('20000000-0000-4000-8000-000000000003','SIN','SIN-T2-TRANSIT'),
 ('20000000-0000-4000-8000-000000000003','SIN','SIN-T3-TRANSIT'),
 ('20000000-0000-4000-8000-000000000003','SIN','SIN-T4-TRANSIT'),
 ('20000000-0000-4000-8000-000000000004','SIN','SIN-T3-TRANSIT'), -- Butterfly Garden (T3 transit, L2–3)
 ('20000000-0000-4000-8000-000000000005','SIN','SIN-JEWEL'),      -- Canopy Park
 ('20000000-0000-4000-8000-000000000006','SIN','SIN-T1-TRANSIT'), -- Rooftop pool (T1 transit, L3)
 ('20000000-0000-4000-8000-000000000007','SIN','SIN-T2-TRANSIT'), -- Free Singapore Tour booths (T2 and T3 transit)
 ('20000000-0000-4000-8000-000000000007','SIN','SIN-T3-TRANSIT'),
 ('20000000-0000-4000-8000-000000000008','SIN','SIN-T3-TRANSIT')  -- Harry's (T3 transit, L2)
on conflict do nothing;

commit;
