import { useEffect, useRef, useState } from 'react'
import type { useSpeech } from '../hooks/useSpeech'
import type { useSound } from '../hooks/useSound'
import GameShell from '../components/GameShell'
import Celebration from '../components/Celebration'
import { frac, label, toNum, type Frac } from '../lib/frac'

/**
 * Tilt to Pour — the iPad's accelerometer is the controller.
 *
 * The glass starts full. Tilt the device past ~18° and water starts pouring
 * out; level it back upright and the pour stops. Stop when the water is at
 * the target fraction line, hold steady for a moment, and Nova confirms it.
 *
 * Permission flow: iOS 13+ gates `DeviceOrientationEvent` behind a user-gesture
 * `requestPermission()` call, so we render a one-time "Enable tilt" button.
 * Browsers without orientation events (desktop) get a drag-to-tilt handle so
 * the game stays playable anywhere — useful when prototyping in Chrome.
 *
 * Why this matters as a fractions game: it teaches the inverse intuition of
 * Pour-In — the fraction that *remains*, after some has been removed. Same
 * continuum, opposite direction.
 */

interface Props {
  speech: ReturnType<typeof useSpeech>
  sound: ReturnType<typeof useSound>
  onExit: () => void
}

// Target = how much should be LEFT in the glass after pouring.
const LEVELS: Frac[] = [frac(1, 2), frac(1, 3), frac(2, 3), frac(1, 4), frac(3, 4)]
const TOLERANCE = 0.05
const TILT_DEAD_DEG = 6 // upright tolerance for the evaluation lock
const TILT_POUR_DEG = 18 // start pouring beyond this
const MAX_DRAIN_PER_SEC = 0.42 // ≈2.4 s to fully drain at max tilt

type Permission = 'unknown' | 'granted' | 'denied' | 'unavailable'

export default function PourOut({ speech, sound, onExit }: Props) {
  const [round, setRound] = useState(0)
  const [level, setLevel] = useState(1)
  const [tilt, setTilt] = useState(0)
  const [permission, setPermission] = useState<Permission>('unknown')
  const [result, setResult] = useState<null | 'good' | 'over' | 'under'>(null)
  const [fireKey, setFireKey] = useState(0)

  const raf = useRef<number | null>(null)
  const lastTs = useRef<number | null>(null)
  const tiltRef = useRef(0)
  const levelRef = useRef(1)
  const lockTimer = useRef<number | null>(null)
  const draggingRef = useRef(false)

  const target = LEVELS[round]
  const targetNum = toNum(target)

  // Keep refs in sync so the RAF + timers don't need to be re-created.
  useEffect(() => {
    tiltRef.current = tilt
  }, [tilt])
  useEffect(() => {
    levelRef.current = level
  }, [level])

  // Device orientation listener.
  useEffect(() => {
    if (permission !== 'granted') return
    const handler = (e: DeviceOrientationEvent) => {
      // gamma is the left/right tilt around the y-axis, [-90, 90].
      if (typeof e.gamma !== 'number') return
      if (draggingRef.current) return // manual override wins
      const clamped = Math.max(-60, Math.min(60, e.gamma))
      setTilt(clamped)
    }
    window.addEventListener('deviceorientation', handler)
    return () => window.removeEventListener('deviceorientation', handler)
  }, [permission])

  // Detect lack of tilt support on mount so the UI doesn't beg for permission.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('DeviceOrientationEvent' in window)) setPermission('unavailable')
  }, [])

  // Main physics loop — drain while tilted, evaluate when level for a moment.
  useEffect(() => {
    const step = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts
      const dt = (ts - lastTs.current) / 1000
      lastTs.current = ts

      const absT = Math.abs(tiltRef.current)
      if (absT > TILT_POUR_DEG && levelRef.current > 0 && result !== 'good') {
        const intensity = Math.min(1, (absT - TILT_POUR_DEG) / (60 - TILT_POUR_DEG))
        const next = Math.max(0, levelRef.current - dt * MAX_DRAIN_PER_SEC * intensity)
        if (next !== levelRef.current) {
          levelRef.current = next
          setLevel(next)
        }
      }
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
      raf.current = null
      lastTs.current = null
    }
  }, [result])

  // "Locked" evaluation — when the player levels the device for ~600ms with
  // level < 0.985 (i.e. they actually poured something out), grade the round.
  useEffect(() => {
    if (result === 'good') return
    const absT = Math.abs(tilt)
    if (absT < TILT_DEAD_DEG && level < 0.985) {
      if (lockTimer.current == null) {
        lockTimer.current = window.setTimeout(() => {
          lockTimer.current = null
          const diff = levelRef.current - targetNum
          if (Math.abs(diff) <= TOLERANCE) {
            setResult('good')
            sound.play('chime')
            sound.play('win')
            setFireKey((k) => k + 1)
          } else if (diff > 0) {
            setResult('over')
            sound.play('pop')
          } else {
            setResult('under')
            sound.play('pop')
          }
        }, 600)
      }
    } else if (lockTimer.current != null) {
      window.clearTimeout(lockTimer.current)
      lockTimer.current = null
    }
    return () => {
      if (lockTimer.current != null) {
        window.clearTimeout(lockTimer.current)
        lockTimer.current = null
      }
    }
  }, [tilt, level, targetNum, result, sound])

  // Permission button — gated by a user gesture. iOS Safari only.
  const requestTilt = async () => {
    const cls = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } })
      .DeviceOrientationEvent
    if (cls && typeof cls.requestPermission === 'function') {
      try {
        const verdict = await cls.requestPermission()
        setPermission(verdict === 'granted' ? 'granted' : 'denied')
      } catch {
        setPermission('denied')
      }
    } else if ('DeviceOrientationEvent' in window) {
      setPermission('granted')
    } else {
      setPermission('unavailable')
    }
  }

  // Manual slider for desktop and as an iOS fallback when permission denied.
  const onSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    draggingRef.current = true
    setTilt(parseFloat(e.target.value))
  }
  const onSliderRelease = () => {
    draggingRef.current = false
    // gentle auto-level: ease back to 0 over ~400ms so evaluation can fire.
    const start = tiltRef.current
    const t0 = performance.now()
    const dur = 400
    const ease = (k: number) => k * (2 - k)
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / dur)
      const v = start * (1 - ease(k))
      setTilt(v)
      if (k < 1 && !draggingRef.current) window.requestAnimationFrame(tick)
    }
    window.requestAnimationFrame(tick)
  }

  const reset = () => {
    setLevel(1)
    levelRef.current = 1
    setResult(null)
  }
  const next = () => {
    setRound((r) => (r + 1) % LEVELS.length)
    setLevel(1)
    levelRef.current = 1
    setResult(null)
  }

  const message =
    result === 'good'
      ? round + 1 < LEVELS.length
        ? `${label(target)} left in the glass — perfectly poured. Onward!`
        : `You poured every one. You're reading fractions like a chef.`
      : result === 'over'
        ? `Too much left — you needed only ${label(target)}. Tap fill and try again.`
        : result === 'under'
          ? `You poured a bit too far. Aim to leave ${label(target)}. Tap fill and retry.`
          : permission === 'unknown'
            ? `Tap "Listen for tilt", then tilt the iPad to pour. Leave ${label(target)} behind.`
            : permission === 'denied' || permission === 'unavailable'
              ? `Drag the slider to tilt the glass. Stop pouring when ${label(target)} is left.`
              : `Tilt to pour — stop when the water reaches ${label(target)}.`

  // Glass geometry inside a 100x170 viewBox.
  const GX = 30
  const GY = 24
  const GW = 40
  const GH = 128
  const waterY = GY + GH * (1 - level)
  const targetY = GY + GH * (1 - targetNum)
  const rot = Math.max(-30, Math.min(30, tilt * 0.55))
  const draining = Math.abs(tilt) > TILT_POUR_DEG && level > 0 && result !== 'good'

  return (
    <GameShell speech={speech} onExit={onExit} title="Tilt to Pour" message={message}>
      <div className="flex h-full flex-col items-center justify-between px-4 pb-6 pt-2 sm:px-8">
        <div className="relative flex flex-1 items-center justify-center">
          <svg
            viewBox="0 0 100 170"
            className="h-[56vh] max-h-[480px] w-auto"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="waterOut" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#9DDCFF" />
                <stop offset="100%" stopColor="#2E78AE" />
              </linearGradient>
              <clipPath id="glassOutClip">
                <path d={`M ${GX},${GY} h ${GW} l -3 ${GH} h ${-(GW - 6)} z`} />
              </clipPath>
            </defs>

            {/* whole glass rotates with the device */}
            <g
              style={{
                transformOrigin: `50px ${GY + GH}px`,
                transform: `rotate(${rot}deg)`,
                transition: draggingRef.current ? 'none' : 'transform 100ms ease-out',
              }}
            >
              <path
                d={`M ${GX},${GY} h ${GW} l -3 ${GH} h ${-(GW - 6)} z`}
                fill="rgba(255,255,255,0.05)"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <path
                d={`M ${GX + 4},${GY + 6} l -2 ${GH - 14}`}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <g clipPath="url(#glassOutClip)">
                <rect x="0" y={waterY} width="100" height="200" fill="url(#waterOut)" />
                <path
                  d={`M 0 ${waterY} Q 25 ${waterY - 1.6} 50 ${waterY} T 100 ${waterY} V ${waterY + 8} H 0 Z`}
                  fill="rgba(255,255,255,0.18)"
                />
              </g>
              {/* target line — also rotates with the glass */}
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

            {/* pouring stream — falls away from the glass mouth, not rotated */}
            {draining && (
              <g>
                <path
                  d={`M ${50 + Math.sign(rot) * 18},${GY + 8 + Math.abs(rot) * 0.4} q ${Math.sign(rot) * 8},14 ${Math.sign(rot) * 14},34`}
                  stroke="url(#waterOut)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <ellipse cx={50 + Math.sign(rot) * 32} cy={GY + GH + 6} rx="14" ry="2.5" fill="rgba(120,200,255,0.35)">
                  <animate attributeName="rx" values="10;16;10" dur="0.55s" repeatCount="indefinite" />
                </ellipse>
              </g>
            )}

            {/* base plate */}
            <ellipse cx="50" cy={GY + GH + 6} rx="28" ry="3" fill="rgba(255,255,255,0.06)" />
          </svg>

          {/* round dots */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
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

        <div className="mt-3 flex w-full max-w-md flex-col items-center gap-3">
          {permission === 'unknown' && (
            <button
              onClick={requestTilt}
              className="rounded-full border border-gold/45 bg-gold/15 px-6 py-3 text-base font-semibold text-gold-soft transition hover:bg-gold/25 active:scale-95"
            >
              Listen for tilt
            </button>
          )}

          {/* tilt meter — always visible, doubles as drag fallback */}
          <div className="w-full">
            <div className="mb-1 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.14em] text-cream/40">
              <span>← tilt left</span>
              <span className="tabular-nums">
                {Math.abs(tilt) > TILT_POUR_DEG ? 'pouring' : 'level'}
              </span>
              <span>tilt right →</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-white/8">
              <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-white/30" />
              <div
                className={[
                  'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-colors',
                  draining ? 'bg-cyan-300' : 'bg-gold-soft',
                ].join(' ')}
                style={{ left: `calc(${((tilt + 60) / 120) * 100}% - 8px)` }}
              />
            </div>
            <input
              type="range"
              min={-60}
              max={60}
              step={0.5}
              value={tilt}
              onChange={onSliderChange}
              onPointerUp={onSliderRelease}
              onPointerCancel={onSliderRelease}
              onBlur={onSliderRelease}
              aria-label="Tilt the glass (drag fallback)"
              className="-mt-4 h-8 w-full cursor-grab opacity-0"
              style={{ touchAction: 'none' }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="rounded-full border border-white/12 bg-white/5 px-5 py-2 text-sm font-medium text-cream/85 transition hover:bg-white/10 active:scale-95"
            >
              ↻ Refill glass
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
