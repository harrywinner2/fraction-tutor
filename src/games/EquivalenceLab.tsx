import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BEATS, FIRST_BEAT } from '../lesson/script'
import type { BarSpec } from '../types'
import type { useSpeech } from '../hooks/useSpeech'
import type { useSound } from '../hooks/useSound'
import EquivalenceStage from '../components/EquivalenceStage'
import TutorPanel from '../components/TutorPanel'
import PauseMenu from '../components/PauseMenu'
import Celebration from '../components/Celebration'

type LiveBar = BarSpec & { ownerBeat: string }

interface Props {
  speech: ReturnType<typeof useSpeech>
  sound: ReturnType<typeof useSound>
  onExit: () => void
  onLessonComplete?: () => void
}

const PHASES = ['Explore', 'Learn', 'Check', 'Done'] as const
const phaseOf = (id: string): number => {
  if (['welcome', 'explain', 'explore_intro', 'explore_react'].includes(id)) return 0
  if (['name_it', 'name_it_again'].includes(id)) return 1
  if (id === 'finale') return 3
  return 2
}

/**
 * The original lesson: a scripted tutor + a smash/build chocolate bar that
 * teaches fraction equivalence. The share-cookie crowd was removed here — it
 * was designed to receive cookies, which has no meaning in this interaction.
 * The warmth here is Nova's voice and the manipulative itself.
 */
export default function EquivalenceLab({ speech, sound, onExit, onLessonComplete }: Props) {
  const [beatId, setBeatId] = useState(FIRST_BEAT)
  const [paused, setPaused] = useState(false)
  const [live, setLive] = useState<LiveBar | null>(null)
  const [celebrate, setCelebrate] = useState<{ level: 'small' | 'big'; key: number } | null>(
    null,
  )

  const advanceTimer = useRef<number | null>(null)
  const celebrateKey = useRef(1)
  const beat = BEATS[beatId]

  const interactiveSpec: BarSpec | null =
    beat.stage.top && beat.stage.top !== 'keep' && beat.stage.top.interactive
      ? beat.stage.top
      : beat.stage.bottom && beat.stage.bottom !== 'keep' && beat.stage.bottom.interactive
        ? beat.stage.bottom
        : null

  const clearTimer = () => {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
  }

  useEffect(() => {
    clearTimer()
    if (interactiveSpec) setLive({ ...(interactiveSpec as BarSpec), ownerBeat: beatId })
    if (!paused) speech.speak(beat.text)
    if (beat.celebrate) {
      sound.play('win')
      setCelebrate({ level: beat.celebrate, key: celebrateKey.current++ })
    } else {
      setCelebrate(null)
    }
    // Reaching the finale = the lesson is complete. Fires once per arrival.
    if (beatId === 'finale') onLessonComplete?.()
    return clearTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatId])

  // Stop speech when leaving the lesson entirely.
  useEffect(() => () => speech.cancel(), [speech])

  const goTo = useCallback((next: string) => {
    clearTimer()
    setBeatId(next)
  }, [])

  const restart = useCallback(() => {
    clearTimer()
    speech.cancel()
    setLive(null)
    setCelebrate(null)
    setPaused(false)
    setBeatId(FIRST_BEAT)
  }, [speech])

  const resolve = (slot: BarSpec | 'keep' | undefined): BarSpec | undefined => {
    if (!slot) return undefined
    if (slot === 'keep') return live ?? undefined
    if (slot.interactive && live && live.ownerBeat === beatId) return live
    return slot
  }
  const top = resolve(beat.stage.top)
  const bottom = resolve(beat.stage.bottom)

  const onSmash = () => {
    if (!live) return
    sound.play('smash')
    setLive((p) => {
      if (!p) return p
      if (p.segments >= 8) return p
      return { ...p, segments: p.segments * 2, filled: p.filled * 2 }
    })
    if (beat.gate === 'smash' && beat.gateNext) {
      clearTimer()
      advanceTimer.current = window.setTimeout(() => goTo(beat.gateNext!), 1400)
    }
  }

  const onBuildChange = (filled: number) => {
    if (!live) return
    sound.play('tap')
    const nextLive = { ...live, filled }
    setLive(nextLive)
    if (beat.gate === 'buildEquals' && beat.target && beat.gateNext) {
      const [tn, td] = beat.target
      const equal = filled > 0 && filled * td === tn * nextLive.segments
      clearTimer()
      if (equal) {
        sound.play('chime')
        advanceTimer.current = window.setTimeout(() => goTo(beat.gateNext!), 2600)
      }
    }
  }

  const onChoose = (next: string, correct?: boolean) => {
    sound.play(correct ? 'chime' : 'pop')
    goTo(next)
  }

  const phase = phaseOf(beatId)

  return (
    <>
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pr-28 py-4 sm:px-6 sm:pr-32">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              speech.cancel()
              onExit()
            }}
            aria-label="Back to menu"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-cream/80 backdrop-blur transition hover:bg-white/10 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => {
              setPaused(true)
              speech.cancel()
            }}
            aria-label="Pause"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-cream/80 backdrop-blur transition hover:bg-white/10 active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {PHASES.map((p, i) => (
            <div key={p} className="flex items-center gap-2">
              <span
                className={[
                  'text-xs font-semibold uppercase tracking-[0.16em] transition-colors',
                  i === phase ? 'text-gold-soft' : 'text-cream/25',
                ].join(' ')}
              >
                {p}
              </span>
              {i < PHASES.length - 1 && <span className="h-px w-4 bg-cream/15 sm:w-7" />}
            </div>
          ))}
        </div>
        <div className="w-11" />
      </div>

      <div className="flex h-full w-full flex-col gap-2 px-4 pb-5 pt-20 sm:px-7 lg:flex-row lg:gap-6">
        <div className="order-2 w-full shrink-0 lg:order-1 lg:w-[380px] lg:pt-6">
          <TutorPanel
            beatId={beatId}
            text={beat.text}
            choices={beat.choices}
            continueLabel={beat.continueLabel}
            speaking={speech.speaking}
            muted={speech.muted}
            mood={beat.mood}
            onChoose={onChoose}
            onContinue={() => beat.next && goTo(beat.next)}
            onReplay={() => speech.speak(beat.text)}
            onToggleMute={speech.toggleMute}
          />
        </div>

        <div className="order-1 flex min-h-0 flex-1 items-center lg:order-2">
          <EquivalenceStage
            kind={beat.stage.kind}
            top={top}
            bottom={bottom}
            showEquals={beat.stage.showEquals}
            ledger={beat.stage.ledger}
            hint={beat.gate === 'smash'}
            onSmash={onSmash}
            onBuildChange={onBuildChange}
          />
        </div>
      </div>

      {celebrate && <Celebration level={celebrate.level} fireKey={celebrate.key} />}

      <AnimatePresence>
        {paused && (
          <PauseMenu
            onResume={() => {
              setPaused(false)
              speech.speak(beat.text)
            }}
            onRestart={restart}
          />
        )}
      </AnimatePresence>
    </>
  )
}
