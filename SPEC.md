# SkyStop MVP specification
Status (22 Nov 2026): **implemented and deployed** at https://skystop.vercel.app (React + Vite, Supabase PostgreSQL,
Vercel). This file states what the MVP must do and how it is checked. Evidence of what was actually run lives in
docs/VALIDATION.md. The product was first planned under the working name "Layverse"; it ships as SkyStop.

**Provenance.** The stories below are adapted from the SkyStop Assignment 1 concept (booking-based layover planning)
as revised during this project. They carry provisional IDs (US1–US8); the formal Assignment 1 story IDs were not
supplied, so the student must map them before submission (docs/REQUIREMENTS.md). No earlier decisions are invented here.

## Stories and acceptance criteria
| Story | Acceptance criteria | Where it is tested |
|---|---|---|
| US1 Look up my booking | In the onboarding conversation (or later via Add flight), enter a six-character booking reference; a supported sample reference (AXR7KD, BQ3LMV, CJ8NWT, DH5PRZ) shows the journey: origin, connecting airport, destination, each leg's airport-local times and dates. An unknown or malformed reference shows a short inline message; samples and manual entry stay available. No airline system is contacted and none is claimed. | `src/data/journeys.test.ts`; e2e "booking:" checks; production walkthrough |
| US2 Identify my layover and its usable time | The connecting airport, connection length, planning buffer and time to explore (connection − buffer) are shown in the airport's local time, correct across midnight and DST. The same numbers appear on the journey, Home card, layover details and builder. | `src/data/time.test.ts`, `src/domain/domain.test.ts`; e2e "Home card", "layover" checks |
| US3 Keep my flight | Save the flight to My flights (database). It is still there after a refresh; importing the same booking again opens it instead of duplicating it. | e2e "flights:"; production walkthrough (DB rows) |
| US4 Discover what I can do | Airport activities from PostgreSQL in a list and on a map, filtered by category and search (shared by list and map); details show duration, terminal, access (airside/landside/unverified), price wording and source. Curated itineraries. | e2e "discovery", "Explore" checks |
| US5 Build and edit an itinerary | Add/remove activities (one airport), reorder them, choose arrival/departure terminals; the time budget updates at once: usable − activities − counted transfers = remaining; over-budget and "cannot verify" states are shown, never hidden. | `src/domain/itinerary.test.ts`; e2e "A:"–"E:" builder checks |
| US6 Save, reopen, edit | One atomic `save_plan` RPC; success only after the server confirms. My Plans lists the plan after a refresh; editing and saving increments the revision; another guest cannot read or change it. | DB regression suite; e2e save/refresh/edit; production RLS check |
| US7 See how to get there | Map in three modes: Explore (venue markers), the itinerary's route (numbered stops, legs and times) and directions for one leg (origin, destination, time, steps). Transfer minutes come from Changi's published data where it exists; lines, spots and steps are illustrative and labelled once. | `src/features/wayfinding/*.test.ts`; e2e "Explore/Plan/Directions" checks |
| US8 Use it as a guest | No account needed: an anonymous Supabase session is created on first use and owns the guest's data in this browser. Optional account creation keeps the same data. Loss of the guest session on cleared storage is stated in Profile. | e2e "access", "account" checks |

Optional, not part of the core MVP: simulated flight updates (Settings → Demo controls; docs/FLIGHT_UPDATES.md).

## Screens and navigation (as built)
In-app screen stack mirrored in browser history (Back/Forward work); no URL routes. First run: splash → three intro
slides (optional; Get started or Skip opens the conversation) → booking-first conversation ("Already have a flight
booked?" → booking reference → animated lookup → journey and layover → activity interests) → guest session → Home with
the saved flight ("Not yet" → Home without a flight). Afterwards: Home (My flights, Add flight, Compare flights, Things
to do) → Find your journey (booking reference) → Journey →
Airport (List / Map: Explore) → Itinerary builder → Route map (Plan) → Directions → My Plans → Plan details; Profile
(account, travel documents, Settings: Replay introduction, Demo controls, About & data). Tab bar: Home, Airports, My Plans.

## Deterministic time contract
Both entered timestamps are local to the connecting airport, independent of browser time zone. Use a maintained IANA-aware library (Temporal polyfill preferred), converting local date/time plus airport.timezone to UTC instants. Reject nonexistent or ambiguous DST local times (`disambiguation: 'reject'`) with an actionable choose-another-time message; never silently shift them. Persist ISO instants with offset/Z as timestamptz, display via airport zone. Require whole-minute inputs. Compare new arrival with current clock; historical saved plans stay readable/editable and get a past-plan notice.

`totalMinutes = (departureInstant - arrivalInstant) / 60000`
`usableMinutes = max(0, totalMinutes - bufferMinutes)`
`activityMinutes = sum(selected duration snapshots)`
`remainingMinutes = usableMinutes - activityMinutes - countedTransferMinutes`
`overBudget = remainingMinutes < 0`

Buffer choices 90 / 120 / 180 minutes (default 120; sample bookings set their own). It is a planning estimate for leaving the aircraft, transfer screening, the walk to the gate and boarding — not an airport minimum connection rule. Moving between terminals or venues is counted separately as transfers, using Changi's published transfer minutes (upper end) where the airport's data routes the move; unrouted moves add no minutes and make the result "cannot verify". Immigration/security queues are never timed. If buffer >= total, usable time is 0. Fit means time estimate only, never access/visa eligibility. Saved item durations are database snapshots.

## State and error contract
Every database view: loading, populated, empty, error+retry. Save: idle/dirty/saving/saved/error/conflict. Disable duplicate saves. On failure retain draft and don't show success. On ambiguous network timeout, fetch the same client-generated UUID before deciding whether retry is safe; if server differs, offer reload/review without overwriting. New save expected revision 0; edit uses loaded revision. On conflict preserve draft, ask user to reload server copy, then explicitly reapply changes. Never auto-retry stale writes. Missing/other-owner plan uses the same unavailable message.

## Persistence and privacy
Supabase anonymous auth creates a real user UUID; publishable key alone is not ownership. Retain the Supabase session in browser storage; flights and plans stay in PostgreSQL (`layovers`, `plan_items`, `layover_details`). Guest plans are recoverable only in that browser/session unless the guest creates an account; clearing storage/signing out loses access, and Profile says so. No passport numbers, identity documents or payment details (optional nationality/residence only). Browser storage holds only conveniences (onboarding seen, interests, simulated flight updates) — never the saved plans.

## Completion gate
All A1–A8 evidence in docs/REQUIREMENTS.md, passing meaningful tests, no release-blocking bugs, live production save/reload/edit, mobile review, actual submission PDF and five-minute rehearsal.
