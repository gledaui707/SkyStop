# Implementation status
As of architecture handoff, 2026-11-11. Update with evidence, not optimism.
- [x] Read assignment, brief and both historical HCI PDFs.
- [x] Inspect initial repository and Figma reference metadata.
- [x] Define scope, provisional stories, architecture and folders.
- [x] Write AGENTS.md / CLAUDE.md and ordered handoff.
- [x] Prepare six-table schema, RLS, atomic save RPC and demo seed.
- [ ] Apply migrations and seed to verified Supabase project.
- [~] Hosted anonymous Auth and two-user isolation verified (30/33, run 43136585630); conflict path fix pending apply; abuse controls/CAPTCHA not configured.
- [x] Integrate Figma Make export into one React app. (baseline in figma-export/, app in src/)
- [x] Implement domain logic and automated unit tests. (35 passing, docs/VALIDATION.md 2026-11-12)
- [~] Implement catalogue → plan → save → refresh → edit. (built; 23/23 browser checks against a simulated API; NOT yet verified against the real project — hosted REST API currently not answering)
- [x] Implement automated browser critical-flow tests. (tests/e2e/journey.mjs, simulated API)
- [ ] Complete manual every-screen and AI UI review; student compares A1 mockups.
- [ ] Map provisional stories to actual Assignment 1 stories.
- [ ] Deploy and verify production read/write/refresh/isolation.
- [ ] Produce final real-screenshot PDF and submit URL/PDF on Moodle.
- [ ] Book demo and rehearse twice in five minutes.
Database harness results and limits: docs/VALIDATION.md.

## Scope decision (owner, 2026-11-12)
Demo is a five-minute happy flow only. Revision-conflict handling is out of the demo scope; known issue recorded in docs/VALIDATION.md (conflict-path save_plan calls hang on the hosted API; ownership, create, read, edit and rollback paths work). The app must disable the save button while saving so a double-submit cannot hit that path. Revisit only if the assignment brief requires it.
- [x] Data layer written (src/data: client, guest session, repositories) with 5 mock-based unit tests; types in src/types/database.types.ts are HAND-WRITTEN, not CLI-generated.
- [x] Wire data layer into the Figma Make export.
- [ ] BLOCKER: restart the Supabase project (REST API not answering since ~02:00 UTC 2026-11-12); decide on docs/proposed-fix-conflict-errcode.sql.
- [ ] Deploy to Vercel (no access from the build environment; steps in docs/DEPLOY_VERCEL.md) and verify save/refresh/edit on the public URL.
