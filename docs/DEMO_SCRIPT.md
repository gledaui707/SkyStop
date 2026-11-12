# Five-minute live demo script (matches the app as deployed)
Public app: **https://skystop.vercel.app** (production, Vercel; data in Supabase project `sgwbtgwccskqamzttczz`).
Numbers are the ones the app shows for these inputs. Use dates **after the demo date**, never fixed past dates.

## Before you present (2 minutes)
1. Open the URL in a **private/incognito window on your phone** (a new window = a new anonymous guest, so you get the first-visit welcome and an empty "My Plans"). Do not reset browser data right before presenting.
2. Confirm the first screen loads (welcome with **Plan a layover**). If it shows **"We could not load the airports"**, tap **Try again**; if it persists, check Supabase project health and use the second network.
3. Have the second browser/network ready. Zoom 100%. Wi-Fi checked.
4. Optional: Supabase dashboard open on the `layovers` / `plan_items` tables to show the saved rows (owner = the anonymous guest's id).

## Timed script (300 seconds)
| Time | Do | Say / point out | Expect on screen |
|---|---|---|---|
| 0:00–0:20 | Open the URL; welcome screen | "SkyStop turns a layover into usable time. Activities are illustrative demo data, not travel advice." | "More than a connection." / **Plan a layover** |
| 0:20–1:05 | **Plan a layover** → tap **Lisbon LIS** → arrival **10:00**, departure **15:00** (a future date) → buffer **1h 30m** → open **Journey details (optional)**: From **CGK**, Final destination **CDG** | "One screen: the connection is what matters. Times are airport-local; the buffer keeps time free for airport procedures." | Breakdown **Total 5h − planning buffer 1h 30m = Usable 3h 30m**; journey line **CGK → LIS → CDG** |
| 1:05–1:40 | **Explore activities** → the airport opens in **List**; tap **Map**, then **List** again | "Airports, activities and itineraries come from PostgreSQL. The map is a zone schematic, not navigation." | List: "checked against your 3h 30m usable time", curated itinerary **Demo snack and rest**, "**Fits with 1h 50m to spare**" |
| 1:40–2:30 | In the list tap **+** on **Demo Portuguese snack break**, **Demo quiet rest** and **Demo extended work break** (3 h) → **Build itinerary (3)** | "Remaining time is recalculated immediately." | **Over your usable time by 1h 10m**, "This plan does not fit"; save bar **1h 10m over · unsaved**, button **Save anyway** (100 + 180 = 280 min against 210) |
| 2:30–2:45 | **Remove** the work break (trash icon) | "Activities show how much usable time they use, not clock times from landing." | **1h 50m** remaining; rows "1. 40m of 3h 30m used", "2. 1h 40m of 3h 30m used" |
| 2:45–3:30 | **Save plan** | "Saved to PostgreSQL through one atomic server function; success is shown only after the server confirms." | Home: green confirmation **"Lisbon layover" is saved…** and the **Next connection** ticket (CGK → LIS → CDG, 10:00 / 15:00, usable 3h 30m, 2 activities) |
| 3:30–3:50 | **Refresh the page** | "Nothing is kept in the page: it is read back from the database for this guest." | Same ticket (the one-off confirmation is gone) |
| 3:50–4:35 | **View layover** → **Edit plan** → remove **Demo Portuguese snack break** → **Save changes** → **My plans** | "Editing is explicit: 'unsaved changes' until the server confirms." | Bar **2h 30m left · unsaved changes** → **All changes saved**; My Plans "**1 activity · 2h 30m left**" |
| 4:35–5:00 | Close on My Plans (guest note); optionally the Supabase rows | "Plans belong to this browser's guest session; other guests cannot read them (row-level security). Flight comparison is illustrative." | "Plans are saved to a guest session in this browser…" |

Alternative opening if you prefer to explore first: **Airports → Lisbon Airport → Select** a couple of activities (or **Use this itinerary**) → **Set layover times** — the airport and your selection (or the itinerary's name) are carried into the setup form.

Verification status of this script (2026-11-12, build `97e2972`): the whole flow passes against a simulated API (`npm run test:e2e`, 41 checks); on the live site everything up to the save was checked read-only (no records created). The live save/refresh/edit part last ran on the previous build. Rehearse once on the live site before the demo.

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
