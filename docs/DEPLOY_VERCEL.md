# Deploying SkyStop to Vercel
Status 2026-11-12: **not deployed.** The build environment has no Vercel account access (no token; vercel.com is not reachable from it), so no public URL exists yet and none is claimed.

## Steps (about 3 minutes, in a browser)
1. Go to https://vercel.com/new and sign in with the GitHub account that owns `gledaui707/SkyStop`.
2. Import the `SkyStop` repository.
3. Leave everything on the defaults — Vercel detects **Vite** (build `npm run build`, output `dist`). No environment variables are needed: the public Supabase URL and publishable key are built in (`src/api/client.ts`); `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` override them if ever needed.
4. Before pressing Deploy, or afterwards under Settings → Git → Production Branch, choose branch `claude/tender-keller-cxp9ac` (or merge it into `main` first).
5. Open the URL Vercel shows on your phone.

## Check on the deployed URL
1. Welcome → **Add my flight** → pick two airports → Continue → choose **Lisbon LIS** → enter future arrival/departure → **See what I can do**.
2. Switch to **List**, add two activities, **Build itinerary**, **Save plan** → you land on Home with the "Next connection" card.
3. Refresh the page → the card is still there. **View layover → Edit plan** → remove an activity → **Save plan** → refresh → **My Plans** shows the change.
If step 1 shows "We could not load the airports", the Supabase API is not answering — see the known issue in docs/VALIDATION.md (2026-11-12, API outage).
