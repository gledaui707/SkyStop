# Deadline, deployment and five-minute demo
All times Europe/Lisbon. Submission due Sunday November 15, 2026 at 23:59; aim to finish by 18:00. Demo November 16–20; student books the slot with Professor Armindo via course link when available.

## Release/deployment procedure
Import the existing repository into Vercel after app integration. Preserve the actual framework detected from export. For Vite, build is normally `npm run build`, output `dist`; verify against package.json. Set public Supabase environment variables for appropriate Preview/Production deployments and redeploy after changes. Configure SPA route fallback to index.html if using client-side routes; test direct /plans/:id loads and refresh. Use [Vercel Vite documentation](https://vercel.com/docs/frameworks/frontend/vite). Final submitted domain must be reachable without Vercel login/deployment protection. Do not publish secrets or privileged endpoints.

Gate: recorded passing typecheck/lint/unit/database/E2E/build; actual two-identity hosted RLS test; catalogue and save/read/edit from fresh production browser; phone layout/keyboard review; no console-breaking errors; guest limitation and demo labels visible; correct auth/CAPTCHA domains; site accessible independently of local laptop. Check production again after final deploy. Keep last known good deployment available for rollback; do not undo migrations blindly.

## Timed live script (300 seconds)
| Time | Demonstration |
|---|---|
| 0:00–0:25 | Explain Layverse briefly; open real public URL, note illustrative experiences. |
| 0:25–0:55 | Explore two database airports; select Lisbon and show activities. |
| 0:55–1:35 | Enter a future 10:00–15:00 layover, buffer90; show 210 usable minutes. |
| 1:35–2:10 | Select snack/rest template: 100 minutes; explain estimates and unknown access. |
| 2:10–2:45 | Add180-minute work activity: 280 total, -70 remaining; show warning; remove it. |
| 2:45–3:25 | Save; wait for database confirmation; refresh and show same saved plan. |
| 3:25–4:10 | Remove rest, add30-minute gift browse; save; refresh shows70 total and140 remaining. |
| 4:10–4:40 | Show phone layout and saved list; briefly explain private guest-owned PostgreSQL storage. |
| 4:40–5:00 | Summarize working scope and current limitations; stop on time. |

Use dates after the actual demo date, not fixed past data. Rehearse twice under five minutes with the actual deployed build. Preflight session, Wi-Fi, Supabase availability, browser zoom and live URL. Have a second network/browser ready; a backup recording is not a substitute because the PDF requires live mode. Do not reset the demo session's storage immediately before presenting.

## Moodle submission checklist
- [ ] Working public app link, checked independently.
- [ ] PDF: brief MVP description, table attributes/data types/PK/FK/relationships from DATABASE.md as actually implemented, real application screenshots with captions (catalogue, form, builder, warning, saved/retrieved state), concise test evidence/limitations and team research attribution.
- [ ] Screenshots from running app only; no Figma screenshots presented as implementation evidence. Remove tokens/private data.
- [ ] Verify PDF opens, legible tables and captions, all screenshots present.
- [ ] Upload PDF and app link to Moodle before deadline; verify receipt and submitted files.
- [ ] Book/confirm live slot; rehearse final production version.
Final PDF is deliberately pending the implemented app; creating fabricated screenshots now would not meet the assignment.
