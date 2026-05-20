import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { Mood } from '../types'

/**
 * Nova — the warm guide-orb. One component, used everywhere Nova appears (Hub,
 * TutorPanel, GameShell, end-of-game celebrations). She breathes gently when
 * idle, blinks every few seconds, and her mouth shape ticks open/closed while
 * she is speaking so the voice feels embodied instead of disembodied.
 *
 * Mood drives the rest of the face: surprised → wide eyes + a small "O", cheer
 * → squinty smiling eyes + a bigger grin, sad → sloping brows, etc.
 */
interface Props {
  mood: Mood
  speaking: boolean
  /** Outer pixel size of the orb. Default 48. */
  size?: number
  /** Strength of the halo glow behind the orb. 0 disables it. */
  halo?: number
}

export default function NovaAvatar({ mood, speaking, size = 48, halo = 0.55 }: Props) {
  // Periodic blink — every 3.2–6s, two-frame animation.
  const [blink, setBlink] = useState(false)
  useEffect(() => {
    let mounted = true
    const tick = () => {
      if (!mounted) return
      setBlink(true)
      window.setTimeout(() => mounted && setBlink(false), 130)
      window.setTimeout(tick, 3200 + Math.random() * 2800)
    }
    const id = window.setTimeout(tick, 1800 + Math.random() * 2200)
    return () => {
      mounted = false
      window.clearTimeout(id)
    }
  }, [])

  // Mouth phase — ticks 0/1/2 while speaking so the path swaps every ~140ms.
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (!speaking) {
      setPhase(0)
      return
    }
    const id = window.setInterval(() => setPhase((p) => (p + 1) % 3), 130)
    return () => window.clearInterval(id)
  }, [speaking])

  const eyeWide = mood === 'surprised'
  const eyeHappy = mood === 'cheer' || mood === 'happy'

  // Base mouth (when not speaking). Shape per mood.
  const restMouth =
    mood === 'cheer'
      ? 'M -7 4 Q 0 11 7 4'
      : mood === 'happy' || mood === 'encourage'
        ? 'M -6 4 Q 0 9 6 4'
        : mood === 'curious'
          ? 'M -5 5 Q 1 8 6 4'
          : mood === 'sad'
            ? 'M -6 7 Q 0 3 6 7'
            : 'M -5 5 Q 0 7 5 5'

  // Open mouths cycled while speaking. Three shapes give a believable rhythm
  // without burning a real phoneme analyser — small "oh", medium "ah", smile.
  const speakingMouth = phase === 0 ? 'M -5 4 Q 0 9 5 4 Q 0 7 -5 4 Z' : phase === 1 ? 'M -4 5 Q 0 8 4 5' : 'M -6 4 Q 0 10 6 4 Q 0 7 -6 4 Z'

  // viewBox is fixed; outer `size` just scales the SVG.
  const surprisedMouth = mood === 'surprised'

  return (
    <motion.div
      className="relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold-deep"
      style={{
        width: size,
        height: size,
        boxShadow: halo > 0 ? `0 0 ${size * 0.7}px -${size * 0.18}px rgba(227,178,60,${halo})` : undefined,
      }}
      // Breath: a very slow scale; speaking adds a faster overlay pulse.
      animate={
        speaking
          ? { scale: [1, 1.045, 1] }
          : { scale: [1, 1.018, 1] }
      }
      transition={{
        duration: speaking ? 0.55 : 3.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Soft inner highlight to give the orb material — not a flat disc. */}
      <span
        className="pointer-events-none absolute inset-1 rounded-full"
        style={{
          background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), transparent 56%)',
        }}
        aria-hidden
      />
      <svg width={size * 0.62} height={size * 0.62} viewBox="-16 -16 32 32" aria-hidden>
        {/* eyes */}
        {blink ? (
          <>
            <path d="M -9 -2 L -3 -2" stroke="#3a2a14" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M 3 -2 L 9 -2" stroke="#3a2a14" strokeWidth="2.4" strokeLinecap="round" />
          </>
        ) : eyeHappy ? (
          <>
            <path
              d="M -9 -3 Q -6 -7 -3 -3"
              stroke="#3a2a14"
              strokeWidth="2.1"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 3 -3 Q 6 -7 9 -3"
              stroke="#3a2a14"
              strokeWidth="2.1"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <ellipse
              cx="-6"
              cy="-2"
              rx={eyeWide ? 2.8 : 2.4}
              ry={eyeWide ? 4 : 2.9}
              fill="#3a2a14"
            />
            <ellipse
              cx="6"
              cy="-2"
              rx={eyeWide ? 2.8 : 2.4}
              ry={eyeWide ? 4 : 2.9}
              fill="#3a2a14"
            />
            {/* tiny catch-light so the eyes feel alive */}
            <circle cx="-5" cy="-3" r="0.7" fill="#fceedd" />
            <circle cx="7" cy="-3" r="0.7" fill="#fceedd" />
          </>
        )}

        {/* curious raised brow */}
        {mood === 'curious' && (
          <path
            d="M 4 -10 Q 8 -12 12 -9"
            stroke="#3a2a14"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* mouth */}
        {surprisedMouth ? (
          <ellipse cx="0" cy="6" rx="3" ry="4" fill="#5a2a2a" />
        ) : speaking ? (
          <path
            d={speakingMouth}
            stroke="#3a2a14"
            strokeWidth="2.1"
            fill={phase !== 1 ? '#5a2a2a' : 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d={restMouth}
            stroke="#3a2a14"
            strokeWidth="2.1"
            fill={mood === 'cheer' ? '#5a2a2a' : 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* warm cheek flush when cheering */}
        {mood === 'cheer' && (
          <>
            <circle cx="-10" cy="3" r="2" fill="#F2A0A0" opacity="0.6" />
            <circle cx="10" cy="3" r="2" fill="#F2A0A0" opacity="0.6" />
          </>
        )}
      </svg>

      {/* speaking aura — faint expanding ring */}
      {speaking && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ border: '2px solid rgba(235,199,106,0.55)' }}
          animate={{ scale: [1, 1.35, 1.55], opacity: [0.55, 0.25, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </motion.div>
  )
}
