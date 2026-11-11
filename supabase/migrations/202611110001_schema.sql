begin;
create table public.airports (
 id text primary key check (id ~ '^[A-Z]{3}$'),
 name text not null, timezone text not null,
 dataset_label text not null default 'Illustrative demo catalogue; not travel guidance'
);
create table public.activities (
 id uuid primary key default gen_random_uuid(),
 airport_id text not null references public.airports(id),
 name text not null, description text not null,
 category text not null check (category in ('food','rest','shopping','culture','work')),
 terminal text not null default 'Unverified',
 access_zone text not null check (access_zone in ('airside','landside','unknown')),
 duration_minutes integer not null check (duration_minutes between 1 and 1440),
 budget_label text not null default 'Unknown',
 is_demo boolean not null default true,
 unique(id, airport_id)
);
create table public.itinerary_templates (
 id uuid primary key default gen_random_uuid(),
 airport_id text not null references public.airports(id),
 name text not null, description text not null,
 unique(id, airport_id)
);
create table public.template_items (
 template_id uuid not null,
 airport_id text not null,
 activity_id uuid not null,
 position integer not null check (position between 1 and 20),
 primary key(template_id, position),
 unique(template_id, activity_id),
 foreign key(template_id, airport_id) references public.itinerary_templates(id, airport_id) on delete cascade,
 foreign key(activity_id, airport_id) references public.activities(id, airport_id)
);
create table public.layovers (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 airport_id text not null references public.airports(id),
 arrival_at timestamptz not null,
 departure_at timestamptz not null,
 buffer_minutes integer not null check (buffer_minutes between 0 and 1440),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (isfinite(arrival_at) and isfinite(departure_at)),
 check (departure_at > arrival_at and departure_at <= arrival_at + interval '48 hours'),
 unique(id, airport_id)
);
create index layovers_owner_updated on public.layovers(owner_id, updated_at desc);
create table public.plan_items (
 layover_id uuid not null,
 airport_id text not null,
 activity_id uuid not null,
 position integer not null check (position between 1 and 20),
 duration_minutes integer not null check (duration_minutes between 1 and 1440),
 primary key(layover_id, position),
 unique(layover_id, activity_id),
 foreign key(layover_id, airport_id) references public.layovers(id, airport_id) on delete cascade,
 foreign key(activity_id, airport_id) references public.activities(id, airport_id)
);
create index activities_airport on public.activities(airport_id);
create index templates_airport on public.itinerary_templates(airport_id);
commit;
