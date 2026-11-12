# Five-minute live demo script (matches the app as deployed)
Public app: **https://skystop.vercel.app** (production, Vercel; data in Supabase project `sgwbtgwccskqamzttczz`).
The journey below was run end to end against the live site on 2026-11-12 (`npm run test:live`, 16/16 checks, screenshots in `docs/screenshots/`). Numbers are the ones the app showed. Use dates **after the demo date**, never fixed past dates.

## Before you present (2 minutes)
1. Open the URL in a **private/incognito window on your phone** (a new window = a new anonymous guest, so you get the first-visit welcome and an empty "My Plans"). Do not reset browser data right before presenting.
2. Confirm the first screen loads (welcome with "Add my flight"). If it shows **"We could not load the airports"**, tap **Try again**; if it persists, check Supabase project health and use the second network.
3. Have the second browser/network ready. Zoom 100%. Wi-Fi checked.
4. Optional: Supabase dashboard open on the `layovers` / `plan_items` tables to show the saved rows (owner = the anonymous guest's id).

## Timed script (300 seconds)
| Time | Do | Say / point out | Expect on screen |
|---|---|---|---|
| 0:00–0:20 | Open the URL; welcome screen | "SkyStop turns a layover into usable time. Activities are illustrative demo data, not travel advice." | "More than a connection." / **Add my flight** |
| 0:20–1:05 | **Add my flight** → From **CGK**, To **CDG** → **Continue** → tap **Lisbon LIS** → arrival **10:00**, departure **15:00** (a future date) → buffer **1h 30m** | "Times are airport-local; the buffer reserves time for the airport process." | Breakdown: **Total 5h − buffer 1h 30m = Usable 3h 30m** |
| 1:05–1:40 | **See what I can do** → map view, then tap **List** | "Airports and activities come from the PostgreSQL database. The map is a schematic, not real coordinates." | Map with airside/to-be-confirmed zones; list shows curated itinerary **Demo snack and rest**, "**Fits with 1h 50m to spare**" |
| 1:40–2:30 | In the list tap **+** on **Demo Portuguese snack break**, **Demo quiet rest** and **Demo extended work break** (3 h) → **Build itinerary (3)** | "Remaining time is recalculated immediately." | **Over your usable time by 1h 10m**, "This plan does not fit", button **Save plan anyway** (100 min + 180 min = 280 min against 210 usable) |
| 2:30–2:45 | **Remove** the work break (trash icon on its row) | "Over-budget plans may be saved, but we warn clearly." | **Usable time remaining 1h 50m**; planned 1h 40m |
| 2:45–3:30 | **Save plan** | "Saved to PostgreSQL through one atomic server function; success is shown only after the server confirms." | Lands on Home with the **Next connection** ticket: CGK → LIS → CDG, 10:00 / 15:00, **Usable 3h 30m**, "2 activities saved" |
| 3:30–3:50 | **Refresh the page** | "Nothing is stored in the page: this is read back from the database for this guest." | The same ticket is still there |
| 3:50–4:35 | **View layover** → **Edit plan** → remove **Demo Portuguese snack break** → **Save plan** → **My Plans** (refresh once if time allows) | "Edit and save again; revision increases on the server." | Builder shows **2h 30m** remaining; **Plan saved**; My Plans: "**1 activity · 2h 30m left**" |
| 4:35–5:00 | Close: show the guest note on My Plans; optionally the Supabase rows | "Plans belong to this browser's guest session; other guests cannot read them (row-level security). Flight comparison is illustrative. Not included: bookings, live flight data." | "Plans are saved to a guest session in this browser…" |

## If something goes wrong
- **Catalogue error screen:** Try again; second network. Do not claim data loaded.
- **Save error ("Plan not saved"):** the draft is kept; tap **Try again**. Mention that failures never show as success.
- **Past date:** the form rejects arrival in the past for new plans; pick a future date.
- Do **not** repeat the same save from two tabs during the demo (revision-conflict handling is not part of the demo; see docs/VALIDATION.md known issue).

## Rehearsal log (fill in)
| # | Date | Build/commit | Duration | Problems |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
