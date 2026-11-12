# Layverse MVP specification
Status: implementation-ready plan; application not yet implemented. Deadline: 2026-11-15 23:59 Europe/Lisbon. Read docs/REQUIREMENTS.md for assessment mapping and unresolved Assignment 1 provenance.

## Stories and acceptance criteria
These are provisional product stories from the supplied brief; confirm actual A1 IDs before submission.

| Story | Acceptance criteria | Tests |
|---|---|---|
| US1: As a traveler, explore airports and experiences | Home lists airports from PostgreSQL; selecting LIS/SIN loads only that airport's activities and templates. Show full name plus code, demo banner and meaningful empty/error/retry states. | E1, M1 |
| US2: Enter a future layover | Airport-local arrival AND departure dates/times plus integer buffer. Reject missing/invalid, past new arrival, reversed/equal dates and >48h duration. Display zone and next-day label. | U1–U6, E2 |
| US3: Find suitable activities | Category and optional fits-time filter; details show duration, budget, terminal and access/unknown. Each illustrative record visibly labeled. Clear filters restores list. | U7, M2 |
| US4: Start a plan | Empty plan or copy ordered template activities. Show template total and fits/exceeds usable time. Copy never changes template. | U8, E1 |
| US5: Customize a plan | Add once, remove, preserve order, up to 20 distinct activities from one airport; recalculate total and remaining time immediately. Over-budget drafts may be saved with persistent warning. | U9, E2 |
| US6: Save, reopen, edit | Guest session established once; single atomic save to PostgreSQL; confirmed success only after server response and re-fetch. Reload URL/list retrieves same plan and ordered items. Edit/save increments revision. Other users cannot access it. | DB suite, E1–E4 |

## Screen/route contract (adapt component names to Figma export)
`/`: airport selection + My plans link. `/airports/:airportId`: catalogue/details/templates and plan CTA. `/plan/new?airport=LIS`: form and builder. `/plans`: this guest's saved plans. `/plans/:id`: read/edit builder. Detail view can be an accessible modal, not another route. Unknown route shows a working home link. Back navigation preserves the in-memory unsaved draft; warn before discarding it or changing airport. Saved plan airport is immutable: create a new plan for another airport.

## Deterministic time contract
Both entered timestamps are local to the connecting airport, independent of browser time zone. Use a maintained IANA-aware library (Temporal polyfill preferred), converting local date/time plus airport.timezone to UTC instants. Reject nonexistent or ambiguous DST local times (`disambiguation: 'reject'`) with an actionable choose-another-time message; never silently shift them. Persist ISO instants with offset/Z as timestamptz, display via airport zone. Require whole-minute inputs. Compare new arrival with current clock; historical saved plans stay readable/editable and get a past-plan notice.

`totalMinutes = (departureInstant - arrivalInstant) / 60000`
`usableMinutes = max(0, totalMinutes - bufferMinutes)`
`activityMinutes = sum(selected duration snapshots)`
`remainingMinutes = usableMinutes - activityMinutes`
`overBudget = remainingMinutes < 0`

Default buffer 90 minutes is an adjustable demo estimate, not an airport minimum connection rule. Range 0–1440. The buffer represents ALL unmodelled airport procedures/walking/return time; do not add a second implicit travel allowance. If buffer >= total, show no usable time even for an empty plan. Fit means time estimate only, never access/visa eligibility. Template durations come from catalogue records; saved item durations are database snapshots. Catalogue stays frozen during the demo.

## State and error contract
Every database view: loading, populated, empty, error+retry. Save: idle/dirty/saving/saved/error/conflict. Disable duplicate saves. On failure retain draft and don't show success. On ambiguous network timeout, fetch the same client-generated UUID before deciding whether retry is safe; if server differs, offer reload/review without overwriting. New save expected revision 0; edit uses loaded revision. On conflict preserve draft, ask user to reload server copy, then explicitly reapply changes. Never auto-retry stale writes. Missing/other-owner plan uses the same unavailable message.

## Persistence and privacy
Supabase anonymous auth creates a real user UUID; publishable key alone is not ownership. Retain the Supabase session in browser storage; plan data stays in PostgreSQL. Guest plans are recoverable only in that browser/session; clearing storage/signing out loses access. Tell user before saving. No passport numbers, identity documents or payment details. No localStorage plan fallback masquerading as database persistence.

## Completion gate
All A1–A8 evidence in REQUIREMENTS, passing meaningful tests, no release-blocking bugs, live production save/reload/edit, mobile review, actual submission PDF and five-minute rehearsal. This documentation package alone does not satisfy the assignment.
