# How the Figma Make frontend is wired to Supabase
The UI is the Figma Make export (`figma-export/` holds the untouched baseline; `diff -r figma-export/src src` shows every change). Screens, components and styling are unchanged except where data had to become real.

| Concern | Before (export) | Now |
|---|---|---|
| Airports, activities, curated itineraries | hard-coded in `src/data/mock.ts` | loaded from Supabase at start-up by `src/data/catalogue.ts`; app shows loading / error+retry until ready |
| Saved plans | `localStorage` | Supabase `layovers` + `plan_items` through the `save_plan` RPC (`src/data/plans.ts`, `src/api/`) |
| Guest identity | none | Supabase anonymous sign-in, created on the first save (not on page open) and kept in browser storage |
| Home "Next connection" card | from localStorage plans | only when this guest has a not-yet-departed plan in the database |
| Save button | instant fake success | disabled while saving; "Plan saved" only after the server confirms and the plan is read back; error notice keeps the draft |
| Times | browser-local | entered as airport-local, converted to UTC with the airport's time zone (`src/domain`) |
| Activity prices | invented USD amounts | the database's budget wording ("Low cost (illustrative)", "Cost not verified") |
| Delete plan | button | removed: the database deliberately has no delete path |
| Flight comparison, map positions, photos | illustrative | unchanged, still illustrative frontend data (database has no flights, coordinates or images) |
| Plan name, origin/destination labels | localStorage | still per-browser labels (`skystop.planmeta.v1`): the schema has no columns for them. Times, airport, buffer and activities always come from the database |

Not used by the UI: `src/features/planner/store.ts` (headless store written before the export was available; kept with its tests, used by the hosted journey test).

## Tests
`npm test -- --run` (unit, 55) · `npm run build && npm run test:e2e` (browser journey, 23 checks, against a simulated Supabase API — needs Playwright available) · `npm run test:hosted` (real database; manual only).
