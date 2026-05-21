import { useEffect, useRef, useState } from 'react'
import type { useSpeech } from '../hooks/useSpeech'
import type { useSound } from '../hooks/useSound'
import GameShell from '../components/GameShell'
import Celebration from '../components/Celebration'
import { frac, label, spokenLabel, toNum, type Frac } from '../lib/frac'

/**
 * Fill the Glass — a tap-and-hold game built for iPad.
 *
 * The faucet pours while the player presses the big "press & hold" button.
 * Release at the target line and you win the round. Too far either way and
 * Nova nudges them to reset and try again. The fill rate is gentle (≈3 s for
 * a full glass) so a nine-year-old has time to feel the level rising and let
 * go when it kisses the target.
 *
 * Why this matters as a fractions game: students experience a fraction as a
 * **stopping point** along a continuous quantity, not as a counted number of
 * pieces. It's the missing intuition between cookie sharing and a number line.
 */

interface Props {
  speech: ReturnType<typeof useSpeech>
  sound: ReturnType<typeof useSound>
  onExit: () => void
  onRoundCleared?: (round: number, total: number) => void
}

const LEVELS: Frac[] = [frac(1, 2), frac(3, 4), frac(1, 3), frac(2, 3), frac(1, 4)]
const TOLERANCE = 0.045 // ±4.5 % of full — generous for chunky finger releases
const FILL_PER_SEC = 0.32 // a full glass takes ≈3.1 seconds

export default function PourIn({ speech, sound, onExit, onRoundCleared }: Props) {
  const [round, setRound] = useState(0)
  const [level, setLevel] = useState(0)
  const [pouring, setPouring] = useState(false)
  const [result, setResult] = useState<null | 'good' | 'over' | 'under'>(null)
  const [fireKey, setFireKey] = useState(0)
  const raf = useRef<number | null>(null)
  const lastTs = useRef<number | null>(null)

  const target = LEVELS[round]
  const targetNum = toNum(target)

  // RAF loop — fill while the button is pressed.
  useEffect(() => {
    if (!pouring) {
      if (raf.current != null) cancelAnimationFrame(raf.current)
      raf.current = null
      lastTs.current = null
      return
    }
    const step = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts
      const dt = (ts - lastTs.current) / 1000
      lastTs.current = ts
      setLevel((l) => Math.min(1, l + dt * FILL_PER_SEC))
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
      raf.current = null
      lastTs.current = null
    }
  }, [pouring])

  // Auto-stop at the brim so we don't punish kids who hold too long *and*
  // overflow visually — overflow is a separate, immediate "over" verdict.
  useEffect(() => {
    if (pouring && level >= 1) {
      setPouring(false)
      setResult('over')
      sound.play('pop')
    }
  }, [level, pouring, sound])

  const start = () => {
    if (result === 'good') return
    if (result) {
      // Beginning a fresh try implicitly empties the glass.
      setLevel(0)
      setResult(null)
    }
    sound.play('tap')
    setPouring(true)
  }
  const stop = () => {
    if (!pouring) return
    setPouring(false)
    // Use the freshest level — read from React state via a microtask flush.
    queueMicrotask(() => {
      setLevel((l) => {
        const diff = l - targetNum
        if (Math.abs(diff) <= TOLERANCE) {
          setResult('good')
          sound.play('chime')
          sound.play('win')
          setFireKey((k) => k + 1)
          onRoundCleared?.(round, LEVELS.length)
        } else if (diff > 0) {
          setResult('over')
          sound.play('pop')
        } else {
          setResult('under')
          sound.play('pop')
        }
        return l
      })
    })
  }

  const empty = () => {
    setLevel(0)
    setResult(null)
  }
  const next = () => {
    setRound((r) => (r + 1) % LEVELS.length)
    setLevel(0)
    setResult(null)
  }

  const message =
    result === 'good'
      ? round + 1 < LEVELS.length
        ? `That's exactly ${spokenLabel(target)} of a glass. Beautiful. Ready for the next?`
        : `You poured every single one. You really feel the fractions now.`
      : result === 'over'
        ? `A little too much for ${spokenLabel(target)}. Tap empty and have another go.`
        : result === 'under'
          ? `Just under ${spokenLabel(target)}. Tap empty and try again.`
          : pouring
            ? `Stop at ${spokenLabel(target)}…`
            : `Press and hold the button below. Pour the glass up to ${spokenLabel(target)}.`

  // Geometry — viewBox numbers chosen so the visuals stay nice at any height.
  const GX = 30
  const GY = 22
  const GW = 40
  const GH = 130
  const waterY = GY + GH * (1 - level)
  const targetY = GY + GH * (1 - targetNum)

  return (
    <GameShell speech={speech} onExit={onExit} title="Fill the Glass" message={message}>
      <div className="flex h-full flex-col items-center justify-between px-4 pb-6 pt-2 sm:px-8">
        <div className="relative flex flex-1 items-center justify-center">
          <svg
            viewBox="0 0 100 165"
            className="h-[58vh] max-h-[480px] w-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#9DDCFF" />
                <stop offset="100%" stopColor="#2E78AE" />
              </linearGradient>
              <clipPath id="glassClip">
                <path
                  d={`M ${GX},${GY} h ${GW} l -3 ${GH} h ${-(GW - 6)} z`}
                />
              </clipPath>
            </defs>

            {/* faucet */}
            <g>
              <rect x="36" y="0" width="28" height="6" rx="1.5" fill="#b9c0c8" />
              <rect x="36" y="0" width="28" height="2" fill="#dde2e7" />
              <rect x="46" y="6" width="8" height="6" fill="#8b939c" />
              <rect x="42" y="12" width="16" height="3.5" rx="1" fill="#b9c0c8" />
              {/* falling stream */}
              {pouring && (
                <rect
                  x="48.5"
                  y="15.5"
                  width="3"
                  height={Math.max(0, waterY - 15.5)}
                  fill="url(#water)"
                  opacity="0.85"
                >
                  <animate
                    attributeName="opacity"
                    values="0.7;1;0.7"
                    dur="0.32s"
                    repeatCount="indefinite"
                  />
                </rect>
              )}
            </g>

            {/* glass body */}
            <path
              d={`M ${GX},${GY} h ${GW} l -3 ${GH} h ${-(GW - 6)} z`}
              fill="rgba(255,255,255,0.05)"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* glass shine */}
            <path
              d={`M ${GX + 4},${GY + 6} l -2 ${GH - 14}`}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
              strokeLinecap="round"
            />

            {/* water */}
            <g clipPath="url(#glassClip)">
              <rect x="0" y={waterY} width="100" height="200" fill="url(#water)" />
              <path
                d={`M 0 ${waterY} Q 25 ${waterY - 1.6} 50 ${waterY} T 100 ${waterY} V ${waterY + 8} H 0 Z`}
                fill="rgba(255,255,255,0.18)"
              />
              {pouring && (
                <circle cx="50" cy={waterY + 4} r="3" fill="rgba(255,255,255,0.35)">
                  <animate attributeName="r" values="2;6;2" dur="0.7s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="0.7s" repeatCount="indefinite" />
                </circle>
              )}
            </g>

            {/* target line */}
            <g>
              <line
                x1={GX - 8}
                x2={GX + GW + 6}
                y1={targetY}
                y2={targetY}
                stroke={result === 'good' ? '#5BD6A0' : '#EBC76A'}
                strokeWidth="1.6"
                strokeDasharray="3 2.5"
              />
              <text
                x={GX + GW + 9}
                y={targetY + 3}
                fontSize="9"
                fontWeight="700"
                fill={result === 'good' ? '#5BD6A0' : '#EBC76A'}
                fontFamily="Fraunces, Georgia, serif"
              >
                {label(target)}
              </text>
            </g>

            {/* base puddle plate */}
            <ellipse cx="50" cy={GY + GH + 4} rx="26" ry="3" fill="rgba(255,255,255,0.06)" />
          </svg>

          {/* round dots */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <div className="flex gap-1.5">
              {LEVELS.map((_, i) => (
                <span
                  key={i}
                  className={[
                    'h-2 w-2 rounded-full transition-colors',
                    i < round
                      ? 'bg-mint'
                      : i === round
                        ? 'bg-gold-soft'
                        : 'bg-white/15',
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
          <button
            onPointerDown={(e) => {
              e.preventDefault()
              start()
            }}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            disabled={result === 'good'}
            className={[
              'w-full select-none rounded-full border px-8 py-5 text-lg font-semibold transition-all',
              pouring
                ? 'border-cyan-300/60 bg-cyan-300/15 text-cyan-100 [transform:scale(0.98)]'
                : 'border-gold/45 bg-gold/15 text-gold-soft hover:bg-gold/25 active:scale-[0.98]',
              result === 'good' ? 'opacity-50' : '',
            ].join(' ')}
            style={{ touchAction: 'none' }}
          >
            {pouring ? '💧  Pouring — let go at the line' : '💧  Press & hold here to pour'}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={empty}
              className="rounded-full border border-white/12 bg-white/5 px-5 py-2 text-sm font-medium text-cream/85 transition hover:bg-white/10 active:scale-95"
            >
              ↺ Empty glass
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
