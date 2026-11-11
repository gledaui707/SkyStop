# Test plan and release gates
Database harness is delivered now. Application tests below are required work for Claude, not claimed as implemented. Use Vitest + Testing Library for domain/components, Playwright for browser flows; retain compatible tools already in export. Add scripts `test`, `test:e2e`, `typecheck`, `lint`, `build` to the actual app package. Expected commands: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm run build`, `npm run test:e2e` (adapt to the single retained package manager).

## Deterministic unit cases
Freeze clock to 2026-11-11; keep timezone explicit.
| ID | Input | Expected |
|---|---|---|
| U1 | LIS 2026-11-17 10:00→15:00, buffer 90 | total 300, usable 210 |
| U2 | LIS Nov 17 23:30→Nov 18 02:00, buffer 60 | total 150, usable 90, next-day label |
| U3 | Same local times 10:00→15:00 in SIN; browser set Lisbon/New York | same 300 minutes and same stored UTC instants across browsers |
| U4 | Missing, impossible date, departure <= arrival, >48h, negative/fractional buffer, new arrival in past | reject with field error; exactly 48h accepted |
| U5 | Europe/Lisbon 2027-03-28 01:30 (gap) and 2027-10-31 01:30 (overlap) | reject ambiguous/nonexistent local time; no silent conversion |
| U6 | 60-minute layover, buffer 60 and 90 | usable 0; no-usable-time warning, no negative usable value |
| U7 | category food + fits time 45 vs duration 40/50 | include 40, exclude 50; clear filters restores results |
| U8 | LIS template [40,60] | ordered total 100; copying/removing does not modify template |
| U9 | usable 210, select 40+60+180 | total 280, remaining -70, warning; remove 180 →100, remaining110; exact210 not over; duplicate add ignored |

## Database regression harness
`npm ci --prefix tests/database` then `npm test --prefix tests/database`.
Uses PGlite PostgreSQL in memory and a minimal auth.uid/auth.users fixture. Checks SQL execution, seed idempotence, role grants, RLS isolation, RPC ownership, invalid inputs, cross-airport references, revision conflict and atomic rollback. This does NOT validate Supabase Auth/JWT issuance, PostgREST schema exposure, CAPTCHA, browser persistence or hosted service settings. Repeat integration tests against a disposable local Supabase stack and then real deployment before release. Never use a service-role client to assert end-user RLS works.

## Browser/integration acceptance
- E1: fresh browser → DB catalogue → LIS future dates → template → save → wait for server → reload → identical header/ordered items → remove/add → save → reload shows edits. Assert database-backed response; clearing React state must not lose saved data. Use dynamic future dates, not expiring fixed fixtures.
- E2: invalid date blocked; empty plan valid; over-budget warning persists after reload; category/time filters, accessible detail modal, back navigation and unsaved-draft handling.
- E3: isolate browser contexts A/B, sign in separately, A save; B fetch/edit A UUID fails/empty. No-session write and catalogue mutation fail. Verify own B plan succeeds.
- E4: delay/drop save response, retry same UUID and reconcile; double-click save produces one plan; two tabs with same revision: second gets conflict, first change preserved. Network/auth/CAPTCHA errors retain draft and offer retry. Invalid child request rolls back whole edit.
- E5: production direct-link refresh and unknown-route handling; private window public site accessible; catalogue and save/edit work outside developer laptop. Confirm no mock-data/localStorage-only fallback.

## Manual every-screen matrix
For home, airport catalogue, detail modal, new planner, saved list, saved editor and 404: check populated/loading/empty/error where applicable, keyboard focus/order, labels, readable errors, back behavior, 320/393/768/1440px widths, 200% zoom and no horizontal scroll. Test at least Chrome and Safari if available. Contrast target WCAG AA (4.5:1 normal text), visible focus, semantic controls, error summary/field associations, non-colour-only warnings, accessible modal focus return, announced save status, comfortable touch controls. These are implementation quality targets supporting the PDF's accessibility requirement, not extra quoted rubric text.

Release-blocking: broken core flow, data loss, ownership leak, exposed secrets, false saved state, incorrect overnight/timezone arithmetic, inaccessible core controls, unavailable public URL, missing actual PDF/evidence. Minor cosmetic issues may be documented after all gates pass.

Record date, commit, environment/browser, command/scenario, expected/actual, pass/fail, evidence location, fixes and rerun. Never mark the planned suite completed merely because this file exists.
