# Onboarding: three interactive steps, then your booking

First run: **Splash (unchanged SVG) → Onboarding (3 steps) → Account Access (optional) → booking-reference screen.**
Returning visitors see neither again (`skystop.onboarded.v2`); Profile → Settings → *Replay introduction* shows it again.
Code: `src/features/onboarding/Onboarding.tsx` (+ `onboarding.css`); `src/screens/Welcome.tsx` re-exports it.

## Three steps, one task each (on an example journey)
The onboarding shows how SkyStop works on an **example journey** (sample booking AXR7KD, Jakarta → Singapore → Paris,
labelled "Example journey"). The visitor's own booking is entered after it, on the booking-reference screen. Each step
asks for one thing; the footer says what to do, and *Next* appears only once it is done.

| # | Headline | The visitor… | The screen answers with… | Uses |
|---|---|---|---|---|
| 1 | Your layover, reimagined. | drags the plane along the first flight to Singapore (or taps it) | the path filling behind the plane; on landing: arrival, onward flight, the connection counting up | sample journey |
| 2 | Know your time to explore. | answers "How much time should we keep for the airport?" (1h 30m / 2h / 3h) | the buffer bar and the time to explore counting to the new value | `budget()`, `BUFFER_OPTIONS` |
| 3 | Find your next experience. | taps real activities at Changi | lift, ring, numbered badge; time left counting down; fits / tight / over | `computeItinerary()` |

**Get started** (and **Skip**) → Account Access when due (its destination is kept, also across a reload) → the
booking-reference screen ("Find your journey"), where manual entry is one tap away. The onboarding never waits for the
airport data: it opens at once while the catalogue loads (step 3 shows placeholders until it arrives).

## Loading
If the app itself needs the airport data and it is not there yet, a full-screen loader shows the SS logo assembling on a
loop (no wordmark): the two S's apart side by side → slide together into the stacked logo → the plane passes through
and leaves its silhouette (`src/features/splash/SSLoader.tsx`, `loader.css`). The catalogue loads every airport in
parallel, gives up after 15 s, retries once, then shows "We could not load the airports" with *Try again*.

## Visual design
A warm light scope (`.onb` in `onboarding.css`) inside the dark app: off-white canvas `#F7F2EE`, solid white cards with a
hairline and soft shadow, coral `#EA5139` only for the connection, the time to explore, selections and the primary
action, soft coral `#FFB5A5` for the remaining-time track. Editorial headline (36 px, −0.035em). No glass, no glow; the
only translucency is the sticky header.

## Motion
- One card carries the example: flight → layover; on step 3 it folds into a sticky time strip. Its parts
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
`tests/e2e/journey.mjs` §4b: onboarding opens without waiting for data; plane drag and spring-back; buffer question;
activity picks against the planner; Back/keys keep answers; Get started → Account Access → booking screen (also after
a reload); Skip; manual entry after onboarding; replay; reduced motion; SS loader on a slow start; catalogue retry.

## Limitations
The example journey is fixed (AXR7KD). Choices made in the onboarding are a demonstration and are not carried into
the visitor's own plan; their own booking starts fresh on the booking screen.
