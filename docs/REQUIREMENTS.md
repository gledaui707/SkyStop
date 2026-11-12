# Assignment 2 requirements and scope
Authority: Assignment 2 - MVP.pdf, page 1, sections 1–6. The PDF is the sole authority for assessment and submission obligations. It does not prescribe Layverse features or React/Supabase. Product choices below come from the supplied Layverse brief and are implementation decisions, not quotations from the assignment.

Due: November 15 at 23:59; year 2026 and Portugal time come from the user's brief. Plan in Europe/Lisbon. Individual work. Submit on Moodle. Live demonstration: five minutes, November 16–20; book with Professor Armindo when the course link is available.

| ID | PDF requirement and location | Planned evidence | Status |
|---|---|---|---|
| A1 | Main screens, navigation, working forms, lists, errors (§1, §2) | US1–US6; real catalogue and save/read/edit demo | **Done and verified on the live app** (live journey 16/16, 2026-11-12); A1 story-ID mapping still the student's |
| A2 | Implement tables, attributes, PKs, FKs (§2) | DATABASE.md, migrations, actual Supabase tables | **Done**: six tables live on project `sgwbtgwccskqamzttczz`; see DATABASE_AS_IMPLEMENTED.md (generated from the live DB) |
| A3 | Automated main-logic and critical-flow tests; manually check every screen (§2) | TEST_PLAN.md; database regression suite; future unit/E2E results | **Partly done**: 70 unit tests, 15 DB checks, 24 simulated-API and 16 live browser checks pass (VALIDATION.md). Manual check of every screen on a real phone not done |
| A4 | Architecture/folders before prompting; SPEC from Assignment 1 stories; AGENTS/CLAUDE rules; verify changes (§2, §5) | ARCHITECTURE.md, SPEC.md, AGENTS.md, dated commits and validation log | Documents and validation log in place; **A1 story mapping unresolved (student)** |
| A5 | LLM UI review: hierarchy, contrast, spacing, consistency, accessibility, phone behavior; student compares with A1 mockups (§2) | UI_REVIEW.md evidence template, screenshots, student's comparison | **AI review of key screens done** (UI_REVIEW.md, 3 fixes); **student comparison with A1 mockups pending**; no full accessibility audit |
| A6 | Working internet address, reachable by others/apps; alternative hosting allowed (§3) | Public Vercel URL, fresh-browser and production read/write checks | **Live**: https://skystop.vercel.app, verified serving the latest commit and a full journey on 2026-11-12. Production branch setting in Vercel still points at the old work branch (kept in sync) — see DEPLOY_VERCEL.md. Check on the student's own phone/network pending |
| A7 | Moodle app link + PDF containing tables and app screenshots (§4) | Final PDF assembled from actual app, upload receipt | **Draft PDF generated** (docs/submission/SkyStop-Assignment2-DRAFT.pdf); student review, ✏️ items, upload and receipt pending |
| A8 | Five-minute live app demo, booked virtual slot (§4–5) | DEMO_AND_SUBMISSION.md, rehearsals, slot confirmation | **Script written** (DEMO_SCRIPT.md, matches the deployed app); booking and two rehearsals pending (student) |

## Minimum product scope chosen for this delivery
Two airport records, eight explicitly illustrative activities, two templates; airport discovery; future layover form; category/time filtering and detail view; empty/template plan; add/remove; time budget; secure save, refresh, retrieve and edit. No mandatory account form: anonymous authentication for save. One consistent browser session owns its plans.

## Scope cuts
No live flight search/prices, booking, payment, maps/navigation, personalized immigration decisions, business dashboards, AI-generated itineraries, social features or replacement pitch. Connection comparison is deferred until after submission; do not spend deadline time on it. Verified real facilities can replace fixtures later with sources; demo fixtures are adequate to prove database functionality.

## Source gaps and honest provenance
Assignment 1 itself and its formal stories were not supplied. SPEC stories are provisional adaptations of the project brief and HCI context, not verified Assignment 1 stories. Before submission, the student must map each to actual A1 story IDs and compare with A1 mockups. This does not block database or frontend integration work. Do not create a replacement pitch to fill this gap.

The attached brief contains instructions for a full build/deploy; the current request limits this engagement to architecture, SQL and handoff. Implementation and deployment remain Claude Code's tasks.
