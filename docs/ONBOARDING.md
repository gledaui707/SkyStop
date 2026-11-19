# Onboarding: three photo slides, a short conversation, then Account Access

First run: **Splash (unchanged) → three intro slides → conversational onboarding → Account Access → Home.**
The slides are the original photographic screens ("Your layover, reimagined.", "Discover what's possible.", "Make every
minute count.") restored unchanged in `src/features/onboarding/IntroSlides.tsx`: Get started moves through them and on
the last one crossfades into the conversation; Skip goes to Account Access; Sign in opens the email sign-in form.
`src/screens/Welcome.tsx` sequences the two.
Code: `src/features/onboarding/Onboarding.tsx` (+ `onboarding.css`), `src/features/access/AccountAccess.tsx`,
`enterAsGuest` in `src/store.tsx`, `src/features/splash/SSLoader.tsx` (+ `loader.css`).

## The conversation (scripted, deterministic; no AI, no typing)
One cancellable timeline; a tap counts once, and only while SkyStop is asking (it listens from the moment the question
starts). Two taps in total, everything else unfolds by itself.

| State | SkyStop (streams in) | Visitor |
|---|---|---|
| intro | "Hi, I'm SkyStop." | |
| askBooked | "Already have a flight booked?" | taps **Yes, I'm booked** / **Not yet** |
| ackBooked | "Perfect. Let's make the most of your layover." / "You can explore your options before booking." | answer moves into the trail |
| askExperience | "There's more to a layover than waiting. What would you do first?" + Dining, Shopping, Relaxation, Attractions photo cards | taps one |
| ackExperience | "Good choice. I'll keep dining in mind." | pick moves into the trail |
| time | "Make every minute count." + example 5h − 1h 30m = **3h 30m to explore** (counts up), then "That leaves time for dining, and more." | |
| closing → done | "Ready when you are." → fade → Account Access (Home with an existing session) | |

Composition: one stage, not a transcript. SkyStop's current line sits centre stage; before each line a brief
"thinking" pulse (three coral dots, the SS mark breathes), then the line writes itself letter by letter with a coral
caret. When the talk moves on, the line lifts away (fade, rise, blur) before the next one starts. The tapped choice fills
coral with a check, the other folds away, and the answer shrinks into a coral chip in the **answer trail** under the
header ("✓ Yes, I'm booked  ✓ Dining"). The picked experience card lights up, the others dim. A soft coral light drifts
to a new spot with each phase. Pace: tap feedback ~0.2 s, acknowledgement right after, the whole talk ≈ 15 s.
Reduced motion: same progression; lines appear whole; no pulse; instant changes; shorter pauses.

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
