# Layverse — Smart Layover Planner
More than a connection.

Architecture and implementation handoff for Assignment 2 MVP. Deadline: November 15, 2026, 23:59 Europe/Lisbon. This repository currently contains preparation and SQL foundations, not a deployed application.

Start with [CLAUDE_HANDOFF.md](CLAUDE_HANDOFF.md), [SPEC.md](SPEC.md) and [AGENTS.md](AGENTS.md).

- [Assignment checklist](docs/REQUIREMENTS.md)
- [Architecture and proposed folders](docs/ARCHITECTURE.md)
- [Database dictionary and access rules](docs/DATABASE.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Test plan](docs/TEST_PLAN.md) and [actual validation](docs/VALIDATION.md)
- [Demo and submission](docs/DEMO_AND_SUBMISSION.md)
- [Source provenance](docs/SOURCES_AND_DECISIONS.md) and [UI review record](docs/UI_REVIEW.md)
- [Implementation status](IMPLEMENTATION_CHECKLIST.md)

Database regression checks: `npm ci --prefix tests/database && npm test --prefix tests/database`.

Figma Make supplies the React frontend; Claude Code integrates it with real PostgreSQL data. No replacement frontend or replacement pitch is included. All seeded activities are clearly illustrative. Historical HCI team research is credited separately from this individual implementation.
