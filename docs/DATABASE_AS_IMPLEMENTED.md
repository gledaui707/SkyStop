# Database tables as implemented (generated from the live Supabase project)

Source: `information_schema` / `pg_constraint` / `pg_policies` of project `sgwbtgwccskqamzttczz`, queried read-only on 2026-11-14. Regenerate rather than edit by hand. Migrations: `supabase/migrations/` (latest: `202611140001_flights_profiles.sql`, additive).

## `airports`
Airport identity, IANA time zone, and the official immigration guidance link for the country.

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `id` | text | no |  |
| 2 | `name` | text | no |  |
| 3 | `timezone` | text | no |  |
| 4 | `dataset_label` | text | no | `'Illustrative demo catalogue; not travel guidance'::text` |
| 5 | `entry_guidance_url` | text | yes |  |

| Kind | Constraint |
|---|---|
| Check | `CHECK ((id ~ '^[A-Z]{3}$'::text))` |
| Primary key | `PRIMARY KEY (id)` |

Row-level security policies: `catalogue_read` (SELECT to {anon,authenticated})

## `activities`
Venues at each airport (catalogue).

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `id` | uuid | no | `gen_random_uuid()` |
| 2 | `airport_id` | text | no |  |
| 3 | `name` | text | no |  |
| 4 | `description` | text | no |  |
| 5 | `category` | text | no |  |
| 6 | `terminal` | text | no | `'Unverified'::text` |
| 7 | `access_zone` | text | no |  |
| 8 | `duration_minutes` | integer | no |  |
| 9 | `budget_label` | text | no | `'Unknown'::text` |
| 10 | `is_demo` | boolean | no | `true` |
| 11 | `source_url` | text | yes |  |

| Kind | Constraint |
|---|---|
| Check | `CHECK (((duration_minutes >= 1) AND (duration_minutes <= 1440)))` |
| Check | `CHECK ((access_zone = ANY (ARRAY['airside'::text, 'landside'::text, 'unknown'::text])))` |
| Check | `CHECK ((category = ANY (ARRAY['food'::text, 'rest'::text, 'shopping'::text, 'culture'::text, 'work'::text])))` |
| Foreign key | `FOREIGN KEY (airport_id) REFERENCES airports(id)` |
| Primary key | `PRIMARY KEY (id)` |
| Unique | `UNIQUE (id, airport_id)` |

Row-level security policies: `catalogue_read` (SELECT to {anon,authenticated})

## `itinerary_templates`
Curated itineraries per airport.

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `id` | uuid | no | `gen_random_uuid()` |
| 2 | `airport_id` | text | no |  |
| 3 | `name` | text | no |  |
| 4 | `description` | text | no |  |

| Kind | Constraint |
|---|---|
| Foreign key | `FOREIGN KEY (airport_id) REFERENCES airports(id)` |
| Primary key | `PRIMARY KEY (id)` |
| Unique | `UNIQUE (id, airport_id)` |

Row-level security policies: `catalogue_read` (SELECT to {anon,authenticated})

## `template_items`
Ordered venues in a curated itinerary.

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `template_id` | uuid | no |  |
| 2 | `airport_id` | text | no |  |
| 3 | `activity_id` | uuid | no |  |
| 4 | `position` | integer | no |  |

| Kind | Constraint |
|---|---|
| Check | `CHECK ((("position" >= 1) AND ("position" <= 20)))` |
| Foreign key | `FOREIGN KEY (activity_id, airport_id) REFERENCES activities(id, airport_id)` |
| Foreign key | `FOREIGN KEY (template_id, airport_id) REFERENCES itinerary_templates(id, airport_id) ON DELETE CASCADE` |
| Primary key | `PRIMARY KEY (template_id, "position")` |
| Unique | `UNIQUE (template_id, activity_id)` |

Row-level security policies: `catalogue_read` (SELECT to {anon,authenticated})

## `layovers`
A saved FLIGHT journey (its connection: airport, local times, buffer), owned by the user (guest or account). Owners may delete their own (2026-11-14); items and details cascade.

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `id` | uuid | no |  |
| 2 | `owner_id` | uuid | no |  |
| 3 | `airport_id` | text | no |  |
| 4 | `arrival_at` | timestamp with time zone | no |  |
| 5 | `departure_at` | timestamp with time zone | no |  |
| 6 | `buffer_minutes` | integer | no |  |
| 7 | `revision` | integer | no | `1` |
| 8 | `created_at` | timestamp with time zone | no | `now()` |
| 9 | `updated_at` | timestamp with time zone | no | `now()` |

| Kind | Constraint |
|---|---|
| Check | `CHECK (((buffer_minutes >= 0) AND (buffer_minutes <= 1440)))` |
| Check | `CHECK (((departure_at > arrival_at) AND (departure_at <= (arrival_at + '48:00:00'::interval))))` |
| Check | `CHECK ((isfinite(arrival_at) AND isfinite(departure_at)))` |
| Check | `CHECK ((revision > 0))` |
| Foreign key | `FOREIGN KEY (airport_id) REFERENCES airports(id)` |
| Foreign key | `FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE` |
| Primary key | `PRIMARY KEY (id)` |
| Unique | `UNIQUE (id, airport_id)` |

Row-level security policies: `owner_delete` (DELETE to {authenticated}); `owner_read` (SELECT to {authenticated})

## `plan_items`
The flight's activity ITINERARY: ordered venues with a duration snapshot. A flight may have none.

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `layover_id` | uuid | no |  |
| 2 | `airport_id` | text | no |  |
| 3 | `activity_id` | uuid | no |  |
| 4 | `position` | integer | no |  |
| 5 | `duration_minutes` | integer | no |  |

| Kind | Constraint |
|---|---|
| Check | `CHECK ((("position" >= 1) AND ("position" <= 20)))` |
| Check | `CHECK (((duration_minutes >= 1) AND (duration_minutes <= 1440)))` |
| Foreign key | `FOREIGN KEY (activity_id, airport_id) REFERENCES activities(id, airport_id)` |
| Foreign key | `FOREIGN KEY (layover_id, airport_id) REFERENCES layovers(id, airport_id) ON DELETE CASCADE` |
| Primary key | `PRIMARY KEY (layover_id, "position")` |
| Unique | `UNIQUE (layover_id, activity_id)` |

Row-level security policies: `owner_read` (SELECT to {authenticated})

## `layover_details`
NEW (2026-11-14). Journey labels for a flight: name, origin, final destination, sample booking reference, arrival/departure terminal. Owner-only (read/write).

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `layover_id` | uuid | no |  |
| 2 | `owner_id` | uuid | no | `auth.uid()` |
| 3 | `name` | text | yes |  |
| 4 | `origin_airport` | text | yes |  |
| 5 | `destination_airport` | text | yes |  |
| 6 | `booking_ref` | text | yes |  |
| 7 | `arrival_location` | text | yes |  |
| 8 | `departure_location` | text | yes |  |
| 9 | `updated_at` | timestamp with time zone | no | `now()` |

| Kind | Constraint |
|---|---|
| Check | `CHECK (((arrival_location IS NULL) OR (char_length(arrival_location) <= 40)))` |
| Check | `CHECK (((booking_ref IS NULL) OR (booking_ref ~ '^[A-Z0-9]{6}$'::text)))` |
| Check | `CHECK (((departure_location IS NULL) OR (char_length(departure_location) <= 40)))` |
| Check | `CHECK (((destination_airport IS NULL) OR (destination_airport ~ '^[A-Z]{3}$'::text)))` |
| Check | `CHECK (((name IS NULL) OR (char_length(name) <= 80)))` |
| Check | `CHECK (((origin_airport IS NULL) OR (origin_airport ~ '^[A-Z]{3}$'::text)))` |
| Foreign key | `FOREIGN KEY (layover_id) REFERENCES layovers(id) ON DELETE CASCADE` |
| Primary key | `PRIMARY KEY (layover_id)` |

Row-level security policies: `owner_all` (ALL to {authenticated})

## `traveler_profiles`
NEW (2026-11-14). Optional passport nationality and country of residence. Owner-only. No passport numbers, scans or dates of birth.

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `owner_id` | uuid | no | `auth.uid()` |
| 2 | `nationality` | text | yes |  |
| 3 | `residence` | text | yes |  |
| 4 | `updated_at` | timestamp with time zone | no | `now()` |

| Kind | Constraint |
|---|---|
| Check | `CHECK (((nationality IS NULL) OR ((char_length(nationality) >= 1) AND (char_length(nationality) <= 60))))` |
| Check | `CHECK (((residence IS NULL) OR ((char_length(residence) >= 1) AND (char_length(residence) <= 60))))` |
| Primary key | `PRIMARY KEY (owner_id)` |

Row-level security policies: `owner_all` (ALL to {authenticated})

## `airport_locations`
(2026-11-13) Places a traveller moves between: transit areas, public areas such as Jewel.

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `id` | text | no |  |
| 2 | `airport_id` | text | no |  |
| 3 | `name` | text | no |  |
| 4 | `kind` | text | no |  |
| 5 | `zone` | text | no |  |
| 6 | `terminal` | text | yes |  |
| 7 | `source_url` | text | yes |  |

| Kind | Constraint |
|---|---|
| Check | `CHECK ((id ~ '^[A-Z]{3}-[A-Z0-9-]+$'::text))` |
| Check | `CHECK ((kind = ANY (ARRAY['transit_area'::text, 'public_area'::text, 'terminal'::text, 'concourse'::text, 'checkpoint'::text, 'transport'::text])))` |
| Check | `CHECK ((zone = ANY (ARRAY['airside'::text, 'landside'::text, 'unknown'::text])))` |
| Foreign key | `FOREIGN KEY (airport_id) REFERENCES airports(id)` |
| Primary key | `PRIMARY KEY (id)` |
| Unique | `UNIQUE (id, airport_id)` |

Row-level security policies: `catalogue_read` (SELECT to {anon,authenticated})

## `airport_transfers`
(2026-11-13) Directed connections between locations with minute range, checkpoints, verification and source.

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `id` | text | no |  |
| 2 | `airport_id` | text | no |  |
| 3 | `from_location` | text | no |  |
| 4 | `to_location` | text | no |  |
| 5 | `mode` | text | no |  |
| 6 | `min_minutes` | integer | no |  |
| 7 | `max_minutes` | integer | no |  |
| 8 | `requires_immigration` | boolean | no | `false` |
| 9 | `requires_departure_checks` | boolean | no | `false` |
| 10 | `requires_through_check` | boolean | no | `false` |
| 11 | `verification` | text | no |  |
| 12 | `source_url` | text | yes |  |
| 13 | `note` | text | no | `''::text` |

| Kind | Constraint |
|---|---|
| Check | `CHECK (((max_minutes >= 0) AND (max_minutes <= 600)))` |
| Check | `CHECK (((min_minutes >= 0) AND (min_minutes <= 600)))` |
| Check | `CHECK ((from_location <> to_location))` |
| Check | `CHECK ((max_minutes >= min_minutes))` |
| Check | `CHECK ((mode = ANY (ARRAY['walk'::text, 'skytrain_or_walk'::text, 'shuttle_bus'::text, 'link_bridge_walk'::text])))` |
| Check | `CHECK ((verification = ANY (ARRAY['official'::text, 'planning_estimate'::text])))` |
| Foreign key | `FOREIGN KEY (from_location, airport_id) REFERENCES airport_locations(id, airport_id)` |
| Foreign key | `FOREIGN KEY (to_location, airport_id) REFERENCES airport_locations(id, airport_id)` |
| Primary key | `PRIMARY KEY (id)` |

Row-level security policies: `catalogue_read` (SELECT to {anon,authenticated})

## `activity_locations`
(2026-11-13) Which location(s) each venue is in.

| # | Column | Type | Null? | Default |
|---|---|---|---|---|
| 1 | `activity_id` | uuid | no |  |
| 2 | `airport_id` | text | no |  |
| 3 | `location_id` | text | no |  |

| Kind | Constraint |
|---|---|
| Foreign key | `FOREIGN KEY (activity_id, airport_id) REFERENCES activities(id, airport_id)` |
| Foreign key | `FOREIGN KEY (location_id, airport_id) REFERENCES airport_locations(id, airport_id)` |
| Primary key | `PRIMARY KEY (activity_id, location_id)` |

Row-level security policies: `catalogue_read` (SELECT to {anon,authenticated})

## Notes
- Flights vs itineraries: one `layovers` row is one saved flight; its `plan_items` are the itinerary (possibly empty). My Flights lists all flights; My Plans lists flights that have an itinerary. No separate flight table, so nothing is duplicated.
- Catalogue tables are read-only to clients. Saved flights are written only through `save_plan` (plus owner-only details and delete).
- Nationality is optional and owner-only; it never decides entry eligibility. No other personal data is stored (account email lives in Supabase Auth).
