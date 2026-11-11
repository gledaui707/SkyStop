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
