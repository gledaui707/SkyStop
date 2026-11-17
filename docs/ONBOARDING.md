# Onboarding: interactive, booking-first

First run: **Splash (unchanged SVG, 1.5 s) → Onboarding → Account Access (optional) → planning or Home.** Returning
visitors see neither again (`skystop.onboarded.v2`); Profile → Settings → *Replay introduction* shows it again.
Code: `src/features/onboarding/` (`Onboarding.tsx`, `handoff.ts`, `onboarding.css`); `src/screens/Welcome.tsx` re-exports it.

## A guided story: six steps, one task each
No branches inside the onboarding: each step asks for one thing, the footer says what to do ("Drag the plane to
Singapore"), and the single action (*Next*) appears only once it is done. Manual flight entry and sign-in come after
the onboarding (Account Access; Home → Add flight → *I can't find my flight*).

| # | Headline | The visitor… | The screen answers with… | Uses |
|---|---|---|---|---|
| 1 | Your layover, reimagined. | picks one of the four sample bookings (or types a reference into six slots) | the code typing itself in, a check, the route landing in coral; then it moves on by itself | `findSampleJourney` |
| 2 | Here's your journey. | drags the plane along the first flight to the connecting airport (or taps it) | the path filling behind the plane; on landing: arrival, onward flight, the connection counting up | booking legs |
| 3 | Know your time to explore. | answers "How much time should we keep for the airport?" (1h 30m / 2h / 3h, suggested one marked) | the buffer bar and the time to explore counting to the new value | `budget()`, `BUFFER_OPTIONS` |
| 4 | What are you in the mood for? | chooses Eat / Relax / Shop / Explore (only what exists at that airport, airside) | tiles lighting up; the time strip stays in view | catalogue |
| 5 | Find your next experience. | picks real activities in those moods | lift, ring, numbered badge; time left counting down; fits / tight / over | `computeItinerary()` |
| 6 | Your layover, planned. | reviews | a timeline drawing itself: land → picks → board; then *Start planning* | `computeItinerary()` |

## Visual design
A warm light scope (`.onb` in `onboarding.css`) inside the dark app: off-white canvas `#F7F2EE`, solid white cards with a
hairline and soft shadow, coral `#EA5139` only for the connection, the time to explore, selections and the primary
action, soft coral `#FFB5A5` for the remaining-time track. Editorial headline (36 px, −0.035em). No glass, no glow; the
only translucency is the sticky header.

## Motion
- One card carries the journey: booking → flight → layover; from step 4 it folds into a sticky time strip. Its parts
  unfold and fold (height + opacity), so the card grows and shrinks with its content.
- The plane follows the finger along the flight path (drag, spring back if released early); the path fills in coral.
- Validation: characters drop into their slots; on a match the slots fold away, a check springs in, airport codes land
  one after another and the two flight paths draw in coral; on a miss the card shakes once.
- Headlines slide with the direction of travel through a short blur; the progress segment fills.
- Numbers (time to explore, time left) count to their new value in 0.6 s; the buffer bar and remaining meter ease.
- Selections: lift, ring and a numbered badge with a small spring. Springs use almost no overshoot (bounce 0.1–0.3).
- Transform and opacity everywhere except the card's unfolding (height). Interaction is never blocked by animation.
- Reduced motion: `MotionGlobalConfig.instantAnimations` while onboarding is open: every change is instant.

## Tests
`tests/e2e/journey.mjs` §4b (27 checks: lookup, errors, samples, typed codes, auto-advance, plane drag and spring-back, buffer
question, moods filtering activities, selections, plan timeline, hand-off through Account Access and a reload into the
builder with the same time left, Skip, manual entry after onboarding, replay, reduced motion); `src/features/onboarding/handoff.test.ts`.

## Limitations
The attached reference recording did not arrive, so the motion follows the written brief. Only the four sample
references resolve (SkyStop cannot read real reservations). Activities depend on the catalogue having loaded; if it
fails, step 3 says so and Start planning still works. The kept plan lives in this browser only.
