-- SkyStop: saved-flight details, removing a flight, optional traveller profile. Additive; nothing existing is altered
-- or removed, and RLS stays owner-only.
--  * layover_details   journey labels that were browser-only until now (origin, destination, sample booking reference,
--                      plan name, arrival/departure terminal), so a signed-in account sees them on any device.
--                      One row per saved flight (layovers row), written by its owner.
--  * layovers delete   an owner may remove their own flight; its itinerary items and details go with it (cascade).
--  * traveler_profiles optional passport nationality / country of residence. No passport numbers, scans or dates.
--                      Used only to personalise entry guidance; never an eligibility decision.
begin;

create table if not exists public.layover_details (
  layover_id uuid primary key references public.layovers(id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  name text check (name is null or char_length(name) <= 80),
  origin_airport text check (origin_airport is null or origin_airport ~ '^[A-Z]{3}$'),
  destination_airport text check (destination_airport is null or destination_airport ~ '^[A-Z]{3}$'),
  booking_ref text check (booking_ref is null or booking_ref ~ '^[A-Z0-9]{6}$'),
  arrival_location text check (arrival_location is null or char_length(arrival_location) <= 40),
  departure_location text check (departure_location is null or char_length(departure_location) <= 40),
  updated_at timestamptz not null default now()
);

create table if not exists public.traveler_profiles (
  owner_id uuid primary key default auth.uid(),
  nationality text check (nationality is null or char_length(nationality) between 1 and 60),
  residence text check (residence is null or char_length(residence) between 1 and 60),
  updated_at timestamptz not null default now()
);

alter table public.layover_details enable row level security;
alter table public.traveler_profiles enable row level security;
revoke all on public.layover_details, public.traveler_profiles from anon, authenticated;
grant select, insert, update, delete on public.layover_details, public.traveler_profiles to authenticated;
grant delete on public.layovers to authenticated;

drop policy if exists owner_all on public.layover_details;
create policy owner_all on public.layover_details for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid())
    and exists (select 1 from public.layovers l where l.id = layover_id and l.owner_id = (select auth.uid())));

drop policy if exists owner_all on public.traveler_profiles;
create policy owner_all on public.traveler_profiles for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists owner_delete on public.layovers;
create policy owner_delete on public.layovers for delete to authenticated using (owner_id = (select auth.uid()));

commit;
