# Progress report / handoff (updated 2026-11-12)
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
`npm test -- --run` (70) · `npm run build` · `npm run test:e2e` (simulated API, 24 checks; needs Playwright available) · `npm run test:live` (REAL site + DB, creates a guest/plan; run sparingly) · `npm run test:hosted` (real DB data-layer journey; manual only) · `npm test --prefix tests/database` (15) · `./scripts/build-submission-pdf.sh` (needs `pip install markdown`; rebuilds the draft PDF).
The sandbox needs hosts allowed (api.supabase.com, sgwbtgwccskqamzttczz.supabase.co, skystop.vercel.app, api.vercel.com, images.unsplash.com); Node `fetch` needs `NODE_USE_ENV_PROXY=1`; Chromium needs `proxy: { server: process.env.HTTPS_PROXY }`.

## Done (evidence in docs/VALIDATION.md)
Domain logic + tests; data layer; Figma integration; fresh Supabase setup and verification; live journey; map overlap fixes (UI_REVIEW.md); DATABASE_AS_IMPLEMENTED.md (generated from live DB); DEMO_SCRIPT.md; SUBMISSION_PDF_CONTENT.md and the draft PDF (docs/submission/); UI review record.

## Open / next (priority order)
1. **Student:** real-phone run of docs/DEMO_SCRIPT.md; switch Vercel production branch to `main`; revoke tokens.
2. **Student:** map US1–US6 to Assignment 1 story IDs; compare the app with the A1 mockups (UI_REVIEW.md); review and complete the ✏️ items in docs/SUBMISSION_PDF_CONTENT.md; regenerate the PDF; upload to Moodle by Nov 15 23:59 (Europe/Lisbon); book the demo slot; rehearse twice.
3. Optional improvements (not started, none required): landside marker label clipped by the bottom sheet on short phones (UI_REVIEW #4); desktop layout check; keyboard/accessibility audit; hand-written DB types → generate with the Supabase CLI; real two-user isolation test beyond the single data-layer run (needs the owner's approval).
4. Do not: add features, change the schema, run stress/conflict tests, or create branches.

## Repo map for the submission
docs/SUBMISSION_PDF_CONTENT.md (PDF source) · docs/submission/SkyStop-Assignment2-DRAFT.pdf · docs/screenshots/ (11 real screenshots) · docs/DATABASE_AS_IMPLEMENTED.md · docs/DEMO_SCRIPT.md · docs/UI_REVIEW.md · docs/VALIDATION.md · docs/REQUIREMENTS.md (A1–A8 status).
