# Validation record
Date: 2026-11-11. Scope: architecture handoff and SQL foundations, not completed application.

## Executed
`npm install --prefix tests/database`: pinned PGlite 0.3.14 installed; lockfile generated; package audit reported zero vulnerabilities at execution time.

`npm test --prefix tests/database`: PASS, 15 checks in an isolated in-memory PostgreSQL engine:
1. Both migrations execute in order.
2. Seed rerun is safe; 2 airports, 8 activities, 2 templates, 4 items.
3. Public catalogue reads allowed; no-session plan access/write denied.
4. Guest A saves and reads ordered duration snapshots.
5. Direct client table writes and catalogue changes denied.
6. Duplicate create UUID conflicts; no duplicate plan.
7. Guest B cannot read/edit/take over A's plan.
8. Guest B can create own plan.
9. Foreign-airport, duplicate and null activity IDs rejected with prior data retained.
10. Reversed dates/negative buffer rejected with revision unchanged.
11. Edit replaces children, increments revision; stale edit rejected.
12. Empty plan accepted.
13. Missing identity denied privileged save.
14. Composite FK prevents cross-airport child insert even as administrator.
15. Injected child-insert failure rolls back RPC revision change.

The harness creates minimal auth.users/auth.uid test fixtures and simulates roles. It is useful SQL/RLS regression evidence, not a full Supabase environment. It does not prove JWT/Auth/PostgREST/CAPTCHA/deployment correctness. No remote Supabase mutations performed.

## Still unverified / not implemented
Frontend import, domain unit tests U1–U9, real Auth/JWT integration, browser E1–E5, manual screens, AI visual review, student A1 comparison, production deployment, final screenshots/PDF and Moodle submission. Keep these unchecked until actual evidence exists.

## Implementation evidence log
Append: date | commit | environment | command/scenario | expected | actual | result | evidence | limitations. A failing release-blocking check prevents release until fixed and rerun.

## 2026-11-12 — Step 2 domain logic and Step 1 hosted status
**Correction to earlier docs:** the owner reports the hosted Supabase project (ref `rdrkskrzdyqezzopnena`) already has all six tables and the seed (2 airports, 8 activities, 2 templates, 4 template items); `layovers`/`plan_items` empty. This is the owner's statement, not yet verified by me.

**Step 2 (done, verified):** `npm test -- --run` → 35 tests passed; `npm run typecheck` clean. Covers U1–U9, overnight, DST gap/overlap rejection (Europe/Lisbon 2027-03-28 and 2027-10-31), process-TZ independence (Lisbon/New York/Auckland), exactly-48h boundary, zero-usable time, exact-fit budget, 20-item cap, duplicate/cross-airport ignore. Code: `src/domain/`. Temporal polyfill `temporal-polyfill`. Root `package.json` is a placeholder to merge into the Figma Make export's package.

**Step 1 (NOT verified):** network to the Supabase host was allowed; the publishable key saved via the credential form is rejected by the API ("Invalid API key"), so no schema, anonymous Auth, RLS or two-session checks have run. Pending: a valid publishable (anon) key. Nothing was applied to the remote database.

## 2026-11-12 — Step 1 hosted Supabase checks (read-only; nothing applied or modified)
Target: project ref `rdrkskrzdyqezzopnena`, publishable key only, via PostgREST/Auth HTTP calls with no user session. Not a substitute for the two-session test.

| Check | Expected | Actual | Result |
|---|---|---|---|
| Catalogue counts (airports/activities/templates/template_items) | 2/8/2/4 | 2/8/2/4 (Content-Range) | PASS |
| Seed matches repo seed | LIS 40/60/30/180 min, SIN 50/45/75/120; templates [40,60] and 2 ordered items | matches; all `is_demo` | PASS |
| No-session read of `layovers`, `plan_items` | denied | 42501 permission denied | PASS |
| No-session INSERT into `airports`, `layovers` | denied | 42501 / HTTP 401 | PASS |
| No-session `save_plan` RPC | denied | 42501 permission denied for function (function exists) | PASS |
| Anonymous sign-in (`/auth/v1/signup`) | session issued | 422 `anonymous_provider_disabled`; settings show `anonymous_users:false` | **FAIL — blocker** |
| Authenticated own save/read/edit, cross-user isolation, malformed-save rollback | pass | not run: needs anonymous sign-in | **UNVERIFIED** |
| CAPTCHA | optional | none configured in auth settings | noted |

Action required (owner): Supabase dashboard → Authentication → Sign In / Providers → enable "Allow anonymous sign-ins". Consider CAPTCHA/rate limits afterwards. Then run the two-identity test. `.env` values for the app are the project URL and publishable key only. Database types not yet generated.

## 2026-11-12 — Step 1 two-session test: NOT RUN to completion
Anonymous sign-in now works (two distinct users, role `authenticated`, `is_anonymous` true). However, in the cloud sandbox the egress proxy does not forward a caller-supplied `Authorization: Bearer <user JWT>` to Supabase: `/auth/v1/user` returns `no_authorization` for both a real session JWT and a garbage token, and PostgREST evaluates requests as role `anon` (`permission denied ... layovers TO anon`). The failures seen (`save_plan` 42501, own-plan reads denied) are therefore an artifact of this sandbox, **not** evidence about the database's RLS/grants, and no pass/fail is claimed for ownership, save, edit, conflict or rollback.

Test prepared: `tests/hosted/ownership.mjs` (~30 assertions: two identities, A create/read/edit, B read/edit/takeover denied, direct writes denied, revision conflict, duplicate create, 10 rollback cases, empty plan, catalogue immutability). Run locally (creates anonymous users and a few synthetic plans in the target project; no delete path exists):
`SUPABASE_URL=https://rdrkskrzdyqezzopnena.supabase.co SUPABASE_PUBLISHABLE_KEY=<publishable key> node tests/hosted/ownership.mjs`
Database types are not generated (needs Supabase CLI auth): `npx supabase gen types typescript --project-id rdrkskrzdyqezzopnena > src/types/database.types.ts`.

## 2026-11-12 — Step 1 hosted two-session test (GitHub Actions run 43136585630, commit 47d9a5c)
Run in GitHub's cloud (the sandbox proxy strips user JWTs, so it cannot be tested from here). Hosted project `rdrkskrzdyqezzopnena`, publishable key only. **30 of 33 checks passed; 3 failed.**

PASS: two distinct anonymous identities (role `authenticated`); A creates a plan (rev 0 → revision 1), reads it back with ordered items and server-copied duration snapshots; B sees zero rows, cannot list, edit (403/42501) or modify A's plan; A's plan unchanged after B's attempts; direct UPDATE/INSERT/DELETE denied even for the owner; A edit with revision 1 → revision 2 with new buffer and three ordered items; ten malformed saves each rejected (22023 / 23514) and left the plan byte-identical (cross-airport, duplicate, nonexistent and null activity, 21 activities, reversed times, >48h, buffer 1441 and -1, airport change); empty plan valid; no-session save/read denied (401); catalogue cannot be mutated by a signed-in user.

FAIL (all three are the same cause): `B cannot take over A UUID via create`, `stale revision → conflict`, `re-create same UUID → conflict`. Each is a `save_plan` call that raises SQLSTATE `40001`; the hosted API did not answer within 20 s (client timeout) instead of returning a conflict. Data was **not** corrupted (follow-up read showed A's plan unchanged). Hypothesis (not proven): the API layer treats 40001 (serialization_failure) as retryable and retries. Impact: the app cannot show a conflict message; ownership itself held.

Proposed fix withdrawn: a schema change was drafted but removed from the branch at the owner's direction. No schema or RLS change is made on the basis of this timeout; the cause is still being investigated through the test harness.

Not done: database types (`src/types/database.types.ts`) — needs Supabase CLI login; no hosted Auth abuse controls/CAPTCHA verification.

## 2026-11-12 — Hardened hosted test: run 43136955343 (commit c0225c9)
Known issue (open, **unresolved**): `save_plan` calls that hit the conflict path (takeover by another user, stale revision, re-creating an existing UUID) receive no response — 15 s timeout, and still none after a 60 s repeat. Stored data was unchanged each time (revision/item count verified by follow-up read). After the stale-revision hang, plain reads of `layovers` also timed out three times, suggesting hung server-side requests were still running. Normal-path and other-error saves answered in 0.2–0.5 s. Cause not proven (hypothesis: API layer retrying SQLSTATE 40001). No schema/RLS change was made. Server logs were not inspected.
Impact: ownership held; user-facing conflict messages cannot work until this is understood. Run crashed at step "conflict left data intact" (harness bug, now null-safe), so the duplicate-create check and all rollback cases did not run in this run; they passed in run 43136585630 but are re-marked **unverified** pending a complete passing run.
Harness now sends at most one 10 s request per conflict check, never repeats it, and skips (marks UNVERIFIED) the remaining conflict-path checks after the first hang. Not rerun yet, deliberately, to avoid loading the database.

## 2026-11-12 — Data layer unit tests
`npx vitest run` → 40 passed (35 domain + 5 data layer: one anonymous identity under concurrent calls, existing session reused, exact `save_plan` args, no success on RPC error, read-back failure surfaces). Mock-based; the real-API happy path (sign-in → create → read → edit, plus user isolation) is evidenced by the hosted runs above. Types are hand-written, not generated.

## 2026-11-12 — Frontend integration (commit 7713d33)
Figma Make source obtained through the Figma connector (26 source files + 5 airline logos; baseline in `figma-export/`) and wired to Supabase. See docs/FRONTEND_INTEGRATION.md.

| Check | Command | Result |
|---|---|---|
| Typecheck + production build | `npm run build` | PASS |
| Unit tests (domain, data layer, headless store) | `npm test -- --run` | 55 passed, 1 skipped (hosted) |
| Browser journey, iPhone 13 viewport, built app | `npm run test:e2e` | 23/23 PASS |

Browser journey covers: welcome → add flight → connection details (5h total, 3h30 usable) → map view → list view with curated itinerary fit → add/remove activities → remaining time 1h50 → failed save keeps draft and shows no success → save → Home shows personalised trip → refresh retrieves it → edit → save (revision 2) → refresh → My Plans shows the edit; a second guest sees no trip and an empty list; illustrative flight comparison; catalogue error + retry; no guest account is created just by opening the app.
**Limitation:** the browser journey runs against a *simulated* Supabase API (`tests/e2e/fake-supabase.mjs`) because this environment cannot send user sessions to the real project. It proves the UI wiring, not the hosted database. Real-database evidence for the same calls (sign-in, create, read, edit, isolation) is the earlier run 43136585630. The deployed app has **not** been verified against the real project.

## 2026-11-12 — OPEN BLOCKER: hosted REST API not answering
Observed ~02:00–02:20 UTC: `GET /rest/v1/airports?select=id&limit=1` and every other table read time out (20–25 s, no bytes) while `/auth/v1/health` and `/auth/v1/settings` answer in <1 s. The manual happy-path run 43138789191 signed in successfully and then timed out three times reading `layovers`. Catalogue reads answered normally at 01:20–01:50 UTC, before/around the conflict-path tests.
Most likely cause (not confirmed from server logs): each `save_plan` call that raises SQLSTATE 40001 is retried indefinitely by the API layer (PostgREST retries serialization failures), holding one database connection forever. The hosted ownership tests sent roughly ten such calls across runs, which is enough to exhaust the API's connection pool. **This was triggered by the test runs made in this session.**
Effect: the app currently shows "We could not load the airports" against the real project. No data was changed or lost.
Recovery (owner, dashboard): Project Settings → General → **Restart project** (or pause/resume). Then reads should answer again.
Prevention: `docs/proposed-fix-conflict-errcode.sql` (function-only change, NOT applied) stops conflicts from using 40001. Without it, any user who triggers ~10 conflicts (e.g. saving the same plan from two tabs) can stall the API again. The app reduces the risk: the Save button is disabled while saving, and a retried first save continues from the server's revision instead of re-creating the plan.
The hosted workflow is manual-only and has not been run again since the owner asked to stop.

## 2026-11-12 — Fresh Supabase project (replaces the old one)
The old project (`rdrkskrzdyqezzopnena`) had Auth and PostgREST Unhealthy (HTTP 521) and the management API reports it "removed"; it was not touched or deleted by this work. Fresh project: `sgwbtgwccskqamzttczz` (eu-west-1, Postgres 17), created by the owner; no users or records transferred.
Set up from the repo files only, in order: `001_schema.sql`, `002_security_and_save.sql` (conflicts now raise `PT409`, not `40001`), `seed.sql`. Anonymous sign-ins enabled through the management API.

| Check | Result |
|---|---|
| Six tables present, RLS enabled on all six | PASS |
| Policies: `catalogue_read` (anon, authenticated) on 4 catalogue tables; `owner_read` (authenticated) on layovers, plan_items | PASS |
| `save_plan`: owner postgres, security definer, `search_path=""`, uses PT409, no 40001, execute for authenticated only | PASS |
| Seed counts 2 / 8 / 2 / 4; layovers and plan_items empty | PASS |
| HTTP catalogue reads with the publishable key (airports, activities, itinerary_templates, template_items) | 200, counts 2/8/2/4 |
| No-session read of `layovers` | denied (42501) |
| Local database regression with PT409 | 15/15 PASS |
| Unit tests / production build | 55 passed, 1 skipped / PASS; built bundle contains only the new project URL |
| Real-database happy path (`src/api/hosted.journey.test.ts`, run once): guest sign-in → catalogue → template → save → reload → homepage upcoming-trip data → edit (revision 2) → reload → second guest sees no plans and cannot open it | PASS (8.4 s) |
Not run, by instruction: conflict/ownership stress tests. The PT409 conflict path is verified only in the local database harness and by inspecting the deployed function definition; it has not been exercised over the hosted API.

## 2026-11-12 (later) — production verification and UI fixes
Production: `skystop.vercel.app` served commit `06e4725` (checked through the Vercel API, state READY, target production, branch `claude/tender-keller-cxp9ac` = `main` content) and the live bundle contained only the new Supabase project.
`npm run test:live` (real Chromium, iPhone 13 viewport, deployed app + live database), run three times in total while retaking screenshots (final run on 06e4725): **16/16 PASS** each time; 28 Supabase calls, all HTTP 200: catalogue GETs, one anonymous sign-up on first save, `save_plan` ×2, plan GETs. Covers add flight → connection details → map and list → curated itinerary fit → over-budget (280 vs 210 min → over by 1h 10m, "Save plan anyway") → build → save → home ticket → refresh → retrieve → edit → save → refresh → My Plans (1 activity, 2h 30m left). Each run left one synthetic guest and one synthetic plan in the new project.
`npm run test:e2e` (simulated API): 24/24 PASS, including the curated-itinerary path (Airports → Lisbon → List → Customize itinerary → dates → builder with the template: 1h 50m left).
`npm test -- --run`: 70 passed, 1 skipped. Production build passes.
Map fixes with geometry tests: see docs/UI_REVIEW.md.
Not done: real-phone check, desktop widths, keyboard/accessibility audit, hosted conflict-path (`PT409`) exercise, Safari.

## 2026-11-12 — UX refinement (commit `97e2972`)
`npm test -- --run`: 76 passed, 1 skipped (new: `src/data/time.test.ts`, 6 tests for time-zone-aware durations). Production build passes. `npm test --prefix tests/database`: 15/15.
`npm run build && npm run test:e2e` (simulated API, real Chromium): **41/41** — booked-flight journey (Plan a layover → List-first discovery → List↔Map keeps the plan → build → failed save keeps the draft → save with confirmation → refresh → retrieve → edit → "All changes saved" → refresh), explore-first (selections and airport carried into setup), itinerary-first (name carried), builder layout at 320×568 / 375×667 / 390×664 (content ends above the bars, no sideways scroll, no clipped or overflowing bar text), flight comparison, catalogue error/retry.
Production `skystop.vercel.app` = `97e2972` (Vercel READY). **Read-only** live check (no Save pressed, no records created, by instruction): 7/7 — welcome CTA, catalogue from Supabase, List-first, Map keeps selection, setup carries airport + selection, overnight 23:30→02:00 = 2h 30m / 1h usable, builder bar; only catalogue GETs were made.
Not run on production after this change: save/refresh/edit (would create records). The previous build passed it live 16/16.

## 2026-11-12 — Visual redesign ("Dusk" glass design system; see docs/DESIGN_SYSTEM.md)
Presentation-only change: no store, data-access, Supabase, schema or domain-logic changes. One latent bug fixed: the airport list's "Set my layover times" button passed the click event into the route as `templateId`.
`npm run build`: PASS. `npx vitest run`: 76 passed, 1 skipped. `npm run build && npm run test:e2e` (simulated API, real Chromium): **41/41**, including builder layout at 320×568 / 375×667 / 390×664 (content clears save bar and tab bar, no sideways scroll, no clipped bar text).
Screenshot review (Playwright, 390×844 and 320×568, photos substituted locally because Unsplash is blocked in the build sandbox; also checked with photos blocked to verify the gradient fallbacks): welcome, home (empty and with saved trip), airports, airport list and map, plan-a-layover form, builder, activity sheet, My Plans, plan detail, compare form, results, flight details. No horizontal overflow found.
Not done: real-device iPhone check, Safari backdrop-filter rendering, production deploy verification of this commit, hosted tests (not rerun, by instruction).

2026-11-12 | Phase 1–4 (mobile UX, onboarding, booking ref, catalogue) | local + hosted | `npm test -- --run` | all pass | 84 passed, 1 skipped | PASS | console | —
2026-11-12 | same | local PGlite | `npm test --prefix tests/database` (now includes migration 202611120001) | 15 pass; 4 airports / 29 activities / 5 templates / 10 items | 15 PASS | PASS | console | not a full Supabase stack
2026-11-12 | same | simulated API, Chromium | `npm run test:e2e` | 64 checks | 64/64 | PASS | screenshots in scratch | simulated API, not the hosted DB
2026-11-12 | same | simulated API, Chromium | `npm run test:layout` (13 screens × 320/375/390/430) | 0 issues | 0 issues | PASS | console | Chromium only; no WebKit / real iPhone
2026-11-12 | same | hosted Supabase (management API) | apply migration 202611120001 twice; read counts | additive, idempotent; saved plans intact | 4/29/5/10; layovers 5, plan_items 6 before and after | PASS | query output | —
2026-11-12 | `dfb8384`+ | production https://skystop.vercel.app | read-only: onboarding → CJ8NWT → Explore London → venue sheet | LHR venues, itinerary, source link, no "Demo", no JS errors | as expected | PASS | prod screenshots | no plan saved on production in this pass
2026-11-13 | constraint-aware planning | local PGlite | `npm test --prefix tests/database` (incl. transfer graph: re-runnable, constraints, read-only to anon/authenticated) | 16 pass | 16 | PASS | console | not a full Supabase stack
2026-11-13 | same | hosted Supabase | apply 202611130001; counts before/after | additive; plans intact | locations 5, transfers 18, links 12, guidance URLs 4; layovers 6 / plan_items 8 unchanged | PASS | query output | —
2026-11-13 | same | unit | `npm test` (itinerary engine scenarios A–E, shortest path, unknown route, unsupported airport) | pass | 118 passed, 1 skipped | PASS | console | —
2026-11-13 | same | simulated API, Chromium | `npm run test:e2e`: A airside-only (8h 40m left = 10h 20m − 1h 10m − 30m), B Jewel (entry check, immigration chips, ICA link, no eligibility claim, nationality not stored), C over budget (explained), D terminals unknown (cannot verify), E reorder/remove, F save → refresh → reopen → edit terminal → save → refresh | all pass | 82/82 | PASS | screenshots in scratch | simulated API; no hosted save in this pass
2026-11-13 | same | simulated API, Chromium | `npm run test:layout` incl. Changi builder + entry panel at 320/375/390/430 | 0 issues | 0 | PASS | console | Chromium only; no WebKit/real iPhone

### Launch splash

- `npm run build` passed on the final implementation. `npm test -- --run`: 118 passed, one hosted test skipped.
- `npm run test:e2e`: 82/82 checks passed against simulated Supabase before the final SVG mask and centering adjustment.
- A separate headless Chromium check on the final build passed at 320, 375 and 390 px: centered SVG, 1.5-second CSS animation, interaction restored at reveal, no replay on navigation, replay after reload, and immediate onboarding with reduced motion. Inspected captures at 180, 650, 1,000 and 1,260 ms.
- No hosted database checks were run.

- Size and timing adjustment: reduced logo width by about 20% and set duration to 2 seconds. Build, 118 tests (one hosted skip), and the focused Chromium checks at 320, 375 and 390 px passed.

### Manual setup and booking entry cleanup

- Build passed. Unit suite: 118 passed, one hosted test skipped.
- Headless Chromium with simulated Supabase: 42/42 checks passed across the manual and sample booking journeys, including the buffer help toggle and save/reopen behavior. The hosted browser script was updated for the manual form and was not run.

### Fixed navigation and overnight itinerary notice

- Build passed. Unit suite: 118 passed, one hosted test skipped.
- Headless Chromium with simulated Supabase passed at 320 and 390 px: tabs touch the bottom edge, the primary action stays above them in airport List and Map, and an overnight itinerary shows the separate notice without the old transfer footer.

### Home Next Layover card

- Production build passed. Unit suite: 118 passed, one hosted test skipped.
- Headless Chromium with simulated Supabase: 44/44 manual and sample booking checks passed. Verified transit-only manual data, CGK → SIN → CDG with separate SIN layover times, and 320 px layout without horizontal overflow or a CTA covered by the tabs.
2026-11-14 | flights/accounts/profile | local PGlite | `npm test --prefix tests/database` | 17 pass incl. owner-only layover_details/traveler_profiles, B cannot read/insert/delete A's rows, anon denied, delete cascades items+details | 17 | PASS | console | not a full Supabase stack
2026-11-14 | same | hosted Supabase | apply 202611140001 | additive; plans intact | layovers 7 / plan_items 9 before and after; policies owner_all ×2, owner_delete | PASS | query output | —
2026-11-14 | same | simulated API, Chromium | `npm run test:e2e` §6: empty state; 3 sample flights saved without activities, details stored server-side; stack order + tap-to-front + View layover; no duplicate sample save; routes restored from DB after clearing browser copy; My flights order/status; remove with confirmation (server delete); profile nationality saved owner-only; guest → account keeps same id/flights/nationality; second device sees same flights with routes; sign-out; sign-in link; manual flight with origin/destination | all pass | 106/106 | PASS | console | simulated auth; real email delivery not tested
2026-11-14 | same | simulated API, Chromium | `npm run test:layout` incl. home-with-trip, my-flights, profile, home-flight-stack at 320/375/390/430 | 0 issues | 0 | PASS | screenshots | Chromium only
2026-11-15 | name + profile picture | hosted Supabase | apply 202611150001_avatars | private bucket + 4 owner policies | bucket avatars (private, 1 MB); policies select/insert/update/delete | PASS | query output | upload not exercised on hosted
2026-11-15 | same | simulated API, Chromium | `npm run test:e2e` name save, email shown, upload to own folder, display, persist, remove | pass | 113/113 | PASS | console | simulated storage

### Account Access screen (after onboarding)

- `npm run build` (tsc + vite) passed. `npx vitest run`: 122 passed, one hosted test skipped (includes 4 new access-decision tests).
- `npm run test:e2e` (simulated Supabase, Chromium): 123/123 after rebasing onto 174a1b4. New checks: Skip opens Account Access; no account created by viewing it; leaving without choosing shows it again on the next launch; Continue as guest opens Home with no signup call; a returning guest sees neither onboarding nor Account Access; replay uses the planning flow without a second Account Access; Create account and Sign in open the existing email-link forms on Profile; a browser with an existing session skips to Home; reduced motion stops every glow and glass animation; decorative layers ignore pointer events; glass uses a real `backdrop-filter` blur.
- `npm run test:layout`: 0 issues (existing screens; unchanged).
- Separate Chromium captures at 320×568, 375×667, 390×844 and 430×932: no horizontal scroll, no overlapping controls, glow transform measured changing over 4 s (motion), static composition under reduced motion, desktop device frame and fullscreen inspected.
- Contrast sampled over the moving glow for 30 s: tagline (charcoal) ≥ 9.7:1. The white "SkyStop" wordmark is 1.4–1.7:1 (brand logotype, as in the reference; WCAG 1.4.3 exempts logotypes).
- Not tested: Safari/WebKit and real iPhones (Chromium only), real frame rate or battery, real email delivery.
- Motion fix (owner saw a static screen on two devices): the glow moved only ~4 px/s and used individual `translate`/`scale`/`rotate` keyframes. Now nested layers animate plain `transform`. Measured lobe speed in Chromium: 25–30 px/s average, 63 px/s peak; core 8 px/s. Build, 122 unit tests (one hosted skip), e2e 123/123, tagline ≥ 10.5:1. Still untested on Safari/iPhone.
- Stronger motion (owner: moving but not obvious): larger travel and shape change, brightness pulse on two lobes, and a hot spot sweeping across behind the glass. Measured in Chromium: lobes 43–66 px/s average (peak 140), core 13 px/s. Build, 122 unit tests (one hosted skip), e2e 123/123, no sideways scroll at 320–430 px, tagline ≥ 10.4:1, wordmark keeps orange behind it in 1-second frames.
- Monogram + favicon (owner request): Account Access shows a white front S and a frosted-glass rear S (real backdrop blur cut to the S shape with a CSS mask; checked the mask is non-empty, 19% of the box). Favicon is the coral SS on a white tile, plus a 180 px apple-touch-icon; checked at 16/32/64 px on light and dark tab bars. Build, 122 unit tests (one hosted skip), e2e 123/123, no sideways scroll at 320–430 px, tagline ≥ 10.6:1. Safari rendering of the masked glass not tested.
- Smaller logo and new tagline (owner request): monogram about 80 px wide at 390 px (was ~195); tagline "Plan your layover" in white. Build, 122 unit tests (one hosted skip), e2e 124/124, no sideways scroll at 320–430 px. Known: white tagline measures 1.4:1 against the glow (below WCAG AA 4.5:1; owner chose white, a warm text shadow aids legibility).
- Onboarding badge (owner request): the coral plane circle is replaced by a small white SS mark (src/components/SSMark.tsx, original geometry; rear S at 45% white). 29×18 px at 320 and 390 px, no sideways scroll. Build, 122 unit tests (one hosted skip), e2e all pass.
- Onboarding mark (owner request): pill background and "SkyStop" text removed; bare white SS at 51×32 px with a soft shadow. No sideways scroll at 320/390 px; unit and e2e pass.

### Onboarding transitions (card morph)

- Rebuilt the step change with Motion 14.7.1 (pinned): one persistent glass card morphs between steps (layout spring, ≈0.75 s, corners kept), its content and the headline/body blur out and sharpen in with a stagger, photos crossfade with a slow settle, the coral glow drifts, the CTA reshapes Next ↔ Get started. Content, copy, Skip/Back/Next/Get started, dots, swipe and arrow keys unchanged in behaviour.
- `npm run test:e2e` 129/129 incl. new checks: old and new headlines overlap with the outgoing one blurred; the same card element morphs (208 px tile ↔ 304 px card, mid-transition width in between); settles to one headline and one photo; reduced motion switches instantly (no blur/fade). Unit 122 (one hosted skip); `npm run test:layout` 0 issues.
- Frame captures at 80–900 ms for 1→2, 2→3 and 3→2; rapid key presses interrupting transitions leave one headline and one photo, no errors. Every element on all three steps on screen at 320/375/390/430 px (fixed: "Get started" was cut off at 320 px; narrow phones now show the label without the arrow circle).
- Bundle grows by about 57 KB gzipped (Motion). Not tested on Safari/iPhone; the reference video did not reach this session, timing follows the written brief.
- Account Access buttons (owner request): Create account and Sign in now sit in the same frosted tray with the same pills as the Journey action bar (shared coral Button; frosted-white secondary). Continue as guest unchanged below. No sideways scroll at 320–430 px; unit and e2e pass.
- Onboarding Get started / Sign in (owner request): every step shows dots, then a coral Get started (next step; finishes onboarding on the last) and a white Sign in pill (opens the email sign-in form on the account screen; Not now returns; hidden for signed-in visitors). "SkyStop" beside the SS. Round Back button removed (back via dots, swipe, arrow keys). Short screens (≤640 px tall) use tighter type. e2e 134/134, unit 122 (one hosted skip), layout 0 issues; every element on screen at 320/375/390/430 px on all steps.

### Design system consolidation (tokens, materials, shared components)

- Audit (before): 9 card radii (1–2 rem), ~20 one-off shadows, 10 one-off font sizes, 3 secondary-button styles, the frosted action tray copied 3×, 2 identical empty-state boxes, ~15 hand-rolled round icon buttons, 2 loading patterns, header gutter 16 px vs content 20 px.
- Implemented: tokens in `src/index.css` (radius control/card/surface/tray, elevation e1–e3 + glow, display/metric/code/micro type, gutter, warning colour, motion durations/easing), glass materials subtle/medium/premium with specular, bevel, warm edge and thickness (panels solid, no blur), coral-glass `sunset`, `btn-secondary`; components in `ui.tsx` (Button variants/sizes, IconButton, Surface, Pill, SectionHeader, TextField, EmptyState, LoadingState, Skeleton) applied to Home, layover setup, Airport, Builder, My plans, Profile, Account Access, onboarding and app loading (re-applied after main removed the booking lookup, Journey, Compare and My flights screens). Documented in `docs/DESIGN_SYSTEM.md`.
- Checks: `tsc` clean; unit 122 passed (one hosted skip); `npm run test:e2e` 134/134; `npm run test:layout` 0 issues at 320/375/390/430 px; before/after screenshots of all 17 audited screens compared by eye; material swatches rendered over warm light; desktop frame and fullscreen captured. Not tested: Safari/WebKit and real iPhones (blur cost, rendering of the glass optics).

### "Dusk" visual redesign (2026-11-13, scheduled redesign task)

- Direction from `design-references/` (owner brief): dark warm canvas with fixed ambient coral/plum/amber light instead of white screens; frosted glass panels with real backdrop blur; recessed `field` inputs; warm-white `pill-on` selected states; floating capsule tab bar with a gliding coral indicator; full-bleed photographic Home hero (next trip's airport, else wing above clouds) melting into the canvas; Airport hero melts into the canvas; boarding pass on `glass-premium`; smoked-glass flight-stack strips; glass toast. Screen transitions via the View Transitions API (push/back slide, tab crossfade; off under reduced motion). Typography unchanged (system font / SF Pro). No Supabase, schema, data or domain logic changes; `src/store.tsx` only wraps route updates in the transition (the notice is cleared before the deferred route change so save confirmations still show).
- `npm run build` (tsc + vite): passed. `npx vitest run`: 122 passed, 1 hosted skipped.
- `npm run test:layout`: 0 issues at 320/375/390/430 px (navigates with motion on, so it exercises the view transitions).
- `npm run test:e2e`: 134/134, run twice. The suite now runs with reduced motion by default (`MOTION=no-preference` to override) because many checks read the screen immediately after a click and the transition commits the new screen a frame later; the onboarding-morph checks still run with motion on. Four checks also wait for their destination screen. With `MOTION=no-preference` 3 of those immediate-read checks fail on timing (131/134): known, test-side.
- Screenshots reviewed at 390 px (all 17 audited screens plus Home empty state, Compare flights, Singapore airport, itinerary setup) and 320 px (6 dense screens): no overlapping controls apart from the transient top toast, which can sit over the Home profile/bell row for up to 5 s (unchanged behaviour).
- Contrast (computed): `ink` on canvas ≈ 17:1, `muted-text` ≈ 9.5:1, `accent-dark` #FF8A70 ≈ 7.8:1. White on coral buttons unchanged from before (bold large text).
- Not tested: Safari/WebKit and real iPhones (backdrop-filter cost, View Transitions support in Safari 18+), photos from images.unsplash.com (blocked in this sandbox; local airport photos were substituted in screenshots).

### Map and wayfinding (Changi pilot)

- Audit (before): terminal bubbles pushed off their points with leader lines; at 320 px the action tray covered the sheet's venue list and the map credit was hidden under the tab bar; three stacked layers at the bottom (sheet, action tray, tab bar).
- Implemented (`src/features/wayfinding/`, `AirportMap.tsx`): pins anchored on their published points with clustering; terminal filter; one coordinated sheet (browse / venue / directions) above the tab bar; light glossy map controls; CARTO light basemap; "How to get there" for the itinerary or one venue at Changi with ordered stops, per-leg minutes, Published time / Estimate / No directions labels and checkpoint flags; current leg framed and highlighted on the map; route lines only from documented geometry (none exists, so none drawn); honest fallback at LIS/LHR/DXB. Research and rules in `docs/WAYFINDING.md`.
- Checks: unit 135 passed (one hosted skip), incl. 13 new wayfinding tests (leg status, no-line rule, T2 without a pin, clustering never overlaps); `npm run test:e2e` 144/144 incl. 10 new wayfinding checks (pins apart, no floor control, step 1/2 content and immigration flag, highlight, no route line, all steps, sheet/controls/credit/tab bar layout, plan kept, Lisbon fallback); `npm run test:layout` 0 issues incl. airport-map at 320/375/390/430 px; screenshots inspected at 320×568/640, 390×844, 430×932 with real OSM tiles.
- Not verified: OpenStreetMap indoor coverage (query service not reachable from this environment); CARTO light style (local build has no CARTO key, so tiles were OSM; production has the key); Safari/iPhone.
