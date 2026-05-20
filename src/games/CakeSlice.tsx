import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { useSpeech } from '../hooks/useSpeech'
import type { useSound } from '../hooks/useSound'
import GameShell from '../components/GameShell'
import Celebration from '../components/Celebration'
import { frac, label, toNum, type Frac } from '../lib/frac'

/**
 * Slice the Cake — finger-drag-to-cut, geometry-graded.
 *
 * Press anywhere and drag across the cake to define a straight cut. The line
 * extends to the cake's edge on both sides, becoming a chord; we compute the
 * fraction of the cake area on the smaller side of the chord and compare it
 * to the round's target.
 *
 * Geometry: for chord at distance d from the centre of a disc of radius R,
 *   central angle θ = 2·acos(d / R)
 *   minor segment area = R²·(θ − sin θ) / 2
 *
 * Why this matters as a fractions game: most fraction visuals are pre-cut.
 * Here the student *chooses* the cut, gets immediate visual + numeric
 * feedback, and learns that "one quarter" is a continuous-shape relationship,
 * not a count of pieces.
 */

interface Props {
  speech: ReturnType<typeof useSpeech>
  sound: ReturnType<typeof useSound>
  onExit: () => void
}

interface Pt {
  x: number
  y: number
}

const LEVELS: Frac[] = [frac(1, 2), frac(1, 4), frac(1, 3), frac(3, 4), frac(1, 6)]
const TOLERANCE = 0.05

// SVG viewBox geometry.
const VBW = 320
const VBH = 280
const CX = 160
const CY = 144
const R = 108

export default function CakeSlice({ speech, sound, onExit }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [round, setRound] = useState(0)
  const [start, setStart] = useState<Pt | null>(null)
  const [drag, setDrag] = useState<Pt | null>(null)
  const [cut, setCut] = useState<{ p1: Pt; p2: Pt; minorIsSlice: boolean } | null>(null)
  const [ratio, setRatio] = useState<number | null>(null) // last graded slice
  const [result, setResult] = useState<null | 'good' | 'over' | 'under' | 'miss'>(null)
  const [fireKey, setFireKey] = useState(0)

  const target = LEVELS[round]
  const targetNum = toNum(target)

  const toViewBox = (e: React.PointerEvent): Pt | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * VBW
    const y = ((e.clientY - rect.top) / rect.height) * VBH
    return { x, y }
  }

  // Chord endpoints (where the player's line crosses the cake circle).
  const liveChord = useMemo(() => {
    if (!start || !drag) return null
    return chord(start, drag)
  }, [start, drag])

  const onPointerDown = (e: React.PointerEvent) => {
    if (result === 'good') return
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setCut(null)
    setRatio(null)
    setResult(null)
    const p = toViewBox(e)
    if (!p) return
    setStart(p)
    setDrag(p)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start) return
    const p = toViewBox(e)
    if (!p) return
    setDrag(p)
  }
  const onPointerUp = () => {
    if (!start || !drag) return
    const c = chord(start, drag)
    setStart(null)
    setDrag(null)
    if (!c) {
      setResult('miss')
      sound.play('pop')
      return
    }
    sound.play('smash')
    const a = chordArea(c.d) // area of the minor segment
    const total = Math.PI * R * R
    const minorRatio = a / total
    const majorRatio = 1 - minorRatio
    // "The slice" is whichever side the target points at. If target > 0.5,
    // the player is being asked to cut off a piece bigger than half.
    const minorIsSlice = targetNum <= 0.5
    const sliceRatio = minorIsSlice ? minorRatio : majorRatio
    setCut({ p1: c.p1, p2: c.p2, minorIsSlice })
    setRatio(sliceRatio)

    const diff = sliceRatio - targetNum
    if (Math.abs(diff) <= TOLERANCE) {
      setResult('good')
      sound.play('chime')
      sound.play('win')
      setFireKey((k) => k + 1)
    } else if (diff > 0) {
      setResult('over')
    } else {
      setResult('under')
    }
  }

  const tryAgain = () => {
    setCut(null)
    setRatio(null)
    setResult(null)
  }
  const next = () => {
    setRound((r) => (r + 1) % LEVELS.length)
    setCut(null)
    setRatio(null)
    setResult(null)
  }

  const ratioPct = ratio != null ? Math.round(ratio * 100) : null
  const targetPct = Math.round(targetNum * 100)

  const message =
    result === 'good'
      ? round + 1 < LEVELS.length
        ? `You sliced exactly ${label(target)} of the cake. Magnificent. Next?`
        : `Every cake, sliced perfectly. You really see fractions in shapes now.`
      : result === 'over'
        ? `Close! That slice is about ${ratioPct}% — a bit big for ${label(target)} (${targetPct}%). Slice again.`
        : result === 'under'
          ? `Close! That slice is about ${ratioPct}% — a bit small for ${label(target)} (${targetPct}%). Slice again.`
          : result === 'miss'
            ? `Hmm, your swipe didn't cross the cake. Try a longer drag from edge to edge.`
            : `Swipe across the cake to slice off ${label(target)} of it.`

  // Visuals for the cut overlay and the highlighted slice.
  const slicePath = useMemo(() => {
    if (!cut) return null
    return segmentPath(cut.p1, cut.p2, cut.minorIsSlice ? 0 : 1)
  }, [cut])
  const remainderPath = useMemo(() => {
    if (!cut) return null
    return segmentPath(cut.p1, cut.p2, cut.minorIsSlice ? 1 : 0)
  }, [cut])
  const sliceTranslate = useMemo(() => {
    if (!cut) return { x: 0, y: 0 }
    // Push the slice perpendicular to the chord, away from cake centre.
    const mx = (cut.p1.x + cut.p2.x) / 2
    const my = (cut.p1.y + cut.p2.y) / 2
    let vx = mx - CX
    let vy = my - CY
    const m = Math.hypot(vx, vy) || 1
    vx /= m
    vy /= m
    return { x: vx * 24, y: vy * 24 }
  }, [cut])

  return (
    <GameShell speech={speech} onExit={onExit} title="Slice the Cake" message={message}>
      <div className="flex h-full flex-col items-center justify-between px-4 pb-6 pt-2 sm:px-8">
        <div className="relative flex flex-1 items-center justify-center">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VBW} ${VBH}`}
            className="h-[60vh] max-h-[520px] w-auto touch-none"
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ touchAction: 'none' }}
          >
            <defs>
              <radialGradient id="cakeTop" cx="0.4" cy="0.35">
                <stop offset="0%" stopColor="#FFE9C8" />
                <stop offset="55%" stopColor="#F2C28A" />
                <stop offset="100%" stopColor="#C98A4E" />
              </radialGradient>
              <linearGradient id="cakeSide" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#A86A45" />
                <stop offset="100%" stopColor="#6B3E22" />
              </linearGradient>
              <pattern id="sprinkles" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="6" cy="9" r="1.4" fill="#E04848" />
                <circle cx="18" cy="22" r="1.4" fill="#5BD6A0" />
                <circle cx="24" cy="6" r="1.4" fill="#EBC76A" />
                <circle cx="10" cy="24" r="1.4" fill="#7FA8FF" />
              </pattern>
            </defs>

            {/* plate */}
            <ellipse cx={CX} cy={CY + 8} rx={R + 22} ry={14} fill="rgba(255,255,255,0.06)" />
            <ellipse cx={CX} cy={CY + 4} rx={R + 14} ry={10} fill="rgba(255,255,255,0.04)" />

            {/* cake side (small offset for depth) */}
            <ellipse cx={CX} cy={CY + 6} rx={R} ry={R * 0.42} fill="url(#cakeSide)" />

            {/* base un-cut cake */}
            {!cut && (
              <g>
                <circle cx={CX} cy={CY} r={R} fill="url(#cakeTop)" />
                <circle cx={CX} cy={CY} r={R} fill="url(#sprinkles)" opacity="0.7" />
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(120,70,30,0.45)" strokeWidth="2" />
                {/* a couple of frosting swirls for warmth */}
                <circle cx={CX - 40} cy={CY - 30} r="14" fill="rgba(255,255,255,0.25)" />
                <circle cx={CX + 30} cy={CY + 35} r="10" fill="rgba(255,255,255,0.2)" />
              </g>
            )}

            {/* sliced cake: highlight slice + remainder */}
            {cut && remainderPath && (
              <g>
                <path d={remainderPath} fill="url(#cakeTop)" />
                <path d={remainderPath} fill="url(#sprinkles)" opacity="0.7" />
                <path d={remainderPath} fill="none" stroke="rgba(120,70,30,0.45)" strokeWidth="2" />
              </g>
            )}
            {cut && slicePath && (
              <motion.g
                initial={{ x: 0, y: 0 }}
                animate={{ x: sliceTranslate.x, y: sliceTranslate.y }}
                transition={{ type: 'spring', stiffness: 110, damping: 14 }}
              >
                <path d={slicePath} fill="url(#cakeTop)" />
                <path d={slicePath} fill="url(#sprinkles)" opacity="0.7" />
                <path
                  d={slicePath}
                  fill="none"
                  stroke={result === 'good' ? '#5BD6A0' : '#EBC76A'}
                  strokeWidth="3"
                />
              </motion.g>
            )}

            {/* live preview chord */}
            {liveChord && start && (
              <g>
                <line
                  x1={liveChord.p1.x}
                  y1={liveChord.p1.y}
                  x2={liveChord.p2.x}
                  y2={liveChord.p2.y}
                  stroke="#EBC76A"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  opacity="0.85"
                />
                <circle cx={liveChord.p1.x} cy={liveChord.p1.y} r="4" fill="#EBC76A" />
                <circle cx={liveChord.p2.x} cy={liveChord.p2.y} r="4" fill="#EBC76A" />
              </g>
            )}

            {/* target / current readout */}
            <g>
              <rect
                x={VBW - 92}
                y={8}
                width={84}
                height={36}
                rx={10}
                fill="rgba(7,11,22,0.6)"
                stroke="rgba(235,199,106,0.45)"
                strokeWidth={1.2}
              />
              <text
                x={VBW - 50}
                y={24}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(245,240,230,0.55)"
                letterSpacing="1.5"
              >
                TARGET
              </text>
              <text
                x={VBW - 50}
                y={39}
                textAnchor="middle"
                fontSize="16"
                fontWeight="700"
                fontFamily="Fraunces, Georgia, serif"
                fill="#EBC76A"
              >
                {label(target)}
              </text>
            </g>
          </svg>

          {/* round dots */}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            <div className="flex gap-1.5">
              {LEVELS.map((_, i) => (
                <span
                  key={i}
                  className={[
                    'h-2 w-2 rounded-full transition-colors',
                    i < round ? 'bg-mint' : i === round ? 'bg-gold-soft' : 'bg-white/15',
                  ].join(' ')}
                />
              ))}
            </div>
            <span className="text-[0.65rem] uppercase tracking-[0.16em] text-cream/40">
              Round {round + 1} / {LEVELS.length}
            </span>
          </div>
        </div>

        <div className="mt-2 flex w-full max-w-md flex-col items-center gap-3">
          <p className="text-center text-xs uppercase tracking-[0.18em] text-cream/45">
            Drag finger across the cake · slice {label(target)}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={tryAgain}
              disabled={result === 'good' || (result === null && !cut)}
              className="rounded-full border border-white/12 bg-white/5 px-5 py-2 text-sm font-medium text-cream/85 transition hover:bg-white/10 active:scale-95 disabled:opacity-40"
            >
              ↺ Reshape the cake
            </button>
            {result === 'good' && (
              <button
                onClick={next}
                style={{ animation: 'replyInUp 360ms ease-out both' }}
                className="rounded-full border border-gold/40 bg-gold/15 px-5 py-2 text-sm font-semibold text-gold-soft transition hover:bg-gold/25 active:scale-95"
              >
                Next round →
              </button>
            )}
          </div>
        </div>
      </div>

      {fireKey > 0 && result === 'good' && <Celebration level="small" fireKey={fireKey} />}
    </GameShell>
  )
}

/* ---------- geometry ---------- */

/** Extend a → b into a line and intersect it with the cake circle.
 *  Returns the chord (the segment inside the cake) and the chord's distance
 *  from centre. Returns null if the line misses or is degenerate. */
function chord(a: Pt, b: Pt): { p1: Pt; p2: Pt; d: number } | null {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 4) return null
  const fx = a.x - CX
  const fy = a.y - CY
  const A = dx * dx + dy * dy
  const B = 2 * (fx * dx + fy * dy)
  const C = fx * fx + fy * fy - R * R
  const disc = B * B - 4 * A * C
  if (disc < 0) return null
  const sq = Math.sqrt(disc)
  const t1 = (-B - sq) / (2 * A)
  const t2 = (-B + sq) / (2 * A)
  const p1 = { x: a.x + t1 * dx, y: a.y + t1 * dy }
  const p2 = { x: a.x + t2 * dx, y: a.y + t2 * dy }
  // Distance from (CX, CY) to the chord line.
  const d = Math.abs(dx * (CY - a.y) - dy * (CX - a.x)) / len
  return { p1, p2, d }
}

/** Area of the minor circular segment for a chord at distance d from centre. */
function chordArea(d: number): number {
  if (d >= R) return 0
  const theta = 2 * Math.acos(Math.max(-1, Math.min(1, d / R)))
  return (R * R * (theta - Math.sin(theta))) / 2
}

/** SVG path for a circular segment between chord endpoints.
 *  `largeArcFlag`: 0 = minor segment, 1 = major segment. */
function segmentPath(p1: Pt, p2: Pt, largeArcFlag: 0 | 1): string {
  // Pick sweep-flag so the arc goes on the *correct* side. With the same
  // p1 → p2 order, sweep-flag=0 gives one arc, sweep-flag=1 the other. For
  // large-arc-flag=0 we want the shorter arc — either sweep works because both
  // trace the same minor arc (just in opposite directions). For large-arc-flag=1
  // we want the longer arc, same story. So sweep-flag is just an aesthetic
  // choice; using 0 keeps the trace consistent.
  return `M ${p1.x},${p1.y} A ${R},${R} 0 ${largeArcFlag},0 ${p2.x},${p2.y} Z`
}
