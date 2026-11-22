# SkyStop — Smart Layover Planner
More than a connection.

React + Vite app (Figma Make frontend) backed by Supabase (PostgreSQL, anonymous guest sessions). **Live: https://skystop.vercel.app** (Vercel deploys `main`). Five-minute demo: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

Run locally: `npm install`, `npm run dev`. Checks: `npm run typecheck`, `npx vitest run`, `npm run build`, `npm run test:e2e` (browser journey against a simulated API), `npm run test:layout` (320–430 px layout audit), `npm ci --prefix tests/database && npm test --prefix tests/database` (SQL/RLS regression). Results: [docs/VALIDATION.md](docs/VALIDATION.md). How the frontend is wired: [docs/FRONTEND_INTEGRATION.md](docs/FRONTEND_INTEGRATION.md).

Start with [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md), [SPEC.md](SPEC.md) and [AGENTS.md](AGENTS.md).

- [Assignment checklist](docs/REQUIREMENTS.md)
- [Architecture and folders](docs/ARCHITECTURE.md)
- [Database dictionary and access rules](docs/DATABASE.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Test plan](docs/TEST_PLAN.md) and [actual validation](docs/VALIDATION.md)
- [Demo and submission](docs/DEMO_AND_SUBMISSION.md)
- [Source provenance](docs/SOURCES_AND_DECISIONS.md) and [UI review record](docs/UI_REVIEW.md)
- [Implementation status](IMPLEMENTATION_CHECKLIST.md)

Database regression checks: `npm ci --prefix tests/database && npm test --prefix tests/database`.

Figma Make supplies the React frontend; Claude Code integrates it with real PostgreSQL data. No replacement frontend or replacement pitch is included. All seeded activities are clearly illustrative. Historical HCI team research is credited separately from this individual implementation.
