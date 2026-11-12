# UI review evidence
Assignment 2 §2 requires an AI review AND the student's own comparison against Assignment 1 mockups.

## AI review of the running app — 2026-11-12 (Claude Code, from phone-sized screenshots of the deployed app)
Method: the complete journey was run in a real Chromium (iPhone 13 viewport, 390×664) against https://skystop.vercel.app; screenshots are in `docs/screenshots/` (11 files) and were inspected. Screens inspected: welcome, trip details (step 2), airport map, airport list, builder (normal and over-budget), Home with the upcoming-trip ticket, plan detail, My Plans. **Not inspected:** trip step 1 in detail, the edit screen, the flight-comparison screens, desktop widths, Safari, keyboard navigation, measured colour contrast, 200% zoom, screen-reader behaviour. This is not a full accessibility audit.

| # | Screen / viewport | Finding | Severity | Fix / commit | Recheck |
|---|---|---|---|---|---|
| 1 | Airport map, 390 px | Three airside markers were placed on one row; their name labels collided ("Demo exte…", "Demo quiet rest", "Portugue…" overlapped) | Medium (unreadable, hard to tap) | New per-zone layout `src/data/mapLayout.ts`, commit `95762ae` | Screenshot 04 after fix; geometry unit tests at 200/300/450 px map height |
| 2 | Airport map, short phone (664 px, tip card open) | Top row of markers slid under the category chips (percentage-based reserved area), so markers could not be tapped | Medium | Controls area reserved in fixed units (`MAP_TOP_REM`), commit `0302e94` | Screenshots of Lisbon and Singapore maps after fix |
| 3 | Airport map | Right-hand marker labels partly ran under the layers/reset buttons | Low | Columns moved (22 % / 69 % / 45.5 %), commit `0302e94` | Screenshot after fix: only the ellipsis of a long label touches the button |
| 4 | Airport map, Singapore, short phone | The landside marker sits at the bottom edge and its label can be hidden behind the bottom sheet | Low | **Open** (marker remains visible and tappable; the activity is also listed in the sheet and the List view) | — |
| 5 | Home / list screens | Fixed action bar and tab bar cover the bottom of scrolling content | None | By design; pages have bottom padding so everything can be scrolled into view | Observed in screenshots 05–07 |
| 6 | All screens with photos | Photos are external (Unsplash). If blocked, image areas stay dark but all controls and text remain usable (images hide on error) | Low | No change | Observed in an environment without access to the image host |
| 7 | Over-budget builder | The warning is a persistent card with an icon and text (not colour alone) and the primary button changes to "Save plan anyway" | Positive | — | Screenshot 06a |

HCI-derived checks from the historical team findings, observed in the running app: airports shown with full name and code (LIS · Portugal; "Lisbon Airport"); back navigation present on each pushed screen; dates and times explicit, airport-local, with a next-day label in the builder; plan is central and editable; empty states ("No saved plans yet"), loading ("Loading SkyStop…", "Loading your plans…") and error states with retry are present; illustrative data is labelled.

## Student comparison with Assignment 1 mockups — PENDING (student)
The A1 mockups have not been identified in this repository. `design-references/` contains three images uploaded by the student; they look like third-party style/inspiration shots (travel and daily-words app UI), not SkyStop mockups, so **no comparison is claimed**. Do not reuse those images in the submission without their licences. ✏️ Student: compare the running app with your A1 mockups screen by screen and record differences here.
