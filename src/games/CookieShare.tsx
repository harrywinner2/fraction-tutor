import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { useSpeech } from '../hooks/useSpeech'
import type { useSound } from '../hooks/useSound'
import type { Mood } from '../types'
import { KIDS, KidAvatar } from '../components/Characters'
import GameShell from '../components/GameShell'
import Celebration from '../components/Celebration'
import { add, cmp, eq, frac, half, isZero, label, type Frac } from '../lib/frac'

interface Props {
  speech: ReturnType<typeof useSpeech>
  sound: ReturnType<typeof useSound>
  onExit: () => void
}

interface Chip {
  id: number
  value: Frac
  owner: number | null // kid index, or null = still in the tray
}

const ROUNDS = [
  { kids: 4, cookies: 2 }, // each friend = 1/2
  { kids: 4, cookies: 3 }, // each friend = 3/4
]

export default function CookieShare({ speech, sound, onExit }: Props) {
  const [round, setRound] = useState(0)
  const [chips, setChips] = useState<Chip[]>([])
  const [won, setWon] = useState(false)
  const [fireKey, setFireKey] = useState(0)
  const idSeq = useRef(1)
  const zones = useRef<(HTMLDivElement | null)[]>([])

  const cfg = ROUNDS[round]
  const target = useMemo(() => frac(cfg.cookies, cfg.kids), [cfg])

  // (Re)deal a round.
  useEffect(() => {
    const fresh: Chip[] = Array.from({ length: cfg.cookies }, () => ({
      id: idSeq.current++,
      value: frac(1, 1),
      owner: null,
    }))
    setChips(fresh)
    setWon(false)
  }, [round, cfg.cookies])

  const totals = useMemo(() => {
    const t: Frac[] = Array.from({ length: cfg.kids }, () => frac(0, 1))
    chips.forEach((c) => {
      if (c.owner != null) t[c.owner] = add(t[c.owner], c.value)
    })
    return t
  }, [chips, cfg.kids])

  const allAssigned = chips.length > 0 && chips.every((c) => c.owner != null)
  const fair = allAssigned && totals.every((t) => eq(t, target))

  useEffect(() => {
    if (fair && !won) {
      setWon(true)
      sound.play('win')
      sound.play('chime')
      setFireKey((k) => k + 1)
    }
  }, [fair, won, sound])

  // Nova's line, derived from the state of play.
  const message = won
    ? round + 1 < ROUNDS.length
      ? `Perfect — ${cfg.cookies} cookies shared between ${cfg.kids} friends, so everyone gets ${label(target)} of a cookie. Ready for a tougher one?`
      : `You did it! ${cfg.cookies} cookies between ${cfg.kids} friends is ${label(target)} each. Sharing fairly IS a fraction. Brilliant.`
    : allAssigned
      ? "Close! Someone has more than the others. Every friend needs the exact same amount — tap a piece to send it back and try again."
      : `Share ${cfg.cookies} cookies fairly between ${cfg.kids} friends. Tap a cookie to cut it in half, then drag the pieces so everyone gets the same.`

  const maxTotal = totals.reduce((m, t) => (cmp(t, m) > 0 ? t : m), frac(0, 1))
  const moodFor = (i: number): Mood => {
    if (won) return 'cheer'
    if (isZero(totals[i])) return 'curious'
    return cmp(totals[i], maxTotal) < 0 ? 'sad' : 'happy'
  }

  const cut = (id: number) =>
    setChips((cs) => {
      const c = cs.find((x) => x.id === id)
      if (!c || c.owner != null) return cs
      const a: Chip = { id: idSeq.current++, value: half(c.value), owner: null }
      const b: Chip = { id: idSeq.current++, value: half(c.value), owner: null }
      return [...cs.filter((x) => x.id !== id), a, b]
    })

  const cutAll = () =>
    setChips((cs) =>
      cs.flatMap((c) =>
        c.owner == null
          ? [
              { id: idSeq.current++, value: half(c.value), owner: null },
              { id: idSeq.current++, value: half(c.value), owner: null },
            ]
          : [c],
      ),
    )

  const dropAt = (id: number, point: { x: number; y: number }) => {
    const hit = zones.current.findIndex((z) => {
      if (!z) return false
      const r = z.getBoundingClientRect()
      return point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom
    })
    setChips((cs) =>
      cs.map((c) => (c.id === id ? { ...c, owner: hit >= 0 ? hit : null } : c)),
    )
    if (hit >= 0) sound.play('pop')
  }

  const trayChips = chips.filter((c) => c.owner == null)

  return (
    <GameShell speech={speech} onExit={onExit} title="Cookie Share" message={message}>
      <div className="flex h-full flex-col justify-between px-4 pb-4 pt-2 sm:px-8">
        {/* friends */}
        <div className="flex justify-center gap-2 sm:gap-6">
          {Array.from({ length: cfg.kids }).map((_, i) => (
            <div
              key={i}
              ref={(el) => {
                zones.current[i] = el
              }}
              className="flex w-[22vw] max-w-[150px] flex-col items-center rounded-2xl border border-white/8 bg-white/[0.03] px-1 pb-2 pt-1"
            >
              <div className="scale-[0.8] sm:scale-100">
                <KidAvatar kid={KIDS[i % KIDS.length]} mood={moodFor(i)} index={i} />
              </div>
              <div
                className={[
                  'mb-1 rounded-full px-3 py-1 font-display text-lg font-semibold tabular-nums transition-colors',
                  won || (totals[i].n > 0 && eq(totals[i], target))
                    ? 'bg-mint/15 text-mint'
                    : 'bg-white/5 text-cream/70',
                ].join(' ')}
              >
                {label(totals[i])}
              </div>
              <div className="flex min-h-[2.2rem] flex-wrap justify-center gap-1">
                {chips
                  .filter((c) => c.owner === i)
                  .map((c) => (
                    <Cookie key={c.id} chip={c} onTap={() => returnToTray(c.id)} onDrop={dropAt} />
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* tray */}
        <div className="mt-3 flex flex-col items-center gap-3">
          <div className="flex min-h-[5.5rem] flex-wrap items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-4">
            {trayChips.length === 0 && !won && (
              <span className="text-sm text-cream/35">All shared out — check the plates!</span>
            )}
            {trayChips.map((c) => (
              <Cookie key={c.id} chip={c} onTap={() => cut(c.id)} onDrop={dropAt} inTray />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={cutAll}
              disabled={won || trayChips.length === 0}
              className="rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-medium text-cream/85 transition hover:bg-white/10 active:scale-95 disabled:opacity-40"
            >
              ✂ Cut every piece in half
            </button>
            {won && (
              <button
                onClick={() => {
                  if (round + 1 < ROUNDS.length) setRound(round + 1)
                  else setRound(0)
                }}
                style={{ animation: 'replyInUp 360ms ease-out both' }}
                className="rounded-full border border-gold/40 bg-gold/15 px-6 py-2.5 text-sm font-semibold text-gold-soft transition hover:bg-gold/25 active:scale-95"
              >
                {round + 1 < ROUNDS.length ? 'Next round →' : 'Play again ↺'}
              </button>
            )}
          </div>
        </div>
      </div>

      {fireKey > 0 && won && <Celebration level="big" fireKey={fireKey} />}
    </GameShell>
  )

  function returnToTray(id: number) {
    setChips((cs) => cs.map((c) => (c.id === id ? { ...c, owner: null } : c)))
  }
}

function Cookie({
  chip,
  onTap,
  onDrop,
  inTray,
}: {
  chip: Chip
  onTap: () => void
  onDrop: (id: number, p: { x: number; y: number }) => void
  inTray?: boolean
}) {
  const whole = chip.value.d === 1
  return (
    <motion.div
      drag
      dragSnapToOrigin
      onTap={onTap}
      whileDrag={{ scale: 1.15, zIndex: 60 }}
      onDragEnd={(_, info) => onDrop(chip.id, info.point)}
      className="relative grid h-14 w-14 cursor-grab touch-none place-items-center rounded-full active:cursor-grabbing"
      style={{
        background: 'radial-gradient(circle at 35% 30%, #C98A4E, #8a5a2c 70%, #6b4420)',
        boxShadow:
          '0 6px 14px -2px rgba(7,11,22,0.7), inset 0 2px 4px rgba(255,255,255,0.22)',
      }}
    >
      {/* choc chips */}
      <span className="absolute left-3 top-3 h-1.5 w-1.5 rounded-full bg-[#3a2412]" />
      <span className="absolute right-3 top-5 h-1.5 w-1.5 rounded-full bg-[#3a2412]" />
      <span className="absolute bottom-3 left-5 h-1.5 w-1.5 rounded-full bg-[#3a2412]" />
      <span className="font-display text-base font-semibold text-[#fceedd] drop-shadow">
        {whole ? '1' : label(chip.value)}
      </span>
      {inTray && (
        <span className="absolute -bottom-5 text-[0.65rem] text-cream/40">tap to cut</span>
      )}
    </motion.div>
  )
}
