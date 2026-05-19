/** A single chocolate-bar instance the student can see or touch. */
export interface BarSpec {
  segments: number
  filled: number
  /** How the student may touch this bar. Omitted = look only. */
  interactive?: 'smash' | 'build'
  label?: string
}

export interface StageConfig {
  kind: 'none' | 'single' | 'compare'
  /** Top bar. 'keep' = carry over the live bar from the previous beat. */
  top?: BarSpec | 'keep'
  bottom?: BarSpec | 'keep'
  /** Render the equivalence sign between the two bars. It ignites when the
   *  two bars cover the same amount. */
  showEquals?: boolean
  /** Show the running discovery ledger (1/2 = 2/4 = 3/6 …). */
  ledger?: boolean
}

export type Mood =
  | 'idle'
  | 'happy'
  | 'curious'
  | 'surprised'
  | 'cheer'
  | 'encourage'
  | 'sad'

export interface Choice {
  label: string
  next: string
  correct?: boolean
}

export interface Beat {
  id: string
  /** Spoken aloud and shown in the tutor panel. */
  text: string
  choices?: Choice[]
  /** A button that advances when the student is ready / has finished playing. */
  continueLabel?: string
  next?: string
  /** A hands-on requirement that must be met before the lesson moves on. */
  gate?: 'smash' | 'buildEquals'
  /** Where a satisfied gate sends the student. */
  gateNext?: string
  /** Target fraction [num, den] the build bar must match for a buildEquals gate. */
  target?: [number, number]
  stage: StageConfig
  mood: Mood
  celebrate?: 'small' | 'big'
}
