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
