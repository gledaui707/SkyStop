# Wiring the Figma Make export to the working backend
Status 2026-11-12: the Figma Make React source has **not** been obtained (figma.com is unreachable from the build environment, no Figma connector is attached, and no export is in GitHub). No UI has been rebuilt. Everything below the screens is implemented and tested, so integration is mostly binding existing components to these functions.

## How to get the source into the repo (any one)
1. Figma Make → **Download code** (zip) → upload/commit it to this repo under `figma-export/` on any branch.
2. Figma Make → **Publish to GitHub** / GitHub sync → pick `gledaui707/SkyStop` (new branch) or a new repo.
3. Connect the Figma connector at claude.ai → Customize → Connectors, then start a new session.

## Integration steps (once the export exists)
1. Keep the export's `package.json`/lockfile and Vite config as the single app. Copy in `src/domain`, `src/data`, `src/features`, `src/types`; add dependencies `@supabase/supabase-js`, `temporal-polyfill`; dev: `vitest`. Add scripts `test`, `typecheck`, `test:hosted`.
2. `.env` / Vercel env: `VITE_SUPABASE_URL=https://rdrkskrzdyqezzopnena.supabase.co`, `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>`. Never a service-role key.
3. Create one repo and one store at app start:
   ```ts
   const repo = createRepo(getSupabase());
   export const planner = createPlannerStore({ repo });
   const state = useSyncExternalStore(planner.subscribe, planner.getState);
   ```
4. Replace the export's mock data/persistence with the calls below; delete fixture success toasts.

## Screen → function map
| Screen / element (Figma) | Call | Notes |
|---|---|---|
| Home: airport list | `loadResource(repo.listAirports)` | render loading / empty / error+retry |
| Home: "upcoming trip" card | `getUpcomingTrip(await repo.listPlans(), airports, new Date())` | render the personalised card **only** when non-null; otherwise the generic hero/CTA |
| Add flight / connection details form | `planner.startNew(airport)`, `planner.updateForm({...})` | field errors in `state.times.errors` (`arrival`, `departure`, `buffer`, `duration`); times are airport-local; `state.times.value.nextDay` for the +1 day label |
| View trip summary | `state.times.value.totalMinutes / usableMinutes`, `state.budget` | `noUsableTime` → warning; `budget.overBudget` → persistent warning (saving is still allowed) |
| Explore activities (list) | `state.catalogue` + `filterActivities` from `src/domain` | statuses `loading / ready / empty / error`; `planner.retryCatalogue()` |
| Map view | same `state.catalogue.data.activities` | database has no coordinates: keep the export's illustrative positions keyed by activity id |
| Curated itineraries | `state.catalogue.data.templates`, `planner.applyTemplate(id)` | copies; templates are never modified |
| Add / remove activity | `planner.addActivity(id)`, `planner.removeActivity(id)`, `planner.isInPlan(id)` | remaining time updates in `state.budget` immediately |
| Save button | `planner.save()` | disable while `state.save.status === 'saving'`; show success only on `'saved'`; on `'error'` show `state.save.error`, keep the draft |
| My trips list | `loadResource(repo.listPlans)` | empty state for a new guest |
| Open / edit saved trip (`/plans/:id`) | `planner.openPlan(id)` | `state.plan.status`: `loading / ready / empty (not found) / error`; `state.pastPlan` → past-trip notice |
| Flight comparison | none — stays illustrative frontend data | label it as illustrative |

Guest sign-in is automatic: `listPlans`, `getPlan` and `savePlan` call `ensureGuestSession` (one anonymous identity per browser, kept in browser storage). Tell the user a guest's trips live only in this browser.

## Known limitation (accepted for the demo)
Saves that hit a revision conflict (same plan edited from two tabs, or re-submitting an already-created plan) get no response from the hosted API. The happy path is unaffected. The store ignores a second `save()` while one is in flight; keep the button disabled during saving. See docs/VALIDATION.md.
