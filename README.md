# Slice — fractions by feel

A warm, iPad-first prototype where a nine-year-old discovers equivalent
fractions by **smashing chocolate, pouring water, slicing cake, and tilting a
glass.** Six games, six framings of "fraction", one scripted tutor voice.

**Live:** https://harrywinner2.github.io/fraction-tutor/

> Best on an iPad, held landscape, with sound on.

---

## What this is

A submission for the team that builds the Synthesis fractions tutor. We built
it in a sprint to demonstrate three things together:

1. **A real, end-to-end lesson.** *Equivalence Lab* is a complete scripted arc
   — explore → name → check → generalise → win — that a kid can finish without
   grown-up help.
2. **Five "what-if" prototypes.** Each one maps a different *input grammar*
   (touch pressure, accelerometer, swipe, drag, tap) to a different *framing*
   of what a fraction is.
3. **The infrastructure underneath.** Pre-rendered tutor voice, synthesised
   audio, an exact-fraction arithmetic layer, persisted progression, and a
   design system tuned to the Synthesis palette.

Nothing in `src/` is borrowed or AI-generated at runtime. Everything in
`public/voice/` is pre-rendered at build time.

---

## Six games, six framings of "fraction"

| Game | Input grammar | Mental model the game builds |
| --- | --- | --- |
| **Equivalence Lab** *(flagship)* | Tap to smash, tap to build | Cut more pieces → the amount is conserved → fractions can be **equivalent** |
| **Cookie Share** | Drag pieces onto friends | Fraction = the answer to **fair division** (3 cookies ÷ 4 friends = ¾ each) |
| **Balance Scale** | Drag pieces onto pans | Fraction has **magnitude**; equivalent fractions weigh the same |
| **Fill the Glass** | Tap and hold (release at the line) | Fraction = a **stopping point** along a continuum |
| **Tilt to Pour** | iPad accelerometer | Fraction = **what remains** after pouring (inverse intuition) |
| **Slice the Cake** | Swipe down a dotted line | Fraction = **proportional position** on a shape |

The variety is the point. A nine-year-old who can match symbols isn't
necessarily a child who *understands* fractions. Six different motor
experiences push the same concept past pattern-matching into intuition.

---

## The Equivalence Lab arc

The flagship is one tight loop: **explore → name → check (×3) → generalise → win.**

1. **Explore.** Half a chocolate bar appears. The only affordance is *tap to
   smash*. Each smash doubles the cuts, but the gold area never grows or
   shrinks. The discovery happens **before** any vocabulary is introduced.
2. **Name.** Nova labels what just happened — "one half and two quarters reach
   the same line — they're *equivalent*."
3. **Check.** Three warm, non-punishing checks: *build it* (fill quarters
   until they match the half), *spot it* (which fraction equals ½?), *confirm
   it* (true/false on 3/6). Wrong answers route to a "look with me" demo and a
   retry — never a buzzer.
4. **Generalise.** The conceptual transfer step: smash a *non-half* (⅓ → 2/6).
   The rule wasn't a "halves trick"; it works for any fraction.
5. **Win.** Confetti, a chime, and a discovery ledger that reads
   `½ = 2/4 = 3/6` and `⅓ = 2/6` — the kid's own discovery in writing.

Branching, tone, and recovery paths are all hand-scripted in
`src/lesson/script.ts`. An LLM was deliberately not used for runtime dialogue
— for a child-facing tutor, predictability + warmth + zero hallucination risk
outweighs dynamic phrasing.

---

## Engineering choices

### Voice is rendered at build time, not streamed at runtime

The browser's built-in `SpeechSynthesis` is jarringly robotic on iPad —
exactly the wrong note for a tutor that says *"you really get this now."* We
needed Nova to feel warm. Two options:

| Approach | Cost per session | First-utterance latency | Runtime API key | Offline |
| --- | --- | --- | --- | --- |
| Stream OpenAI TTS each session | ~$0.001 – 0.003 | ~500 – 800 ms | required | no |
| **Pre-render at build time** | **$0** | **~50 – 150 ms** | none | yes |

We pre-render. `scripts/generate-voice.mjs` does two things:

1. **Extracts every static line** from `src/lesson/script.ts` via regex over
   `text:` literals.
2. **Enumerates every dynamic line** the games can emit, by mirroring each
   game's `message` template × its `LEVELS` array. Currently **131 unique
   lines** — one scripted lesson + ~98 game variants.

Each line is keyed by `sha1(model | voice | format | text).slice(0, 16)`, so
re-runs are incremental: a clip is skipped if its MP3 already exists on disk.
At runtime `useSpeech` fetches `voice/manifest.json` once, builds a
`text → file` map, and plays the matching MP3 through a single persistent
`<audio>` element that is "blessed" inside the opening user gesture (iOS's
autoplay rule). `SpeechSynthesis` stays as a graceful fallback so a brand-new
beat never goes silent.

**Result:** one ~$0.10 build covers every play, forever. No runtime API key
on the client, no rate-limit risk, no streaming jitter.

### Voice is preloaded before the player meets Nova

A subtle problem with the manifest-then-play approach: the first time each
clip is referenced, the browser has to fetch its MP3 over the network. On
3G that's a visible delay between the text rendering and Nova's voice — the
worst possible synchronisation issue, because a kid is reading silently
while the tutor catches up.

So during the loading screen we **prefetch every clip in parallel** into the
HTTP cache:

```ts
// useSpeech.ts — runs once on mount, before the user taps begin
const CONCURRENCY = 8           // Safari hates dozens of parallel audio fetches
let done = 0
await Promise.all(workers(urls, async (url) => {
  await fetch(url, { cache: 'force-cache' })   // populates the HTTP cache
  setLoadProgress({ loaded: ++done, total: urls.length })
}))
setReady(true)
```

By the time the player taps "Tap to begin," every `<audio src={url}>` later
in the session hits the cache and plays in ~50 ms instead of waiting on the
network. A 15 s deadline forces `ready = true` regardless — a slow connection
can never block the lesson, only delay the cached-first warmth.

**The loading screen earns its keep three ways:**
1. It's the one place where the iOS autoplay gate gets satisfied — the "Tap
   to begin" button is the user gesture that unlocks both `SpeechSynthesis`
   and the persistent `<audio>` element for later programmatic playback.
2. It shows an honest progress bar ("47 / 131 clips") instead of a fake
   spinner, so the wait feels purposeful.
3. The ambient music file gets a head-start on its own preload too, so
   music begins the instant the player enters the Hub.

### Six different input vocabularies, tuned for nine-year-old motor skills

Each game uses a different Web API as its primary input. The tuning details
matter more than the choice of API:

- **Pointer-pressure** (Fill the Glass) — `onPointerDown/Up/Leave/Cancel` all
  stop the pour, so a finger drifting off the button counts as a release.
  Tolerance: ±4.5% of full glass. A `queueMicrotask` flush reads the freshest
  level before grading so the verdict is never one frame stale.
- **DeviceOrientation** (Tilt to Pour) — iOS 13+ gates the API behind
  `DeviceOrientationEvent.requestPermission()`, which we wire to a one-time
  "Listen for tilt" user-gesture button. Tilt has a ±6° dead-band, a ±18°
  pour threshold, and a 600 ms upright-lock before grading. A drag slider is
  the silent fallback on devices without orientation events.
- **Vertical-swipe-as-cut** (Slice the Cake) — diagonal swipes are projected
  onto a single x-axis cut. A vertical reach of ≥60% of the cake's height is
  required (otherwise it counts as "miss" — no spurious grading from a tap).
  A pre-drawn dotted golden guide shows the *exact* target cut, because a
  free-hand cut on glass is genuinely hard at this age.
- **Drag-with-snap** (Cookie Share, Balance Scale) — `setPointerCapture`
  survives fast swipes; drop zones use `getBoundingClientRect` for hit
  testing. Both games run on exact-fraction arithmetic so "fair" is
  unambiguous.
- **Tap-as-smash** (Equivalence Lab) — one gesture, learned in a second, that
  physically *is* the concept. Taps are forgiving and impossible to fumble
  on glass.
- **Speech-as-input everywhere** — Nova narrates every beat so reading isn't
  a prerequisite, and a "hear that again" button is always within reach.

Touch targets are all ≥44 px; the iOS tap highlight and text selection are
suppressed; `touch-action: none` is set on every interactive area to prevent
the scroll-vs-pan tug-of-war.

### Audio: synthesised FX + a real royalty-free track

**FX are synthesised.** Each cue is a hand-shaped WebAudio tone: a woody
**smash** (triangle + saw, glide down), a sine **pop**, a tri-note
**chime**, a four-note **win** arpeggio, a soft **tap**. Zero asset files,
instant first-play, and every cue is tuned to its manipulative rather than
approximated by a stock library.

**Music is real.** We started with a synthesised pad and it sounded like a
drone, not music. So we swapped it for a real track:

> *Easy Lemon (60 second)* — Kevin MacLeod ([incompetech.com](https://incompetech.com))
> Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Plays through a single persistent `HTMLAudioElement` with `loop = true`,
volume 0.22, started on the first user gesture (the same gesture that
unlocks iOS audio) and survives the session. Mute ramps the element's
volume to 0 over 250 ms and pauses it once silent.

Two global toggles live in the top-right of every screen:

- **♪** Musical note — music on / off.
- **🎙** Microphone — voice + sound effects on / off, in lockstep.

### Exact-fraction arithmetic, never floating-point

`src/lib/frac.ts` is 60 lines: `frac(n, d)` reduces with `gcd`, `add` keeps
denominators integer, `eq` cross-multiplies. Equivalence is decided by
`a.n * b.d === b.n * a.d`, so `1·4 === 2·2` lights the equals sign with
perfect certainty. A `spokenLabel` helper (`1/2 → "one half"`,
`3/4 → "three quarters"`) is used everywhere a fraction is read aloud, so
the cached TTS clips key cleanly and the child reads natural English instead
of "one slash two".

### Progression as visible state — with a dedicated page

`src/hooks/useProgress.ts` persists per-game completion to `localStorage`
under `slice-progress-v1`. Each game calls
`onRoundCleared(roundIndex, totalRounds)` on a successful round; the
Equivalence Lab calls `onLessonComplete()` on the finale beat. The hook
tracks the **set** of cleared round indices per game (so out-of-order play
counts honestly), the total rounds, and first / latest play timestamps.

Surfaces:

- The **Hub** shows a `★ X / Y cleared · Z %` pill that doubles as a link to
  the full breakdown, plus per-tile badges (`★ 3/5` → mint `✓ 5/5` on
  completion) and a "Done" chip on the flagship.
- The **Progress page** (`src/components/ProgressPage.tsx`) is its own
  screen: a hero ring showing overall completion, then a card per game with
  round-by-round dots, a "Finished 3 days ago" recency line, and a colour
  coded ring per game. It's reachable from the Hub's progress pill and from
  any game's back button via the Hub.

Storage is schema-versioned (`schemaVersion: 1`) so we can evolve the shape
without trashing old saves. A "Reset progress" link clears the slate.

Even at this scale, progress that vanishes between sessions feels
disposable; making it both glanceable on the Hub *and* explorable on its
own page turns the menu from a chooser into a journey.

---

## Design system — matching the Synthesis warmth

The visual identity tracks the Synthesis tutor's: cosmic depth, warm gold
accent, editorial typography, success-mint highlights.

| Token | Hex | Used for |
| --- | --- | --- |
| `space-900` → `space-600` | `#070b16` → `#142046` | Cosmic background gradient stops |
| `gold`, `gold-soft`, `gold-deep` | `#E3B23C`, `#EBC76A`, `#C8932A` | Primary CTAs, Nova's halo, focus rings, the target-cut line |
| `cream` | `#F5F0E6` | Display and body type |
| `mint` | `#5BD6A0` | Success states — "balanced", "exactly right", lesson-complete |

Typography pairs **Fraunces** (display, italicised on emphasis — the
"by *feel*" treatment that mirrors Synthesis's editorial voice) with
**Geist** (sans). The Starfield is a slowly drifting field of 70 stars
layered over a four-stop radial gradient and two soft nebula glows; each
star has its own drift loop (60 – 120 s) on an outer span and a twinkle on
an inner span, so the two animations don't fight over `transform`. The drift
is deliberately subliminal — you notice it after a beat, not on entry.

---

## Tool stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | **Vite 5** | Fast HMR, native ESM, tiny prod bundle |
| UI | **React 18 + TypeScript 5.5** | Strict types catch fraction-math errors at compile time |
| Styling | **Tailwind 3** + custom palette | Constraint-based; no CSS-in-JS overhead |
| Motion | **Framer Motion 11** | Spring physics for the slice slide, smash shudder, equals-sign ignition |
| Audio FX | **WebAudio** (synthesised) | No asset pipeline, iOS-blessed playback |
| Voice | **OpenAI `gpt-4o-mini-tts`**, voice `nova`, pre-rendered | Warm, expressive, cached forever |
| Sensors | **Pointer Events + DeviceOrientation** | iPad-native input grammars |
| Persistence | **localStorage** (schema-versioned) | No backend, tiny payload |
| Deploy | **GitHub Pages** | Static bundle, zero infra |

---

## Repo layout

```
src/
  App.tsx                    router: hub ↔ each game, audio + progress wiring
  lesson/script.ts           the entire equivalence lesson as data
  voice/extras.json          static helper lines kept around for future tap-to-speak
  hooks/
    useSpeech.ts             cached-MP3-first, SpeechSynthesis-fallback
    useSound.ts              synthesised FX + ambient music + mute control
    useProgress.ts           per-game localStorage progression
  components/
    LoadingScreen.tsx        voice-clip preload + "Tap to begin" gesture
    Hub.tsx                  game menu, progress badges, reset link
    ProgressPage.tsx         dedicated progress dashboard
    GlobalAudioToggles.tsx   top-right music / voice toggles
    NovaAvatar.tsx           shared tutor face — blink, breathe, mouth-sync
    FractionBar.tsx          smash/build chocolate-bar manipulative
    Starfield.tsx            slow-drifting cosmic background
    GameShell / Celebration / PauseMenu / TutorPanel / ...
  games/
    EquivalenceLab.tsx       the scripted lesson
    CookieShare.tsx          fair-share prototype
    BalanceScale.tsx         drag-to-balance prototype
    PourIn.tsx               tap-and-hold to fill
    PourOut.tsx              tilt to pour out
    CakeSlice.tsx            swipe down a dotted line
  lib/frac.ts                exact-fraction arithmetic + spokenLabel
scripts/
  generate-voice.mjs         build-time TTS → MP3 + manifest
public/voice/
  *.mp3, manifest.json       131 pre-rendered Nova clips
public/music/
  ambient.mp3                Kevin MacLeod, "Easy Lemon (60 second)" · CC BY 4.0
```

## Credits

- **Music** — *Easy Lemon (60 second)* by Kevin MacLeod
  ([incompetech.com](https://incompetech.com)), licensed
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Voice** — *Nova*, pre-rendered with OpenAI `gpt-4o-mini-tts`.
- **Type** — Fraunces (Google Fonts, OFL) + Geist (Vercel, OFL).
- Everything else — hand-written for this submission.

---

## Running it

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

### Pre-rendering Nova's voice

```bash
OPENAI_API_KEY=sk-... npm run voice
```

Walks the lesson script, enumerates every concrete game line, and renders any
missing clips. Re-runs are incremental — already-rendered MP3s are skipped.

| Var | Default | Notes |
| --- | --- | --- |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | Use `tts-1-hd` for the older high-quality model |
| `OPENAI_TTS_VOICE` | `nova` | Try `shimmer`, `alloy`, `coral`, `verse` |
| `OPENAI_TTS_FORMAT` | `mp3` | `opus` is smaller; `wav` is uncompressed |

---

## What we'd ship next

- **Adaptive difficulty.** The progression tracker already knows which rounds
  the player has cleared; two more lines, and the next session can offer the
  *uncleared* rounds first, then loop in cleared ones for confidence.
- **A second lesson.** Mixed numbers, or addition of like fractions. The
  state-machine shape in `script.ts` is the right level of abstraction to
  author without re-engineering anything.
- **Light haptics.** `navigator.vibrate(8)` on a smash,
  `navigator.vibrate([6, 60, 12])` on a correct answer — supported on
  Android, ignored gracefully elsewhere.
- **Teacher view.** A read-only dashboard that consumes the same
  `localStorage` blob (or a Synthesis-side telemetry shape) and surfaces
  which children have done what.
- **Voice variants.** The build script already supports `OPENAI_TTS_VOICE`
  overrides — kids could pick their tutor's voice in the Hub.

---

## Notes on a few decisions

- **Chocolate bar, not pizza.** Equivalence is a comparison of *length*. A
  bar makes "the gold stops at the same line" undeniable in a way a circle's
  area can't.
- **One gesture per game, not a control panel.** Every game commits to one
  primary input. The kid never has to learn a UI — they just touch the thing.
- **No wrong-answer buzzer.** Every miss routes to a beat that shows *why* on
  the bars and invites another try. The warmth lives in the recovery, not the
  reward.
- **Scripted dialogue, not generative.** Hand-written warmth, predictable
  branches, zero hallucination risk, free at runtime. For one child-facing
  lesson, this is the right tradeoff.
- **Synthesised audio everywhere.** Zero asset files to ship, instant
  first-play, and each cue is tuned to its manipulative rather than
  approximated by a stock library.
