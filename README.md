# Slice — a fractions playground

A warm, hands-on way for a nine-year-old to *feel* fractions. A game-select
hub opens onto several fraction games, each built around one direct-manipulation
gesture and Nova, a scripted voice tutor.

**Live:** https://harrywinner2.github.io/fraction-tutor/

It's built to be played on an iPad in the browser, held sideways, with sound on.

## The games

- **Equivalence Lab** — the deep, polished lesson. Smash a chocolate bar and
  discover why ½ = 2/4 = 3/6, then prove the rule generalises (1/3 → 2/6).
  This is the one that completes the brief end-to-end.
- **Cookie Share** *(prototype)* — fraction as fair-sharing. Cut cookies and
  drag the pieces so every friend gets the same; the friends smile when it's
  fair and look glum when they have less than a peer.
- **Balance Scale** *(prototype)* — fraction as weight. Drag fractions onto two
  pans; the beam tips to the heavier side and balances when they're equal, so
  comparison and equivalence become physical.
- **Fill the Glass** *(iPad-touch)* — tap-and-hold the faucet to pour water
  into a glass. Release at the target line. Teaches fraction as a *stopping
  point* on a continuous quantity — the missing intuition between cookies and
  the number line.
- **Tilt to Pour** *(iPad-tilt)* — start with a full glass and use the iPad's
  accelerometer to pour water out. Stop tilting when the level meets the
  target. Teaches the inverse: the fraction that *remains*. (Falls back to a
  drag-slider on devices without orientation events.)
- **Slice the Cake** *(iPad-swipe)* — draw a straight cut across a round cake
  with one finger. The chord-segment area is graded against the target
  fraction. Fractions as a *choice of cut*, not a count of pre-made pieces.

The Equivalence Lab is the complete demo-ready lesson; the rest are playable
prototypes exploring other game dynamics.

---

## The Equivalence Lab lesson

The flagship lesson is one tight arc: **explore → learn → check → generalise → win.**

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

### Pre-rendering Nova's voice (OpenAI TTS)

Nova falls back to the browser's `SpeechSynthesis` voice, which is jarringly
robotic on iPad. To ship a warm tutor voice, pre-render every conversation
line with OpenAI's text-to-speech once at build time:

```bash
OPENAI_API_KEY=sk-... npm run voice
```

The script walks `src/lesson/script.ts` and `src/voice/extras.json`, hits the
TTS endpoint (`gpt-4o-mini-tts` with voice `nova` by default), and writes mp3s
to `public/voice/` plus a `manifest.json` mapping each text to its audio file.
Re-runs are incremental — only new or changed lines are regenerated.

At runtime, `useSpeech` plays the cached clip when one matches; anything
without a clip (a brand-new beat, a dynamic message) falls back to the
browser voice so the lesson is never silent.

Useful env overrides:

| Var                  | Default            | Notes                                       |
| -------------------- | ------------------ | ------------------------------------------- |
| `OPENAI_TTS_MODEL`   | `gpt-4o-mini-tts`  | Use `tts-1-hd` for the older high-quality model. |
| `OPENAI_TTS_VOICE`   | `nova`             | Try `shimmer`, `alloy`, `coral`, `verse`.   |
| `OPENAI_TTS_FORMAT`  | `mp3`              | `opus` is smaller; `wav` is uncompressed.   |


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
- **Warmth is engineered.** Nova reads every line aloud — the *good* path uses
  pre-rendered OpenAI TTS clips (warm, expressive, on-brand) and the *fallback*
  path uses the browser's `SpeechSynthesis` so the lesson is never silent on
  a fresh checkout. Faces react to the lesson mood; every touch has a
  synthesised sound.
- **Motion** is Framer Motion: the smash shudder, the pieces springing apart,
  the equals sign igniting, the confetti.

```
src/
  App.tsx                 orchestrator: game-select hub + per-game routing
  lesson/script.ts        the entire equivalence lesson as data
  voice/extras.json       static lines that aren't beats (game intros etc.)
  games/
    EquivalenceLab.tsx    the scripted chocolate-bar lesson
    CookieShare.tsx       fair-share-the-cookies prototype
    BalanceScale.tsx      drag-to-balance prototype
    PourIn.tsx            tap-and-hold to fill (iPad touch)
    PourOut.tsx           tilt the device to drain (iPad accelerometer)
    CakeSlice.tsx         swipe to slice (chord-area scoring)
  components/
    Hub.tsx               the game-select screen
    NovaAvatar.tsx        the shared tutor face — blink, breathe, mouth-sync
    FractionBar.tsx       the smash/build chocolate-bar manipulative
    GameShell.tsx         shared back + Nova chrome around each prototype
    Characters.tsx        the crowd that reacts (Cookie Share)
    Starfield / PauseMenu / Celebration
  hooks/
    useSpeech.ts          cached-MP3-first, SpeechSynthesis-fallback
    useSound.ts           synthesised tactile audio
scripts/
  generate-voice.mjs      build script: TTS → public/voice/*.mp3 + manifest
public/voice/             pre-rendered Nova voice clips + manifest.json
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
