# Onboarding: slides, then a conversation that builds your trip

First run: **Splash (unchanged) → three intro slides → conversation → Home** (with the imported flight saved).
Skip (slides or conversation) still leads to Account Access, which stays available from Profile.
Code: `src/features/onboarding/IntroSlides.tsx`, `Onboarding.tsx` (+ `onboarding.css`), `completeOnboarding` in
`src/store.tsx`, `src/data/interests.ts`.

## The conversation
One cancellable timeline; SkyStop's line streams in at the top (thinking pulse first, previous line lifts away), the
visual for the current state fills the middle, answers collect as chips under the header. No Next buttons except the
confirm for multi-select interests.

| State | SkyStop | Visual | Visitor |
|---|---|---|---|
| askBooked | "Already have a flight booked?" | choice pills | Yes, I'm booked / Not yet |
| findFlight | "Let's find your flight." | booking card: 6 slots, Find my flight, Try a sample booking (AXR7KD, BQ3LMV, CJ8NWT, DH5PRZ), Enter flight details manually | types or picks a reference |
| lookup | | slots bounce, a plane crosses (≈0.65 s) | |
| journey | "Found your journey!" · "You're flying from {origin} to {destination}, with a stop in {connection}." | journey card draws itself: origin → coral connection → destination, then the trip timeline (depart, arrive, connection in coral counting up, depart, arrive; airport-local times and dates) | |
| airport | "You'll have {connection} at {airport}." · "You've got time to explore {airport}." | airport photo, name and code, route chip; connection − planning buffer = time to explore (budget(), counting) | |
| notYet | "You can explore your options before booking." | compare-by-layover bars, the four guide airports | |
| interests | "What would you like to do during your layover?" | Dining, Shopping, Relaxation, Attractions photo cards (multi-select) | picks, "That's it", or "Not sure yet" |
| closing → finishing | "Perfect. Let's find something worth your time." | SS transition | |

The lookup is the app's own `findSampleJourney` (nothing else resolves). Wrong references get an inline error with the
samples and manual entry. Manual entry ends the conversation and opens the existing manual flight form after the guest
session starts.

## Finishing: completeOnboarding()
1. Guest session: `ensureGuestSession` (reuses any session, signed-in accounts included; never a second anonymous user).
2. Flight: `journeyDraft(booking)` saved through `savePlan` → `saveDraft` → `save_plan` RPC and `layover_details`, the same
   path as Add flight. One client id per onboarding, so a retried save is the same row; a booking already saved by this
   visitor (same reference, airport and arrival) is reused, not saved again. No activities are added.
3. Interests: kept in this browser (`skystop.interests.v1`); they only order discovery.
4. Home opens; the SS loader covers the work and fades out. Any failure stops it and shows "Your flight isn't saved yet."
   (or "SkyStop couldn't start.") with Try again.

## After onboarding
- Home card: journey codes on top; a strip for the transit airport: **Arrive SIN · Connection · Depart SIN** (airport-local,
  dates, +1 when the departure is on a later day); Time to explore with "{connection} connection − {buffer} buffer".
  The CTA stays **View layover**.
- Layover details with no activities: "No activities planned yet" · "Discover what you can do during your layover." ·
  **Explore activities** → airport discovery for that saved flight (adding activities and saving updates the same flight).
- Discovery: with interests, activities come first and in interest order ("Dining and Attractions first, from your
  interests"), before curated itineraries. Nothing is selected for the visitor; My Plans lists only saved itineraries.

## Tests
`tests/e2e/journey.mjs` §4b: the full 27-step scenario (booking, lookup, journey, airport, interests, saved flight, Home
card, View layover, empty state, Explore activities, interest order, add and save, refresh, replay without duplicates),
plus invalid reference, Not yet, manual entry, guest-session error, save failure and retry, overnight connection (DXB),
reduced motion, returning visitors.

## Limitations
Interests are stored per browser, not in the account. Only the four sample references resolve. The reference recording
mentioned in earlier briefs never arrived.
