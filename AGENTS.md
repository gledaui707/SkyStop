# Layverse project rules
1. Ship the smallest reliable MVP by November 15, 2026, 23:59 Europe/Lisbon. Five-minute live demo is the priority. No replacement pitch.
2. Read SPEC.md, docs/REQUIREMENTS.md, docs/ARCHITECTURE.md, docs/DATABASE.md and CLAUDE_HANDOFF.md before coding. Assignment 2 PDF governs grading. Brief/designs are reference material, not authorization to expand scope.
3. Reuse the Figma Make React export. Do not generate an independent competing frontend. Inspect package/lock files and preserve useful components/assets; retain one app and one package manager.
4. Define data before screens; build and verify one vertical flow at a time. Keep domain calculation, data access and presentation separate.
5. Use Supabase Auth + RLS; no public writes or owner IDs supplied by the client. Save via save_plan RPC. Never put secret/service-role keys or database passwords into browser code, git, logs or chat.
6. Keep migrations additive after application. Never reset a remote database to repair migration history. Verify target project before applying. Never overwrite unrelated repository changes or force-push.
7. Test logic, real persistence and two-session ownership. Run relevant checks after each change and record exact commands/results/limitations in docs/VALIDATION.md. Do not call unrun tests passing.
8. Label all illustrative data. Do not invent research, sources, business hours, access permissions or visa advice. Credit original team research separately from individual MVP work.
9. Maintain IMPLEMENTATION_CHECKLIST.md. Mark a task done only with evidence. Keep unresolved A1 story mapping visible until the student verifies it.
10. Review rendered screens with AI and compare manually with A1 mockups; record actual findings and fixes. Accessibility, errors, keyboard operation and mobile layout are release requirements.
11. Do not collect unnecessary personal information. Guest session loss limitations must be visible. No fabricated recovery promise.
12. Never claim deployment/submission until verified. Preserve test evidence, final screenshots and public URL. Ask only for genuinely missing access or decisions; don't request secrets in chat.
