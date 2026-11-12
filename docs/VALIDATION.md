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
