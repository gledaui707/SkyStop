# Flights, accounts and profile (2026-11-14)

## Structure
Splash → onboarding (first visit) → Home. Bottom navigation unchanged: Home | Airports | My Plans. Profile opens from the icon at the top right of Home.
- **Home**: greeting, "Where's your next stop?", **My flights** (Wallet-style stack, *See all*), **Add flight** (already booked) and **Compare flights** (not booked yet), then Things to do.
- **Add flight**: booking reference (four sample references; disclosure kept) → journey overview → *Explore* (activities → builder → save) or *Save to My flights* (flight without activities). *Enter flight details manually* (optional origin and destination, connecting airport, times, buffer) joins the same flow.
- **Compare flights**: origin, destination, date → sample connection options (labelled illustrative/sample) → explore the layover.
- **My flights** (`See all`): upcoming flights in date order, then past ones; connection, dates, itinerary status; open or remove (confirmation says the itinerary goes too).
- **My Plans**: flights that have an activity itinerary.

## Flights vs itineraries
One `layovers` row = one saved flight (its connection). Its `plan_items` = the itinerary, possibly empty. Journey labels (origin, destination, booking reference, name, terminals) are now stored in `layover_details` (owner-only), so they survive a new browser or device; the older browser-only copy is used as a fallback and copied up once. A sample journey is not saved twice (the overview offers *Open in My flights*).

## Wallet stack
The nearest upcoming flight is the full boarding pass in front. Up to three others peek above it as slim strips (route, connecting airport, date); tapping one brings it to the front; *View layover* opens it. Past flights stay in *See all*. A new guest sees an empty state with *Add flight* — never a placeholder flight.

## Accounts (Supabase Auth, optional)
- Guests use the existing anonymous session; nothing is required to browse, plan or save.
- **Create account** upgrades the current guest: `updateUser({ email })` attaches an email to the same user id, so the guest's flights, plans and profile stay with it once the emailed link is confirmed.
- **Sign in** sends a sign-in link to an existing account. It *switches* to that account; flights saved as a guest in this browser are **not merged** (the UI says so before sending).
- **Sign out** ends the session; the next save starts a new guest.
- Auth config changed (2026-11-14): site URL `https://skystop.vercel.app` and redirect allow-list (production + local preview), so email links return to the app.

### Verification status
- Verified against the simulated backend (browser tests): upgrade keeps the same id and flights; another device with that account sees the same flights with their routes; sign-out shows no flights; sign-in link requested.
- **Not verified with real email delivery.** The project uses Supabase's built-in email sender (about 2 emails/hour, and in our understanding only to the project's team members). For other people to create accounts, a custom SMTP provider must be configured in Supabase (Authentication → SMTP). Until then, guest mode is the reliable path.

## Profile
Account (guest / pending / signed in, create account, sign in, sign out); **Travel documents**: optional passport nationality and country of residence, stored owner-only in `traveler_profiles` and used only to prefill the entry-check panel on landside activities — never an eligibility decision; no passport numbers or photos. **Settings**: replay the introduction (does not touch saved data), short app information.
