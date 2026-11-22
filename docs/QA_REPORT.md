# Assignment 2 QA and live-demo readiness audit
Date: 22 Nov 2026. Audited: `main` at 06a6fe6 (deployed to https://skystop.vercel.app, Vercel production READY),
then fixes in the following commit. Method: a fresh Chromium session driving the **live production site** (real
Supabase project `sgwbtgwccskqamzttczz`) at 390×844, 375×667 and 320×568, plus every automated suite in the repo.
Evidence: `docs/screenshots/qa-2026-11-22/` (390 px screens, 320/375 montages). The walkthrough script is not in the
repo (it created three anonymous guests with one flight/plan each on production, as any visitor would).

## A. Overall readiness
**Ready for live demo**, with minor issues (none blocks the five-minute flow).

## B. Verified demo flow (production)
| Step | Result | Observed |
|---|---|---|
| 1 First visit: splash, intro slides, guest entry | Pass | Splash → 3 slides → Get started → Home "Where's your next stop?" as an anonymous guest (`is_anonymous: true`), no login/registration |
| 1 Conversational onboarding (Yes, I'm booked, interests) | **Not present** | Removed at the owner's request on 22 Nov (commit ea6884e). Booking import is Home → **Add flight** |
| 1 Booking lookup | Pass | ZZZ999 → "Booking number not found." + samples; AXR7KD → CGK 08:20 → SIN 11:15 / SIN 23:35 → CDG 06:20 (+1), 12h 20m − 2h = 10h 20m. (The lookup is immediate; no animated lookup on this path) |
| 2 Saved flight on Home | Pass | Card: Jakarta → Paris via SIN, Arrive 11:15, Connection 12h 20m, Depart 23:35, 12h 20m − 2h buffer, 10h 20m to explore, Gate B12 |
| 2 Refresh / repeat import | Pass | Still on Home after refresh; same reference again offers "Open in My flights"; DB still 1 row |
| 3 Layover details → Explore activities | Pass | Changi, 11:15 / 23:35, 10h 20m remaining, "No activities planned yet" → Changi discovery |
| 4 Discovery | Pass | Food filter → Harry's, LeMa only; search "garden" → Butterfly Garden only; add/remove; details (1h, Terminal 1, Airside, Paid entry). Interest ordering not testable (no interests asked any more) |
| 5 Explore map | Pass | Terminal pins with counts, "2 selected", no route; venue preview with Add/Details/How to get there; added on map = selected in list (3) |
| 5 Plan map | Pass | Stops 1 Butterfly Garden, 2 Harry's, 3 Rooftop pool; start/end markers; 4 route lines; no venue markers; budget = builder (10h 20m / 40m / 7h 30m left) |
| 5 Directions | Pass | Arrival T1 → Butterfly Garden T3, 5–10 min, 1.1 km, Skytrain, steps, one line; Back to route; browser Back → itinerary |
| 6 Build itinerary | Pass | Activities 2h 10m (30+40+60), transfers 40m, 7h 30m left; reorder changes order; 8 stops (incl. landside) → "Cannot verify feasibility"; removing them restores 7h 30m |
| 7 Save, My Plans, refresh, edit | Pass | DB: 1 plan, 3 plan_items (30, 40, 60) in order, revision 2; My Plans "3 activities · 7h 30m left"; after refresh same 3 stops; remove Harry's + save → 2 items, revision 3 |
| 8 Flight-update simulation (optional) | Pass | Earlier departure 23:35 → 22:50: "45m less to explore; your plan still fits" (no false conflict); Home notice labelled "Simulated update"; DB booking unchanged; Reset restores |
| Console / network | Pass | No page or console errors; no failed API requests (one Wikimedia photo intermittently blocked at 320 px; falls back) |

## C. Database verification
Confirmed against the live database through each browser's own guest session (row-level security applied), not React state:
- `layovers` row created on Save to My flights (SIN, UTC instants, buffer 120, owner = guest), with `layover_details` (booking_ref AXR7KD, origin, destination). Readable after refresh. Re-import created no second row.
- `plan_items` stored per plan with `position` order and duration snapshots; edits replace them and increment `revision` (2 → 3).
- Isolation: no session → 401 "permission denied for table layovers"; a second guest → 0 rows for the plan and its items, and its `save_plan` call on that plan → 403 PLAN_UNAVAILABLE (nothing changed).
- Schema (tables, PKs, FKs) from `supabase/migrations/` and docs/DATABASE_AS_IMPLEMENTED.md: airports, activities, itinerary_templates, template_items, layovers (FK owner → auth.users, airport → airports), plan_items (PK layover_id+position; composite FKs to layovers and activities by airport), layover_details (PK/FK layover_id), traveler_profiles, transfer graph tables.
Not checked: direct SQL inspection of the live schema (the Supabase management token available here is invalid; PostgREST does not publish the schema to the publishable key). Hosted ownership stress tests not rerun (owner approval required, AGENTS.md).

## D. Automated testing (all run on 22 Nov 2026)
| Command | Result |
|---|---|
| `npm run typecheck` | pass (0 errors) |
| `npx vitest run` | 175 passed, 1 skipped (hosted test, needs owner approval), 0 failed |
| `npm run build` | pass |
| `npm test --prefix tests/database` | 17/17 SQL/RLS checks |
| `npm run test:e2e` (reduced motion, default) | 191/191 |
| `MOTION=no-preference npm run test:e2e` | 191/191 after fixes (before: 126/134 + a Leaflet runtime error; see F) |
| `npm run test:layout` | 0 issues at 320/375/390/430 |
| Lint | **not configured** (no ESLint config in the repo) |

## E. Assignment 2 documentation
Present: SPEC.md (rewritten in this audit to match the app), AGENTS.md, CLAUDE.md → CLAUDE_HANDOFF.md, docs/ARCHITECTURE.md
(folder map updated), docs/DATABASE.md + DATABASE_AS_IMPLEMENTED.md, six migrations, docs/TEST_PLAN.md, docs/VALIDATION.md
(dated log of every run), docs/UI_REVIEW.md, docs/REQUIREMENTS.md, docs/DEMO_SCRIPT.md (rewritten from this audit),
draft submission PDF in docs/submission/.
Missing / owner's to do: mapping of US1–US8 to the formal Assignment 1 story IDs; student comparison with A1 mockups;
lint configuration; final PDF review/upload; demo booking and rehearsals.

## F. Issues and fixes
**P0:** none found.
**P1 (fixed):**
- Leaflet threw `Cannot read properties of undefined (reading '_leaflet_pos')` when a map screen was left during a camera animation (seen with animations on). Root cause: Leaflet ends a zoom from a 250 ms timer it does not clear on remove. Fix: stop the camera and clear the zoom flag before removing the map — `src/components/AirportMap.tsx`.
- SPEC.md described an unimplemented "Layverse" app without booking lookup or route guidance; README said "Not deployed"; ARCHITECTURE listed proposed folders only. Updated to the app as built — `SPEC.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/REQUIREMENTS.md`, `docs/DEMO_SCRIPT.md`.
**P2:**
- Unhandled "Transition was skipped" promise when two screen transitions overlap (console noise only). Fixed — `src/store.tsx`.
- Browser test helpers read screens before animated transitions finished (test-only). Waits added — `tests/e2e/journey.mjs`.
- The onboarding conversation (booking question, interests) is gone by request, so interest-based ordering cannot be demonstrated. Not changed.
- One Wikimedia venue photo intermittently blocked by the browser (rate limiting); placeholder shown.
- At 320 px the builder's save bar truncates "unsaved changes".
- At 320×568 the Directions map has little room; the start marker can sit under the destination label.

## G. Five-minute demo script
docs/DEMO_SCRIPT.md (every step and number observed on the live site).

## H. Evidence
`docs/screenshots/qa-2026-11-22/` and a 74-second recording of the production walkthrough (shared with the owner, not committed).
