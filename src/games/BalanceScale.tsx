import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { useSpeech } from '../hooks/useSpeech'
import type { useSound } from '../hooks/useSound'
import GameShell from '../components/GameShell'
import Celebration from '../components/Celebration'
import { add, eq, frac, label, toNum, type Frac } from '../lib/frac'

interface Props {
  speech: ReturnType<typeof useSpeech>
  sound: ReturnType<typeof useSound>
  onExit: () => void
}

interface Tile {
  id: number
  value: Frac
}

const PALETTE: Frac[] = [
  frac(1, 2),
  frac(1, 3),
  frac(1, 4),
  frac(1, 6),
  frac(2, 4),
  frac(2, 6),
  frac(2, 3),
  frac(3, 4),
]

type Side = 'L' | 'R'

const CHALLENGES = [
  {
    intro:
      "There's one half on the left pan. Drag tiles onto the right pan until the scale balances — but don't just use another one half.",
    win: 'Balanced! Different fractions, the exact same weight — that means they are equivalent.',
  },
  {
    intro:
      'Which is bigger — two thirds or three quarters? Put 2/3 on the left and 3/4 on the right, and watch which side drops.',
    win: 'See it drop? Three quarters is the heavier one — three quarters is bigger than two thirds.',
  },
  {
    intro: 'Free play. Build any two piles and see which side wins — or try to make them balance.',
    win: '',
  },
]

export default function BalanceScale({ speech, sound, onExit }: Props) {
  const [ch, setCh] = useState(0)
  const [left, setLeft] = useState<Tile[]>([])
  const [right, setRight] = useState<Tile[]>([])
  const [solved, setSolved] = useState(false)
  const [fireKey, setFireKey] = useState(0)
  const idSeq = useRef(1)
  const panRefs = useRef<Record<Side, HTMLDivElement | null>>({ L: null, R: null })

  // Set up each challenge.
  useEffect(() => {
    setSolved(false)
    if (ch === 0) {
      setLeft([{ id: idSeq.current++, value: frac(1, 2) }])
      setRight([])
    } else {
      setLeft([])
      setRight([])
    }
  }, [ch])

  const sum = (t: Tile[]): Frac => t.reduce((a, x) => add(a, x.value), frac(0, 1))
  const lSum = useMemo(() => sum(left), [left])
  const rSum = useMemo(() => sum(right), [right])

  const balanced = (lSum.n > 0 || rSum.n > 0) && eq(lSum, rSum)

  // Win conditions per challenge.
  useEffect(() => {
    if (solved) return
    let ok = false
    if (ch === 0) ok = lSum.n > 0 && balanced && !(right.length === 1 && eq(right[0].value, frac(1, 2)))
    else if (ch === 1) ok = eq(lSum, frac(2, 3)) && eq(rSum, frac(3, 4))
    if (ok) {
      setSolved(true)
      sound.play('win')
      sound.play('chime')
      setFireKey((k) => k + 1)
    }
  }, [ch, lSum, rSum, balanced, right, solved, sound])

  const diff = toNum(rSum) - toNum(lSum) // >0 → right heavier → right drops
  const angle = Math.max(-13, Math.min(13, diff * 22))

  const message = solved ? CHALLENGES[ch].win : CHALLENGES[ch].intro

  const dropOn = (value: Frac, point: { x: number; y: number }) => {
    const inside = (s: Side) => {
      const el = panRefs.current[s]
      if (!el) return false
      const r = el.getBoundingClientRect()
      return point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom
    }
    const tile = { id: idSeq.current++, value }
    if (inside('L')) {
      setLeft((t) => [...t, tile])
      sound.play('pop')
    } else if (inside('R')) {
      setRight((t) => [...t, tile])
      sound.play('pop')
    }
  }

  const removeFrom = (s: Side, id: number) => {
    ;(s === 'L' ? setLeft : setRight)((t) => t.filter((x) => x.id !== id))
  }

  return (
    <GameShell speech={speech} onExit={onExit} title="Balance Scale" message={message}>
      <div className="flex h-full flex-col justify-between px-4 pb-4 pt-2 sm:px-8">
        {/* the scale */}
        <div className="relative mx-auto mt-2 h-[42vh] w-full max-w-3xl">
          {/* beam + pans */}
          <motion.div
            className="absolute left-1/2 top-6 h-2.5 w-[min(620px,80vw)] -translate-x-1/2 rounded-full bg-gradient-to-b from-gold-soft to-gold-deep"
            style={{ transformOrigin: 'center' }}
            animate={{ rotate: angle }}
            transition={{ type: 'spring', stiffness: 60, damping: 12 }}
          >
            <Pan
              side="L"
              tiles={left}
              sum={lSum}
              refCb={(el) => (panRefs.current.L = el)}
              onRemove={(id) => removeFrom('L', id)}
            />
            <Pan
              side="R"
              tiles={right}
              sum={rSum}
              refCb={(el) => (panRefs.current.R = el)}
              onRemove={(id) => removeFrom('R', id)}
            />
          </motion.div>

          {/* fulcrum */}
          <div className="absolute left-1/2 top-7 h-[34vh] w-0 -translate-x-1/2">
            <div
              className="mx-auto h-0 w-0"
              style={{
                borderLeft: '34px solid transparent',
                borderRight: '34px solid transparent',
                borderBottom: '30vh solid rgba(255,255,255,0.06)',
              }}
            />
          </div>
          <div className="absolute bottom-0 left-1/2 h-3 w-44 -translate-x-1/2 rounded-full bg-white/10" />
        </div>

        {/* palette */}
        <div className="mt-2 flex flex-col items-center gap-3">
          <div className="text-xs uppercase tracking-[0.18em] text-cream/40">
            Drag a fraction onto a pan · tap a placed tile to remove it
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {PALETTE.map((v, i) => (
              <DragTile key={i} value={v} onDrop={dropOn} />
            ))}
          </div>
          {(solved || ch === 2) && (
            <button
              onClick={() => setCh((c) => (c + 1) % CHALLENGES.length)}
              style={{ animation: 'replyInUp 360ms ease-out both' }}
              className="rounded-full border border-gold/40 bg-gold/15 px-6 py-2.5 text-sm font-semibold text-gold-soft transition hover:bg-gold/25 active:scale-95"
            >
              {ch + 1 < CHALLENGES.length ? 'Next challenge →' : 'Start over ↺'}
            </button>
          )}
        </div>
      </div>

      {fireKey > 0 && solved && <Celebration level="small" fireKey={fireKey} />}
    </GameShell>
  )
}

function Pan({
  side,
  tiles,
  sum,
  refCb,
  onRemove,
}: {
  side: Side
  tiles: Tile[]
  sum: Frac
  refCb: (el: HTMLDivElement | null) => void
  onRemove: (id: number) => void
}) {
  return (
    <div
      className={[
        'absolute top-2 flex w-40 flex-col items-center',
        side === 'L' ? 'left-0 -translate-x-1/4' : 'right-0 translate-x-1/4',
      ].join(' ')}
    >
      <div className="h-10 w-px bg-white/20" />
      <div
        ref={refCb}
        className="flex min-h-[5rem] w-40 flex-wrap content-start justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/[0.05] p-2 backdrop-blur-sm"
      >
        {tiles.map((t) => (
          <button
            key={t.id}
            onClick={() => onRemove(t.id)}
            className="rounded-lg bg-gradient-to-b from-gold-soft to-gold-deep px-2.5 py-1.5 font-display text-sm font-semibold text-space-900 tabular-nums active:scale-90"
          >
            {label(t.value)}
          </button>
        ))}
      </div>
      <div className="mt-1 font-display text-base font-semibold text-cream/70 tabular-nums">
        = {label(sum)}
      </div>
    </div>
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
