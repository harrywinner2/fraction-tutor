import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { useSpeech } from '../hooks/useSpeech'
import type { useSound } from '../hooks/useSound'
import GameShell from '../components/GameShell'
import Celebration from '../components/Celebration'
import { add, eq, frac, label, spokenLabel, toNum, type Frac } from '../lib/frac'

interface Props {
  speech: ReturnType<typeof useSpeech>
  sound: ReturnType<typeof useSound>
  onExit: () => void
  onRoundCleared?: (round: number, total: number) => void
}

interface Tile {
  id: number
  value: Frac
}

// Every fraction a player can drag.
const POOL: Frac[] = [
  frac(1, 2),
  frac(1, 3),
  frac(1, 4),
  frac(1, 6),
  frac(1, 8),
  frac(3, 8),
  frac(2, 6),
  frac(2, 3),
  frac(3, 4),
]

// Each level: a target on the left pan. The player rebuilds it on the right
// using *other* fractions (the target's own value is removed from the palette).
const LEVELS: Frac[] = [frac(1, 2), frac(3, 4), frac(2, 3), frac(1, 4)]

export default function BalanceScale({ speech, sound, onExit, onRoundCleared }: Props) {
  const [level, setLevel] = useState(0)
  const [right, setRight] = useState<Tile[]>([])
  const [solved, setSolved] = useState(false)
  const [fireKey, setFireKey] = useState(0)
  const idSeq = useRef(1)
  const rightPan = useRef<HTMLDivElement | null>(null)
  const advance = useRef<number | null>(null)

  const target = LEVELS[level]
  const palette = useMemo(() => POOL.filter((p) => !eq(p, target)), [target])

  const clearAdvance = () => {
    if (advance.current) {
      window.clearTimeout(advance.current)
      advance.current = null
    }
  }

  // Restart the current level (also runs whenever the level changes).
  const reset = () => {
    clearAdvance()
    setRight([])
    setSolved(false)
  }
  useEffect(() => {
    reset()
    return clearAdvance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level])

  const rSum = useMemo(
    () => right.reduce((a, x) => add(a, x.value), frac(0, 1)),
    [right],
  )
  const balanced = rSum.n > 0 && eq(rSum, target)

  useEffect(() => {
    if (balanced && !solved) {
      setSolved(true)
      sound.play('win')
      sound.play('chime')
      setFireKey((k) => k + 1)
      onRoundCleared?.(level, LEVELS.length)
      clearAdvance()
      // Savour the balanced beam, then on to the next fractions.
      advance.current = window.setTimeout(
        () => setLevel((l) => (l + 1) % LEVELS.length),
        2400,
      )
    }
  }, [balanced, solved, sound, level, onRoundCleared])

  const lastLevel = level === LEVELS.length - 1
  const message = solved
    ? lastLevel
      ? `Balanced! That weighs exactly ${spokenLabel(target)}. You matched every one — nice work. Here's a fresh set…`
      : `Balanced! Those fractions together weigh exactly ${spokenLabel(target)} — equivalent. Next one…`
    : `Make the right side weigh the same as ${spokenLabel(target)} on the left — using other fractions.`

  const diff = toNum(rSum) - toNum(target) // >0 → right heavier → right drops
  const angle = Math.max(-13, Math.min(13, diff * 22))

  const dropOnRight = (value: Frac, point: { x: number; y: number }) => {
    const el = rightPan.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom) {
      setRight((t) => [...t, { id: idSeq.current++, value }])
      sound.play('pop')
    }
  }

  return (
    <GameShell speech={speech} onExit={onExit} title="Balance Scale" message={message}>
      <div className="flex h-full flex-col justify-between px-4 pb-4 pt-2 sm:px-8">
        {/* the scale — fulcrum apex, beam pivot and screen centre all align */}
        <div className="relative mx-auto mt-2 h-[42vh] w-[min(680px,92vw)]">
          {/* fulcrum (behind the beam, perfectly centred) */}
          <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '30px solid transparent',
                borderRight: '30px solid transparent',
                borderBottom: '30vh solid rgba(255,255,255,0.06)',
              }}
            />
            <div className="-mt-1 h-3 w-44 rounded-full bg-white/10" />
          </div>

          {/* beam + pans, pivoting on the centre.
              No -translate-x-1/2 here: Framer's animated transform replaces the
              element's whole transform string, which would wipe the Tailwind
              translate and push the beam off the fulcrum. left-0 + w-full of a
              centred wrapper does the same centring without that conflict. */}
          <motion.div
            className="absolute left-0 top-[8%] h-2.5 w-full rounded-full bg-gradient-to-b from-gold-soft to-gold-deep"
            style={{ transformOrigin: '50% 50%' }}
            animate={{ rotate: angle }}
            transition={{ type: 'spring', stiffness: 55, damping: 11 }}
          >
            {/* LEFT — the fixed target, not removable, not a drop zone */}
            <div className="absolute left-0 top-3 flex w-40 -translate-x-1/2 flex-col items-center">
              <div className="h-9 w-px bg-white/20" />
              <div className="flex min-h-[5rem] w-40 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] p-2 backdrop-blur-sm">
                <span className="rounded-lg bg-gradient-to-b from-cream to-[#d8cdb6] px-4 py-2 font-display text-xl font-semibold text-space-900 tabular-nums">
                  {label(target)}
                </span>
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-cream/45">
                target
              </div>
            </div>

            {/* RIGHT — build here to balance */}
            <div className="absolute right-0 top-3 flex w-40 translate-x-1/2 flex-col items-center">
              <div className="h-9 w-px bg-white/20" />
              <div
                ref={rightPan}
                className={[
                  'flex min-h-[5rem] w-40 flex-wrap content-start justify-center gap-1.5 rounded-2xl border p-2 backdrop-blur-sm transition-colors',
                  balanced ? 'border-mint/50 bg-mint/10' : 'border-white/12 bg-white/[0.05]',
                ].join(' ')}
              >
                {right.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setRight((r) => r.filter((x) => x.id !== t.id))}
                    className="rounded-lg bg-gradient-to-b from-gold-soft to-gold-deep px-2.5 py-1.5 font-display text-sm font-semibold text-space-900 tabular-nums active:scale-90"
                  >
                    {label(t.value)}
                  </button>
                ))}
              </div>
              <div className="mt-1 font-display text-base font-semibold text-cream/70 tabular-nums">
                = {label(rSum)}
              </div>
            </div>
          </motion.div>
        </div>

        {/* palette + restart */}
        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="text-xs uppercase tracking-[0.18em] text-cream/40">
            Drag fractions onto the right pan · tap a placed tile to remove it
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {palette.map((v, i) => (
              <DragTile key={`${level}-${i}`} value={v} onDrop={dropOnRight} />
            ))}
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-medium text-cream/85 transition hover:bg-white/10 active:scale-95"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 3v5h5" />
            </svg>
            Restart level
          </button>
        </div>
      </div>

      {fireKey > 0 && solved && <Celebration level="small" fireKey={fireKey} />}
    </GameShell>
  )
}

function DragTile({
  value,
  onDrop,
}: {
  value: Frac
  onDrop: (v: Frac, p: { x: number; y: number }) => void
}) {
  return (
    <motion.div
      drag
      dragSnapToOrigin
      whileDrag={{ scale: 1.15, zIndex: 60 }}
      onDragEnd={(_, info) => onDrop(value, info.point)}
      className="grid h-12 w-14 cursor-grab touch-none place-items-center rounded-xl border border-gold/40 bg-gold/10 font-display text-lg font-semibold text-gold-soft tabular-nums active:cursor-grabbing"
    >
      {label(value)}
    </motion.div>
  )
}
