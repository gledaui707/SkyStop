# Progress report / handoff (updated 2026-11-12, after the mobile UX, onboarding, booking-reference and catalogue work)
Read this first in a new session. Rules: AGENTS.md (work on `main`; no feature branches; **do not rerun hosted stress/ownership tests or change the Supabase schema without the owner's explicit approval**; never commit tokens).

## State in one paragraph
SkyStop (Figma Make React frontend wired to Supabase) is **deployed at https://skystop.vercel.app** and the full journey (add flight → explore → build → save → refresh → retrieve → edit) was verified end to end against the live database with real screenshots. Remaining work is mostly the **student's** (A1 story mapping, A1 mockup comparison, real-phone check, PDF review/upload, demo booking and rehearsals).

## Facts a new session needs
- **Supabase (current):** project ref `sgwbtgwccskqamzttczz` (eu-west-1). URL and publishable key are public constants in `src/api/client.ts` (Vercel env vars are deliberately ignored). Schema = migrations 001 + 002 (conflicts raise `PT409`) + seed.sql; anonymous sign-ins enabled; RLS on all six tables. Old project `rdrkskrzdyqezzopnena` is abandoned/removed — do not use.
- **Vercel:** project `skystop`, production domain `skystop.vercel.app` (connected to Production). Vercel's *production branch* is still `claude/tender-keller-cxp9ac` and could not be changed through Vercel's API. **After every push to `main`, fast-forward it:** `git push origin main:claude/tender-keller-cxp9ac`. Permanent fix (student, 20 s): Vercel → Settings → Environments → Production → Branch Tracking → `main`. (An automated GitHub workflow for this was blocked by the permission system and not added.)
- **Tokens:** Supabase management token and Vercel token were provided through the secure credential form and are stored on the cloud environment, not in git. The owner asked not to be asked for tokens again. Recommend the owner revoke them (supabase.com/dashboard/account/tokens, vercel.com/account/tokens).
- **Frontend baseline:** `figma-export/` = untouched Figma Make export; `diff -r figma-export/src src` shows integration changes. See docs/FRONTEND_INTEGRATION.md.
- **Known issue, accepted for the demo:** conflict-path `save_plan` (`PT409`) was verified only in the local DB harness, never over the hosted API. Old `40001` hung the hosted API. Do not trigger conflicts in the demo; Save is disabled while saving.

## Commands
`npm test -- --run` (84) · `npm run build` · `npm run test:e2e` (simulated API, 64 checks) · `npm run test:layout` (responsive audit) · `npm run test:live` (REAL site + DB, creates a guest/plan; run sparingly) · `npm run test:hosted` (real DB data-layer journey; manual only) · `npm test --prefix tests/database` (15) · `./scripts/build-submission-pdf.sh` (needs `pip install markdown`; rebuilds the draft PDF).
The sandbox needs hosts allowed (api.supabase.com, sgwbtgwccskqamzttczz.supabase.co, skystop.vercel.app, api.vercel.com, images.unsplash.com); Node `fetch` needs `NODE_USE_ENV_PROXY=1`; Chromium needs `proxy: { server: process.env.HTTPS_PROXY }`.

## Deadline
Updated: **23 November 2026, 08:00 (Portugal time).**

## Latest change: flight-centred Home, My flights, optional accounts, Profile (2026-11-14, deployed)
- Home: Wallet-style flight stack (nearest upcoming in front, up to three peeking behind, tap to bring forward), *Add flight* and *Compare flights* as separate entries, Profile icon (replaces the info button; replay moved to Profile).
- My flights (new screen), My Plans now = flights with an itinerary; flights can be removed (with their itinerary, after confirmation); a flight can be saved without activities; sample journeys are not saved twice.
- Manual entry has optional origin and final destination again.
- Additive migration `202611140001_flights_profiles.sql`: `layover_details`, `traveler_profiles` (both owner-only), owner delete policy on `layovers`. Hosted plans untouched (7/9 before and after). Auth site URL/redirects set to production.
- Accounts: guest upgrade (same user id) and sign-in by email link, sign-out. Real email delivery not verified (built-in SMTP limits). Details: docs/FLIGHTS_ACCOUNTS_PROFILE.md.
- Tests: unit 118 (+1 skipped) · DB 17 (new: owner-only details/profiles, cross-guest denial, delete cascade) · browser 106 · layout 0 issues incl. Home stack, My flights, Profile.

## Latest change: constraint-aware planning, Changi pilot (2026-11-13, deployed)
- **Transfer graph** (additive migration `202611130001_transfer_graph.sql`): `airport_locations`, `airport_transfers`, `activity_locations`, `airports.entry_guidance_url`. Changi: 5 locations, 18 directed transfers from official Changi/Jewel pages (two legs marked planning estimates), 12 venue-location links. Applied to the hosted DB; saved plans untouched (6 plans / 8 items before and after). Details, sources and the time model: docs/CONSTRAINT_AWARE_PLANNING.md.
- **Engine** `src/domain/itinerary.ts` (pure, 11 unit tests): ordered stops, arrival → first activity, between activities, return to the departure terminal; counts the upper end of ranges; separate time state (fits / tight / exceeds / cannot verify) and access state (stays airside / entry verification required / access unknown); never invents a route.
- **Builder** (`src/screens/Builder.tsx`, `components/BudgetHero.tsx`): arrival/departure terminal pickers, transfer rows between stops with source and verification label, airside/landside tags, immigration and re-entry chips, contextual warnings, and an entry-check panel for landside activities (nationality optional, not stored; link to ICA/GOV.UK/Portuguese visa portal/UAE portal; continue provisionally or remove). Plan detail and My Plans use the same numbers.
- **Map:** venue pins at inferred positions removed (the new rule forbids inferring indoor coordinates); terminal pins at published positions remain.
- **Tests:** unit 118 (+1 skipped) · DB 16 · browser 82 incl. scenarios A–F · layout audit 0 issues at 320/375/390/430 incl. the Changi builder with the entry panel.

## Latest change: mobile UX, onboarding, booking reference, four-airport catalogue (commits `765671c`…, deployed)
- **Phase 1 – iPhone layout:** light "Daylight & dusk" design system (docs/DESIGN_SYSTEM.md); date/time inputs, header, bottom nav, safe areas and horizontal overflow fixed structurally (no `overflow-x: hidden`). `npm run test:layout` audits 13 screens at 320/375/390/430 px: **0 issues**. Desktop browsers get the app inside an interactive iPhone frame (`src/DeviceFrame.tsx`; `?frame=off` disables); phones get it full screen.
- **Phase 2 – onboarding:** three screens (`src/screens/Welcome.tsx`), skip, dots, swipe, keys, Back/Next, reduced motion, first visit only (`skystop.onboarded.v2`), replay from the ⓘ button on Home. Skip and the final CTA open Find your journey.
- **Phase 3 – booking reference first:** `src/screens/Journey.tsx` + `src/data/journeys.ts`. Sample refs AXR7KD (CGK–SIN–CDG), BQ3LMV (OPO–LIS–JFK), CJ8NWT (JFK–LHR–SIN), DH5PRZ (CDG–DXB–HND), local times per airport zone; unknown refs show an error; disclosure that no airline system is connected. Manual entry converges on the same builder and save.
- **Phase 4 – catalogue:** SIN, LIS, LHR, DXB; 29 real venues from the official airport sites with source URLs, 5 curated itineraries. Applied with the additive, idempotent migration `supabase/migrations/202611120001_catalogue_four_airports.sql` (adds nullable `activities.source_url`; converts the 8 demo rows in place, same ids, so the 5 existing saved plans still resolve; nothing deleted; RLS unchanged). Sources and rules: docs/CATALOGUE_SOURCES.md.
- **Tests now:** unit 84 (+1 skipped) · DB regression 15 · simulated browser journey 64 · layout audit 0 issues · live read-only check of production (onboarding → CJ8NWT → Explore London → venue sheet with source).
- **Limitations:** venue/airport photos are licensed Unsplash images used as *illustrative* pictures (labelled in the app); the requested Jewel/Heathrow photos could not be licence-checked (Unsplash blocked automated access). No WebKit/real-iPhone run in this environment, so iOS-specific date-picker rendering is unverified. `tests/e2e/live.mjs` (writes to production) was updated but not run.

## Done (evidence in docs/VALIDATION.md)
Domain logic + tests; data layer; Figma integration; fresh Supabase setup and verification; live journey; map overlap fixes (UI_REVIEW.md); DATABASE_AS_IMPLEMENTED.md (generated from live DB); DEMO_SCRIPT.md; SUBMISSION_PDF_CONTENT.md and the draft PDF (docs/submission/); UI review record.

## Open / next (priority order)
1. **Student:** real-phone run of docs/DEMO_SCRIPT.md (updated for the new UI); retake screenshots and regenerate the PDF; switch Vercel production branch to `main`; revoke tokens.
2. **Student:** map US1–US6 to Assignment 1 story IDs; compare the app with the A1 mockups (UI_REVIEW.md); review and complete the ✏️ items in docs/SUBMISSION_PDF_CONTENT.md; regenerate the PDF; upload to Moodle by Nov 15 23:59 (Europe/Lisbon); book the demo slot; rehearse twice.
3. Optional improvements (not started, none required): landside marker label clipped by the bottom sheet on short phones (UI_REVIEW #4); desktop layout check; keyboard/accessibility audit; hand-written DB types → generate with the Supabase CLI; real two-user isolation test beyond the single data-layer run (needs the owner's approval).
4. Do not: add features, change the schema, run stress/conflict tests, or create branches.

## Repo map for the submission
docs/SUBMISSION_PDF_CONTENT.md (PDF source) · docs/submission/SkyStop-Assignment2-DRAFT.pdf · docs/screenshots/ (11 real screenshots) · docs/DATABASE_AS_IMPLEMENTED.md · docs/DEMO_SCRIPT.md · docs/UI_REVIEW.md · docs/VALIDATION.md · docs/REQUIREMENTS.md (A1–A8 status).
