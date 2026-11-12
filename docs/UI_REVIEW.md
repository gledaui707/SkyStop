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
| 7 | Over-budget builder | The warning is a persistent card with an icon and text (not colour alone) and the save button changes to "Save anyway" | Positive | — | Screenshot 06a |

HCI-derived checks from the historical team findings, observed in the running app: airports shown with full name and code (LIS · Portugal; "Lisbon Airport"); back navigation present on each pushed screen; dates and times explicit, airport-local, with a next-day label in the builder; plan is central and editable; empty states ("No saved plans yet"), loading ("Loading SkyStop…", "Loading your plans…") and error states with retry are present; illustrative data is labelled.

## UX refinement pass — 2026-11-12 (build `97e2972`), from the independent UX audit
Scope: journey continuity (setup → discovery → builder → save → retrieve/edit) and layout at 320/375/390 px. No visual redesign.

| # | Area | Problem | Change | Verified by |
|---|---|---|---|---|
| 8 | Setup | Two numbered steps, origin/destination required first, tip cards | One "Plan a layover" screen: connecting airport, airport-local arrival/departure and planning buffer first; origin/destination optional under "Journey details"; short explanations instead of tips | e2e checks 1–7 |
| 9 | Setup, 320 px | Date/time inputs had a large intrinsic width and pushed the page sideways; buffer buttons, breakdown and tab bar were cut off (pre-existing in the export) | Inputs and fields may shrink (`min-w-0`) | e2e 320 px checks; screenshot |
| 10 | Setup | Times validated in the browser's zone (wrong when the browser is in another zone than the airport) | Shared domain validation in the airport's zone; durations via `layoverMinutesAt` | unit tests (DST night, browser-zone independence); live read-only overnight check |
| 11 | Continuity | Selecting an activity before entering times only opened the form and lost the selection; chosen itinerary not named | Selections kept per airport and shown in setup ("N activities selected"); itinerary named ("Itinerary: …"); "Customize itinerary" → "Use this itinerary" | e2e explore-first and itinerary-first |
| 12 | Discovery | Map opened first; category filter reset when switching views | List first; Map behind the List/Map toggle; shared filter; selection and time budget kept across views | e2e List↔Map checks; live read-only check |
| 13 | Map, short phones | Bottom sheet covered markers (at 320×568 the whole map) | Map keeps a free band above the sheet and has a minimum height; the page scrolls on short phones | marker/sheet geometry at 320/375/390 (no hidden labels) |
| 14 | Builder | Save action, error notice and tab bar could cover the end of the timeline; activity rows showed clock times starting at landing | One save bar showing time left/over and saved state; bottom padding covers both bars; error notice moved into the page; rows show "N. X of Y used"; arrival row says to allow time to leave the aircraft first; buffer explained | e2e: last content ends above the bars, no sideways scroll, no clipped or overflowing bar text at 320/375/390 |
| 15 | Save states | "Plan saved" shown on Home only implicitly; edits not distinguished | Home shows a one-off confirmation; edits show "unsaved changes" → "Save changes" → "All changes saved" | e2e |

Still open: map marker labels at the left column touch the screen edge at 320 px (visible, not clipped); on very short phones the map's sheet is reached by scrolling; desktop widths, keyboard-only use, Safari and measured contrast not checked in this pass.

## Student comparison with Assignment 1 mockups — PENDING (student)
The A1 mockups have not been identified in this repository. `design-references/` contains three images uploaded by the student; they look like third-party style/inspiration shots (travel and daily-words app UI), not SkyStop mockups, so **no comparison is claimed**. Do not reuse those images in the submission without their licences. ✏️ Student: compare the running app with your A1 mockups screen by screen and record differences here.
