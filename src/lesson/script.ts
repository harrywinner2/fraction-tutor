import type { Beat } from '../types'

/**
 * The whole lesson is a tiny state machine: a map of beats keyed by id.
 * Transitions are explicit string ids. No LLM — every line is hand-written
 * so the tutor stays warm, on-topic, and predictable for a 9-year-old.
 *
 * Shape of the lesson:  explore  →  instruct  →  check  →  win
 *   - explore : smash a half-bar and notice the amount doesn't change
 *   - instruct: name what they saw — "equivalent"
 *   - check   : build it, then prove it twice (with warm wrong-answer branches)
 *   - win     : celebrate the discovery, offer a replay
 */
export const FIRST_BEAT = 'welcome'

export const BEATS: Record<string, Beat> = {
  welcome: {
    id: 'welcome',
    text: "Hi! I'm Nova. We're going to play with a chocolate bar and find something a little bit magic hiding inside it. Ready?",
    choices: [
      { label: "Yes — let's go!", next: 'explore_intro' },
      { label: 'What are we doing?', next: 'explain' },
    ],
    stage: { kind: 'none' },
    mood: 'happy',
  },

  explain: {
    id: 'explain',
    text: "We'll cut a chocolate bar into pieces and find out when two different fractions are secretly the exact same size. It's quick, and it's pretty cool. Want to try?",
    choices: [{ label: "Okay, I'm in!", next: 'explore_intro' }],
    stage: { kind: 'none' },
    mood: 'happy',
  },

  explore_intro: {
    id: 'explore_intro',
    text: 'This is half a chocolate bar — one piece out of two. Give it a tap to smash it into smaller pieces. Go on, try it!',
    stage: {
      kind: 'single',
      top: { segments: 2, filled: 1, interactive: 'smash', label: 'one half' },
    },
    gate: 'smash',
    gateNext: 'explore_react',
    mood: 'curious',
  },

  explore_react: {
    id: 'explore_react',
    text: "Whoa! You cut it into more pieces — but look closely: the chocolate part didn't get any bigger or smaller. Same amount, just smaller cuts. Smash it again if you like, then tap Continue.",
    stage: {
      kind: 'single',
      top: 'keep',
    },
    continueLabel: 'Continue',
    next: 'name_it',
    mood: 'surprised',
  },

  name_it: {
    id: 'name_it',
    text: "Here's the secret. When you cut it more, the number changes but the amount stays exactly the same. One half and two quarters are the same size. Fractions like that have a name: equivalent.",
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 4, filled: 2, label: 'two quarters' },
      showEquals: true,
    },
    choices: [
      { label: 'I see it!', next: 'check1_intro' },
      { label: 'Show me again', next: 'name_it_again' },
    ],
    mood: 'happy',
  },

  name_it_again: {
    id: 'name_it_again',
    text: 'Look at where the gold ends. The top bar — one half. The bottom bar — two quarters. They stop at the exact same line. Same amount of chocolate. That is what equivalent means.',
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 4, filled: 2, label: 'two quarters' },
      showEquals: true,
    },
    choices: [{ label: 'Got it now', next: 'check1_intro' }],
    mood: 'happy',
  },

  check1_intro: {
    id: 'check1_intro',
    text: 'Your turn! Make the bottom bar show the same amount as the half on top. Tap a quarter to fill it in — one at a time — and watch what happens.',
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 4, filled: 0, interactive: 'build', label: 'quarters' },
      showEquals: true,
    },
    gate: 'buildEquals',
    target: [1, 2],
    gateNext: 'check1_win',
    mood: 'curious',
  },

  check1_win: {
    id: 'check1_win',
    text: 'Yes! Two quarters fills exactly the same as one half. They are equivalent — and you just built it yourself.',
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 4, filled: 2, label: 'two quarters' },
      showEquals: true,
    },
    continueLabel: 'Next',
    next: 'check2',
    mood: 'cheer',
    celebrate: 'small',
  },

  check2: {
    id: 'check2',
    text: 'Quick question. Which one of these is the same amount as one half?',
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      showEquals: true,
    },
    choices: [
      { label: '2 out of 4', next: 'check2_win', correct: true },
      { label: '1 out of 3', next: 'check2_missA' },
      { label: '3 out of 4', next: 'check2_missB' },
    ],
    mood: 'curious',
  },

  check2_missA: {
    id: 'check2_missA',
    text: "Ooh, not quite — and that's okay, look with me. One out of three only reaches up to here. One half reaches further. That's less chocolate, so it can't be the same. Try another one!",
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 3, filled: 1, label: 'one third' },
      showEquals: true,
    },
    continueLabel: 'Try again',
    next: 'check2',
    mood: 'encourage',
  },

  check2_missB: {
    id: 'check2_missB',
    text: "So close! Three out of four reaches past the half line — that's more chocolate than one half. We want exactly the same amount. Give it another go!",
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 4, filled: 3, label: 'three quarters' },
      showEquals: true,
    },
    continueLabel: 'Try again',
    next: 'check2',
    mood: 'encourage',
  },

  check2_win: {
    id: 'check2_win',
    text: 'Exactly right! Two out of four is the same as one half. You really get this now.',
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 4, filled: 2, label: 'two quarters' },
      showEquals: true,
    },
    continueLabel: 'One more',
    next: 'check3',
    mood: 'cheer',
    celebrate: 'small',
  },

  check3: {
    id: 'check3',
    text: 'Last one — true or false? Three out of six is also the same as one half. Look at the bars and decide.',
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 6, filled: 3, label: 'three sixths' },
      showEquals: true,
    },
    choices: [
      { label: 'True', next: 'finale', correct: true },
      { label: 'False', next: 'check3_miss' },
    ],
    mood: 'curious',
  },

  check3_miss: {
    id: 'check3_miss',
    text: 'Take one more look. Three out of six fills the bar right up to the same line as one half. So it really is the same amount. Want to call it again?',
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 6, filled: 3, label: 'three sixths' },
      showEquals: true,
    },
    choices: [{ label: 'Oh — True!', next: 'finale' }],
    mood: 'encourage',
  },

  finale: {
    id: 'finale',
    text: 'You did it! One half, two quarters, three sixths — all the same amount of chocolate, just cut into different pieces. That is fraction equivalence, and you figured it out yourself. Awesome work.',
    stage: {
      kind: 'compare',
      top: { segments: 2, filled: 1, label: 'one half' },
      bottom: { segments: 6, filled: 3, label: 'three sixths' },
      showEquals: true,
      ledger: true,
    },
    choices: [{ label: 'Play again', next: FIRST_BEAT }],
    mood: 'cheer',
    celebrate: 'big',
  },
}
