# Slice — a fractions playground

A single, self-contained math lesson that teaches **fraction equivalence**
(½ = 2/4 = 3/6) to a nine-year-old. A warm scripted tutor talks the student
through it, and a chocolate-bar manipulative lets them *feel* why two
different-looking fractions are the same amount.

**Live:** https://harrywinner2.github.io/fraction-tutor/

It's built to be played on an iPad in the browser, held sideways, with sound on.

---

## The lesson

The whole thing is one tight arc: **explore → learn → check → generalise → win.**

1. **Explore.** The student gets half a chocolate bar and is invited to *smash*
   it. Each smash cuts every piece in two — but the gold part never grows or
   shrinks. That's the revelation, discovered by hand before it's ever named.
2. **Learn.** The tutor names what they just saw: one half and two quarters
   reach the exact same line, so they're *equivalent*.
3. **Check.** Warm, non-punishing checks:
   - *Build it:* fill quarters until the bottom bar matches one half.
   - *Spot it:* which fraction equals ½? Wrong answers get a gentle "look with
     me" demo and a retry — never a buzzer.
   - *Confirm it:* is 3/6 also a half? They reason straight off the bars.
4. **Generalise.** The payoff: smash a *non-half* fraction — `1/3 → 2/6` — and
   discover the rule isn't a half-trick, it holds for *any* fraction. This is
   the "deep conceptual understanding" beat, not just pattern-matching.
5. **Win.** A real celebration — the crowd cheers, the equals sign ignites,
   and the discovery ledger reads `1/2 = 2/4 = 3/6` and `1/3 = 2/6`.

The tutor's dialogue is entirely hand-scripted (no LLM), so the tone stays
warm and the branching stays predictable for a young learner.

## Running it locally

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Technical approach

- **Vite + React + TypeScript** — a static single-page app, no backend, so it
  deploys anywhere and there's no setup hell for a demo.
- **The lesson is a small state machine.** Every screen is a "beat" in
  `src/lesson/script.ts`: its line, its choices, its branches, and what the
  stage shows. Wrong answers are just edges to warmer beats. All of the
  teaching content lives in one readable file.
- **The manipulative is the lesson.** `FractionBar` is one component that can
  be *smashed* (every piece splits, the amount is conserved) or *built* (tap to
  fill). Equivalence is detected with exact integer cross-multiplication —
  never floating point — so `1·4 === 2·2` lights the equals sign.
- **Warmth is engineered.** The tutor reads every line aloud via the browser
  SpeechSynthesis API (primed on the opening tap for iOS), faces react to the
  lesson mood, and every touch has a synthesised sound — no audio assets to
  ship or wait on.
- **Motion** is Framer Motion: the smash shudder, the pieces springing apart,
  the equals sign igniting, the confetti.

```
src/
  App.tsx                 orchestrator: beat machine, gates, audio
  lesson/script.ts        the entire lesson as data
  components/
    FractionBar.tsx       the manipulative (smash + build)
    EquivalenceStage.tsx  two bars + the igniting equals sign
    TutorPanel.tsx        Nova, the message, the answers, audio controls
    Characters.tsx        the crowd that reacts
    Starfield / StartScreen / PauseMenu / Celebration
  hooks/
    useSpeech.ts          read-aloud, iOS-safe
    useSound.ts           synthesised tactile audio
```

## iPad roadmap

The app is built iPad-web-first and is already usable on one; this is how it's
tuned for touch and what differs from desktop.

**Layout.** Landscape is the primary canvas (it mirrors the side-by-side
tutor/manipulative split). At iPad-landscape width the tutor sits in a fixed
left column with the scene to its right; below that width the scene moves up
top and the tutor drops beneath it so nothing is ever cramped. `viewport-fit=cover`
plus safe-area padding keeps content clear of the camera notch and home
indicator, and `user-scalable=no` stops a stray double-tap from zooming the
canvas mid-lesson.

**Touch targets.** Every interactive element is at least 44–56px on its short
edge: the answer buttons are 56px tall, the pause/replay/mute controls are
44px circles, and the chocolate bar itself is the biggest target on screen
(`clamp(64px,12vh,108px)` tall, up to 680px wide) so a small finger can't miss
it. The iOS tap highlight and text selection are disabled so it feels like an
app, not a web page.

**Gestures.** The signature move is a single tap to *smash* — chosen over a
drag because taps are forgiving for nine-year-olds and impossible to fumble on
glass. Building a fraction is tap-to-fill. There are no hover states; every
affordance (the pulsing "tap to smash" chip, the igniting equals sign) is
visible without a cursor.

**Audio.** iOS only allows speech and sound to start from a user gesture, so
the experience opens with one big "Tap to begin" that primes both the speech
synthesiser and the audio context. A mute toggle and a "hear that again"
button are always within reach.

**What changes from desktop.** Desktop gets hover affordances on the buttons
and a roomier two-column layout; otherwise the experience is identical. The
next touch-specific steps would be: optional light haptics via the Vibration
API on smash and on a correct answer, a portrait "turn me sideways" nudge, and
Add-to-Home-Screen polish (icon + splash) so it launches fullscreen like a
native app.

## Notes on a few decisions

- **Chocolate bar, not pizza.** Equivalence is a comparison of *length*. A bar
  makes "the gold stops at the same line" undeniable in a way a circle's area
  can't.
- **Smash as the one gesture.** One move, learned in a second, that physically
  *is* the concept: cut it more, it's still the same amount.
- **No wrong-answer buzzer.** Every miss routes to a beat that shows *why* on
  the bars and invites another try. The recovery is where the warmth lives.
- **Scripted, not generative.** For one lesson aimed at a child, a hand-written
  script is warmer, safer, and more reliable than a model — and it's the right
  scope for the brief.
