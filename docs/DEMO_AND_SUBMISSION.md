# Deadline, deployment and five-minute demo
All times Europe/Lisbon. Submission due Sunday November 15, 2026 at 23:59; aim to finish by 18:00. Demo November 16–20; student books the slot with Professor Armindo via course link when available.

## Release/deployment procedure
The app is deployed at https://skystop.vercel.app (see DEPLOY_VERCEL.md). Preserve the actual framework detected from export. For Vite, build is normally `npm run build`, output `dist`; verify against package.json. Set public Supabase environment variables for appropriate Preview/Production deployments and redeploy after changes. Configure SPA route fallback to index.html if using client-side routes; test direct /plans/:id loads and refresh. Use [Vercel Vite documentation](https://vercel.com/docs/frameworks/frontend/vite). Final submitted domain must be reachable without Vercel login/deployment protection. Do not publish secrets or privileged endpoints.

Gate: recorded passing typecheck/lint/unit/database/E2E/build; actual two-identity hosted RLS test; catalogue and save/read/edit from fresh production browser; phone layout/keyboard review; no console-breaking errors; guest limitation and demo labels visible; correct auth/CAPTCHA domains; site accessible independently of local laptop. Check production again after final deploy. Keep last known good deployment available for rollback; do not undo migrations blindly.

## Timed live script (300 seconds)
See **[DEMO_SCRIPT.md](DEMO_SCRIPT.md)** — written against the deployed app, with expected on-screen numbers and a rehearsal log.

## Moodle submission checklist
- [ ] Working public app link, checked independently.
- [ ] PDF: brief MVP description, table attributes/data types/PK/FK/relationships from DATABASE.md as actually implemented, real application screenshots with captions (catalogue, form, builder, warning, saved/retrieved state), concise test evidence/limitations and team research attribution.
- [ ] Screenshots from running app only; no Figma screenshots presented as implementation evidence. Remove tokens/private data.
- [ ] Verify PDF opens, legible tables and captions, all screenshots present.
- [ ] Upload PDF and app link to Moodle before deadline; verify receipt and submitted files.
- [ ] Book/confirm live slot; rehearse final production version.
Final PDF is deliberately pending the implemented app; creating fabricated screenshots now would not meet the assignment.
