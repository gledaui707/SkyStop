# Onboarding: interactive, booking-first

First run: **Splash (unchanged SVG, 1.5 s) → Onboarding → Account Access (optional) → planning or Home.** Returning
visitors see neither again (`skystop.onboarded.v2`); Profile → Settings → *Replay introduction* shows it again.
Code: `src/features/onboarding/` (`Onboarding.tsx`, `handoff.ts`, `onboarding.css`); `src/screens/Welcome.tsx` re-exports it.

## The three steps (learning by doing)
| Step | Headline | What the visitor does | What it uses |
|---|---|---|---|
| 1 | Your layover, reimagined. | Types a booking reference into six slots (keyboard, paste, autofill), or taps *Try a sample booking* and picks one of the four sample references (AXR7KD, BQ3LMV, CJ8NWT, DH5PRZ), which types itself in. A match turns the card into the journey: origin → connection → destination, "Booking found · Sample booking", connection length. An unknown code shakes the card, says it is not a sample and opens the samples; a malformed one explains the format. *Enter flight details manually* opens the existing manual flight form. | `findSampleJourney` (the same lookup as Add flight); nothing else resolves |
| 2 | Know your time to explore. | Sees arrival and onward departure at the connecting airport, the connection split into planning buffer (hatched) and time to explore (coral), and the arithmetic. Changes the buffer (1h 30m / 2h / 3h, the trip form's options); the time to explore counts to its new value. "Your flights stay the same." | `budget()` (the planner's time budget), `BUFFER_OPTIONS` |
| 3 | Find your next experience. | Taps up to four real activities at the connecting airport (airside or unconfirmed access; mixed categories). Selected cards lift, get a coral ring and a numbered badge; a compact strip shows the time left (counting) and *Fits your time / Tight fit / Over by …*. | `computeItinerary()` (activities and known transfers) on the loaded catalogue |

**Start planning** builds the draft with `journeyDraft()` (shared with the journey overview) and calls
`finishWelcome(route, draft)`: the builder when activities were picked, else the airport's activity list. If Account
Access is due, it opens first with `then: route`; the draft and destination are also kept in
`skystop.onboarding.handoff.v1`, so a reload or an email sign-in link in the same browser resumes them. *Continue as
guest* (or any other choice) opens the plan; the kept copy is then cleared. A replay with an existing saved plan for the
same booking adds the picks to that plan instead of starting a second one.

Also: **Skip** (every step) → Account Access or Home; **Back** and the progress segments go to visited steps (and forward
once a booking is found); ← / → keys move between steps outside the text field; *Have an account? Sign in* on step 1.

## Visual design
A warm light scope (`.onb` in `onboarding.css`) inside the dark app: off-white canvas `#F7F2EE`, solid white cards with a
hairline and soft shadow, coral `#EA5139` only for the connection, the time to explore, selections and the primary
action, soft coral `#FFB5A5` for the remaining-time track. Editorial headline (36 px, −0.035em). No glass, no glow; the
only translucency is the sticky header.

## Motion
- One card for the whole introduction. Its parts unfold and fold (height + opacity), so the card grows from the booking
  into the layover overview and folds into the time strip; the route row stays put between steps 1 and 2.
- Validation: characters drop into their slots; on a match the slots fold away, a check springs in, airport codes land
  one after another and the two flight paths draw in coral; on a miss the card shakes once.
- Headlines slide with the direction of travel through a short blur; the progress segment fills.
- Numbers (time to explore, time left) count to their new value in 0.6 s; the buffer bar and remaining meter ease.
- Selections: lift, ring and a numbered badge with a small spring. Springs use almost no overshoot (bounce 0.1–0.3).
- Transform and opacity everywhere except the card's unfolding (height). Interaction is never blocked by animation.
- Reduced motion: `MotionGlobalConfig.instantAnimations` while onboarding is open: every change is instant.

## Tests
`tests/e2e/journey.mjs` §4b (25 checks: lookup, errors, samples, typed codes, buffer, Back/keys, selections, hand-off
through Account Access and a reload into the builder with the same time left, Skip, manual entry, Sign in, replay,
reduced motion); `src/features/onboarding/handoff.test.ts`.

## Limitations
The attached reference recording did not arrive, so the motion follows the written brief. Only the four sample
references resolve (SkyStop cannot read real reservations). Activities depend on the catalogue having loaded; if it
fails, step 3 says so and Start planning still works. The kept plan lives in this browser only.
