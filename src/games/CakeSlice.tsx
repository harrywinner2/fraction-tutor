import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { useSpeech } from '../hooks/useSpeech'
import type { useSound } from '../hooks/useSound'
import GameShell from '../components/GameShell'
import Celebration from '../components/Celebration'
import { frac, label, spokenLabel, toNum, type Frac } from '../lib/frac'

/**
 * Slice the Cake — rectangular sheet cake, vertical cut, dotted guide.
 *
 * The cake is a wide rectangle. A dotted golden line shows exactly where the
 * round's target cut should land. The player drags a finger top-to-bottom
 * across the cake to define their cut — only the x-position matters, the y
 * sweep just confirms the gesture is a real swipe across the cake. Release at
 * the line and the left slice slides off; we grade by how close that slice is
 * to the target fraction of the whole.
 *
 * Why a rectangle: a vertical slice on a long bar is the most legible "this
 * much of the whole" image for a nine-year-old. No circular segment maths,
 * no angle confusion — just "where do I cut?"
 */

interface Props {
  speech: ReturnType<typeof useSpeech>
  sound: ReturnType<typeof useSound>
  onExit: () => void
  onRoundCleared?: (round: number, total: number) => void
}

interface Pt {
  x: number
  y: number
}

const LEVELS: Frac[] = [frac(1, 2), frac(1, 4), frac(1, 3), frac(3, 4), frac(1, 6)]
const TOLERANCE = 0.05

// SVG viewBox geometry.
const VBW = 320
const VBH = 230
const CAKE_X = 22
const CAKE_Y = 60
const CAKE_W = 276
const CAKE_TOP_H = 84
const CAKE_SIDE_H = 28
const CAKE_BOTTOM_Y = CAKE_Y + CAKE_TOP_H + CAKE_SIDE_H

export default function CakeSlice({ speech, sound, onExit, onRoundCleared }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [round, setRound] = useState(0)
  const [drag, setDrag] = useState<{ start: Pt; current: Pt } | null>(null)
  const [cut, setCut] = useState<{ x: number; ratio: number } | null>(null)
  const [result, setResult] = useState<null | 'good' | 'over' | 'under' | 'miss'>(null)
  const [fireKey, setFireKey] = useState(0)

  const target = LEVELS[round]
  const targetNum = toNum(target)
  const targetX = CAKE_X + CAKE_W * targetNum

  const toViewBox = (e: React.PointerEvent): Pt | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * VBW
    const y = ((e.clientY - rect.top) / rect.height) * VBH
    return { x, y }
  }

  const clampCutX = (x: number) => Math.max(CAKE_X + 2, Math.min(CAKE_X + CAKE_W - 2, x))

  const onPointerDown = (e: React.PointerEvent) => {
    if (result === 'good') return
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setCut(null)
    setResult(null)
    const p = toViewBox(e)
    if (!p) return
    setDrag({ start: p, current: p })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const p = toViewBox(e)
    if (!p) return
    setDrag((d) => (d ? { ...d, current: p } : d))
  }
  const onPointerUp = () => {
    if (!drag) return
    const { start, current } = drag
    setDrag(null)

    // Require a real swipe across the cake's vertical span (otherwise it's a
    // miss). Vertical reach must cover ≥ 60 % of the cake's top-layer height
    // and the swipe must touch the cake's row at some point.
    const ySpan = Math.abs(current.y - start.y)
    const touchesCake =
      Math.min(start.y, current.y) <= CAKE_Y + CAKE_TOP_H &&
      Math.max(start.y, current.y) >= CAKE_Y
    if (!touchesCake || ySpan < CAKE_TOP_H * 0.6) {
      setResult('miss')
      sound.play('pop')
      return
    }

    const cutX = clampCutX((start.x + current.x) / 2)
    const ratio = (cutX - CAKE_X) / CAKE_W
    sound.play('smash')
    setCut({ x: cutX, ratio })

    const diff = ratio - targetNum
    if (Math.abs(diff) <= TOLERANCE) {
      setResult('good')
      sound.play('chime')
      sound.play('win')
      setFireKey((k) => k + 1)
      onRoundCleared?.(round, LEVELS.length)
    } else if (diff > 0) {
      setResult('over')
    } else {
      setResult('under')
    }
  }

  const tryAgain = () => {
    setCut(null)
    setResult(null)
  }
  const next = () => {
    setRound((r) => (r + 1) % LEVELS.length)
    setCut(null)
    setResult(null)
  }

  const message =
    result === 'good'
      ? round + 1 < LEVELS.length
        ? `You sliced exactly ${spokenLabel(target)} of the cake. Magnificent. Next?`
        : `Every cake, sliced perfectly. You really see fractions in shapes now.`
      : result === 'over'
        ? `Close! That slice is a bit too big for ${spokenLabel(target)}. Slice again.`
        : result === 'under'
          ? `Close! That slice is a bit too small for ${spokenLabel(target)}. Slice again.`
          : result === 'miss'
            ? `Hmm, your swipe didn't cross the cake. Try a longer drag from edge to edge.`
            : `Swipe down across the cake along the dotted line to slice off ${spokenLabel(target)} of it.`

  // Geometry derived for the cut rendering.
  const leftWidth = cut ? cut.x - CAKE_X : 0
  const rightWidth = cut ? CAKE_X + CAKE_W - cut.x : 0
  const dragX = drag ? clampCutX((drag.start.x + drag.current.x) / 2) : null

  const resultColour = useMemo(() => {
    if (result === 'good') return '#5BD6A0'
    if (result === 'over' || result === 'under') return '#E48F70'
    return '#EBC76A'
  }, [result])

  return (
    <GameShell speech={speech} onExit={onExit} title="Slice the Cake" message={message}>
      <div className="flex h-full flex-col items-center justify-between px-4 pb-6 pt-2 sm:px-8">
        <div className="relative flex flex-1 items-center justify-center">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VBW} ${VBH}`}
            className="h-[58vh] max-h-[500px] w-auto touch-none"
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ touchAction: 'none' }}
          >
            <defs>
              <linearGradient id="cakeTop" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#FFE9C8" />
                <stop offset="55%" stopColor="#F2C28A" />
                <stop offset="100%" stopColor="#D69A5C" />
              </linearGradient>
              <linearGradient id="cakeSide" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#A86A45" />
                <stop offset="100%" stopColor="#6B3E22" />
              </linearGradient>
              <pattern id="sprinkles" width="34" height="34" patternUnits="userSpaceOnUse">
                <circle cx="6" cy="9" r="1.6" fill="#E04848" />
                <circle cx="20" cy="22" r="1.6" fill="#5BD6A0" />
                <circle cx="26" cy="6" r="1.6" fill="#EBC76A" />
                <circle cx="12" cy="26" r="1.6" fill="#7FA8FF" />
              </pattern>
            </defs>

            {/* plate */}
            <ellipse
              cx={VBW / 2}
              cy={CAKE_BOTTOM_Y + 14}
              rx={CAKE_W / 2 + 24}
              ry={10}
              fill="rgba(255,255,255,0.07)"
            />

            {/* cake side (always visible behind the top) */}
            <rect
              x={CAKE_X}
              y={CAKE_Y + CAKE_TOP_H}
              width={CAKE_W}
              height={CAKE_SIDE_H}
              rx={3}
              fill="url(#cakeSide)"
            />

            {/* un-cut cake top */}
            {!cut && (
              <g>
                <rect
                  x={CAKE_X}
                  y={CAKE_Y}
                  width={CAKE_W}
                  height={CAKE_TOP_H}
                  rx={4}
                  fill="url(#cakeTop)"
                />
                <rect
                  x={CAKE_X}
                  y={CAKE_Y}
                  width={CAKE_W}
                  height={CAKE_TOP_H}
                  rx={4}
                  fill="url(#sprinkles)"
                  opacity="0.7"
                />
                <rect
                  x={CAKE_X}
                  y={CAKE_Y}
                  width={CAKE_W}
                  height={CAKE_TOP_H}
                  rx={4}
                  fill="none"
                  stroke="rgba(120,70,30,0.45)"
                  strokeWidth="2"
                />
                {/* a little frosting accent */}
                <ellipse cx={CAKE_X + 60} cy={CAKE_Y + 24} rx="14" ry="6" fill="rgba(255,255,255,0.3)" />
                <ellipse cx={CAKE_X + CAKE_W - 80} cy={CAKE_Y + 60} rx="10" ry="4" fill="rgba(255,255,255,0.22)" />
              </g>
            )}

            {/* sliced cake — left piece stays put, right piece slides right */}
            {cut && (
              <g>
                {/* left slice (the graded piece) */}
                <motion.g
                  initial={{ x: 0 }}
                  animate={{ x: -3 }}
                  transition={{ type: 'spring', stiffness: 110, damping: 14 }}
                >
                  <rect
                    x={CAKE_X}
                    y={CAKE_Y}
                    width={leftWidth}
                    height={CAKE_TOP_H}
                    rx={3}
                    fill="url(#cakeTop)"
                  />
                  <rect
                    x={CAKE_X}
                    y={CAKE_Y}
                    width={leftWidth}
                    height={CAKE_TOP_H}
                    rx={3}
                    fill="url(#sprinkles)"
                    opacity="0.7"
                  />
                  <rect
                    x={CAKE_X}
                    y={CAKE_Y}
                    width={leftWidth}
                    height={CAKE_TOP_H}
                    rx={3}
                    fill="none"
                    stroke={resultColour}
                    strokeWidth="3"
                  />
                </motion.g>

                {/* right remainder */}
                <motion.g
                  initial={{ x: 0 }}
                  animate={{ x: 18 }}
                  transition={{ type: 'spring', stiffness: 110, damping: 14 }}
                >
                  <rect
                    x={cut.x}
                    y={CAKE_Y}
                    width={rightWidth}
                    height={CAKE_TOP_H}
                    rx={3}
                    fill="url(#cakeTop)"
                  />
                  <rect
                    x={cut.x}
                    y={CAKE_Y}
                    width={rightWidth}
                    height={CAKE_TOP_H}
                    rx={3}
                    fill="url(#sprinkles)"
                    opacity="0.7"
                  />
                  <rect
                    x={cut.x}
                    y={CAKE_Y}
                    width={rightWidth}
                    height={CAKE_TOP_H}
                    rx={3}
                    fill="none"
                    stroke="rgba(120,70,30,0.45)"
                    strokeWidth="2"
                  />
                </motion.g>
              </g>
            )}

            {/* pre-dotted target cut line — the hint */}
            {!cut && (
              <g>
                <line
                  x1={targetX}
                  y1={CAKE_Y - 16}
                  x2={targetX}
                  y2={CAKE_BOTTOM_Y + 4}
                  stroke="#EBC76A"
                  strokeWidth="3"
                  strokeDasharray="2 6"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <polygon
                  points={`${targetX - 5},${CAKE_Y - 22} ${targetX + 5},${CAKE_Y - 22} ${targetX},${CAKE_Y - 12}`}
                  fill="#EBC76A"
                />
                <rect
                  x={targetX - 22}
                  y={CAKE_BOTTOM_Y + 8}
                  width={44}
                  height={22}
                  rx={6}
                  fill="rgba(7,11,22,0.85)"
                  stroke="rgba(235,199,106,0.6)"
                  strokeWidth={1.2}
                />
                <text
                  x={targetX}
                  y={CAKE_BOTTOM_Y + 23}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fontFamily="Fraunces, Georgia, serif"
                  fill="#EBC76A"
                >
                  {label(target)}
                </text>
              </g>
            )}

            {/* live drag preview */}
            {dragX != null && (
              <g pointerEvents="none">
                <line
                  x1={dragX}
                  y1={CAKE_Y - 6}
                  x2={dragX}
                  y2={CAKE_BOTTOM_Y + 4}
                  stroke="#FFF8E5"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  opacity="0.9"
                />
                <circle cx={dragX} cy={CAKE_Y - 12} r="4" fill="#FFF8E5" />
              </g>
            )}

            {/* result badge after the cut */}
            {cut && (
              <g pointerEvents="none">
                <rect
                  x={cut.x - 28}
                  y={CAKE_BOTTOM_Y + 8}
                  width={56}
                  height={22}
                  rx={6}
                  fill="rgba(7,11,22,0.85)"
                  stroke={resultColour}
                  strokeWidth={1.4}
                />
                <text
                  x={cut.x}
                  y={CAKE_BOTTOM_Y + 23}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="Fraunces, Georgia, serif"
                  fill={resultColour}
                >
                  {result === 'good' ? `✓ ${label(target)}` : `aim ${label(target)}`}
                </text>
              </g>
            )}
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
            Drag from above the cake straight down · slice {label(target)}
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
