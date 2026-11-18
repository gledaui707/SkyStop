# Onboarding: three photo slides, a short conversation, then Account Access

First run: **Splash (unchanged) → three intro slides → conversational onboarding → Account Access → Home.**
The slides are the original photographic screens ("Your layover, reimagined.", "Discover what's possible.", "Make every
minute count.") restored unchanged in `src/features/onboarding/IntroSlides.tsx`: Get started moves through them and on
the last one crossfades into the conversation; Skip goes to Account Access; Sign in opens the email sign-in form.
`src/screens/Welcome.tsx` sequences the two.
Code: `src/features/onboarding/Onboarding.tsx` (+ `onboarding.css`), `src/features/access/AccountAccess.tsx`,
`enterAsGuest` in `src/store.tsx`, `src/features/splash/SSLoader.tsx` (+ `loader.css`).

## The conversation (scripted, deterministic; no AI, no typing)
One async timeline (cancelled on unmount or Skip). It starts after the slides (and never under the launch splash).

| State | SkyStop | Visitor |
|---|---|---|
| intro | "Hi, I'm SkyStop." | |
| ask | "Already have a flight booked?" + choices | taps **Yes, I'm booked** or **Not yet** (the only tap) |
| picked (~210 ms) | | tapped choice fills coral with a check; the other folds away |
| answered → ack | "Perfect. Let's make the most of your layover." / "You can explore your options before booking." | reply pill on the right |
| product preview | "There's more to a layover than waiting." + Dining, Shopping, Relaxation, Attractions cards (real SkyStop venue photos) | |
| time preview | "Make every minute count." + example 5h layover − 1h 30m buffer = **3h 30m to explore** (planner's `budget()`; counts up) | |
| closing → done | "Ready when you are." → fade → Account Access (Home if the visitor already has a session) | |

No Next or Continue buttons. **Skip** (always visible) goes to Account Access without signing in. A tap is accepted
only in `ask`, once. Nothing is written to the backend during the conversation.

Motion: before each line a short typing pulse (three coral dots, ~0.4 s); the line reveals word by word (fade, rise,
blur, 28 ms stagger). Earlier lines shrink and soften and drift up into a fade at the top (layout animation), so the
conversation is one evolving composition anchored low on the screen. Pace: tap feedback ~0.2 s, acknowledgement ~0.3 s
later, the whole conversation ≈ 9 s after the tap. Reduced motion: same automatic progression, no typing pulse,
instant changes, shorter pauses.

## Account Access
Primary **Get started**, secondary **Log in**, tertiary **No account yet? Create one**. Log in and Create one open the
email form on the same screen (no loader, no guest session). Get started runs `enterAsGuest()` in the store:

1. the button stops taking taps and the **SS loader** fades in (the two S's slide together, the plane leaves its
   silhouette; no text on screen);
2. the Supabase anonymous session is reused or created (`ensureGuestSession`), and the airport data is awaited;
3. Home opens and the loader fades out (shown for at least one logo assembly, ~1.9 s).

On failure the loader stops and the screen shows "Couldn't start. Check your connection and try again." with
**Try again**. The SS loader is used nowhere else; a slow data load elsewhere shows a quiet blank screen.

## Returning visitors and replay
A browser with a Supabase session, or that finished the onboarding, goes straight to Home. Profile → Settings →
*Replay introduction* plays the conversation again and returns to Home: no sign-out, no Account Access, no guest
loader, saved plans untouched.

## Tests
`tests/e2e/journey.mjs` §4b (conversation, auto-progression, no Next buttons, tap feedback, Account Access actions,
loader only on Get started, one anonymous session, failure and retry, Skip, Log in / Create one without the loader,
returning users, replay, reduced motion).

## Limitations
The reference recording did not arrive; the rhythm follows the written brief. The experience preview and the time
budget are examples, not the visitor's flight.
