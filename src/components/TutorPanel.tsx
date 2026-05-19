import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Choice, Mood } from '../types'

interface Props {
  beatId: string
  text: string
  choices?: Choice[]
  continueLabel?: string
  speaking: boolean
  muted: boolean
  mood: Mood
  onChoose: (next: string, correct?: boolean) => void
  onContinue: () => void
  onReplay: () => void
  onToggleMute: () => void
}

/** Nova — a warm little guide orb whose face follows the lesson mood. */
function Nova({ mood, speaking }: { mood: Mood; speaking: boolean }) {
  const smiling = mood === 'cheer' || mood === 'happy' || mood === 'encourage'
  return (
    <motion.div
      className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold-deep shadow-glow"
      animate={{ scale: speaking ? [1, 1.06, 1] : 1 }}
      transition={{ duration: 0.5, repeat: speaking ? Infinity : 0 }}
    >
      <svg width="30" height="30" viewBox="-16 -16 32 32">
        <ellipse cx="-6" cy="-2" rx="2.4" ry={mood === 'surprised' ? 3.6 : 2.8} fill="#3a2a14" />
        <ellipse cx="6" cy="-2" rx="2.4" ry={mood === 'surprised' ? 3.6 : 2.8} fill="#3a2a14" />
        {mood === 'surprised' ? (
          <ellipse cx="0" cy="6" rx="3" ry="4" fill="#3a2a14" />
        ) : (
          <path
            d={smiling ? 'M -6 4 Q 0 10 6 4' : 'M -5 5 Q 0 7 5 5'}
            stroke="#3a2a14"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>
    </motion.div>
  )
}

export default function TutorPanel({
  beatId,
  text,
  choices,
  continueLabel,
  speaking,
  muted,
  mood,
  onChoose,
  onContinue,
  onReplay,
  onToggleMute,
}: Props) {
  // Reveal the message a few characters at a time so it lands with the voice.
  const [shown, setShown] = useState('')
  const reduce = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (reduce.current) {
      setShown(text)
      return
    }
    setShown('')
    let i = 0
    const id = window.setInterval(() => {
      i += 2
      setShown(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 18)
    return () => window.clearInterval(id)
  }, [text, beatId])

  const done = shown.length >= text.length

  return (
    <div className="flex h-full flex-col gap-5">
      {/* message */}
      <div className="flex items-start gap-3">
        <Nova mood={mood} speaking={speaking} />
        <div className="relative max-w-[34ch] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.055] px-5 py-4 backdrop-blur-sm">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-soft/80">
            Nova
            {beatId === 'welcome' && <span className="text-base">👋</span>}
          </div>
          <p className="text-[1.05rem] leading-relaxed text-cream">
            {shown}
            {!done && <span className="ml-0.5 inline-block w-2 animate-pulse">▋</span>}
          </p>
        </div>
      </div>

      {/* answers — rendered once the line finishes typing and then left
          mounted (no AnimatePresence: it has no exit here and only made the
          buttons flicker out on unrelated re-renders). */}
      <div id="reply-options" className="flex flex-col gap-3">
        {done &&
          choices?.map((c, i) => (
            <button
              key={`${beatId}-${c.label}`}
              style={{ animation: 'replyIn 360ms ease-out both', animationDelay: `${i * 70}ms` }}
              onClick={() => onChoose(c.next, c.correct)}
              className="group min-h-[56px] rounded-xl border border-white/12 bg-white/[0.05] px-5 py-3 text-left text-[1.02rem] font-medium text-cream transition-colors hover:border-gold/50 hover:bg-gold/10 active:scale-[0.98]"
            >
              <span className="mr-3 text-gold-soft/70 transition-transform group-hover:translate-x-0.5">
                →
              </span>
              {c.label}
            </button>
          ))}

        {done && !choices && continueLabel && (
          <button
            key={`${beatId}-continue`}
            style={{ animation: 'replyInUp 360ms ease-out both' }}
            onClick={onContinue}
            className="min-h-[56px] rounded-xl border border-gold/40 bg-gold/15 px-6 py-3 text-[1.02rem] font-semibold text-gold-soft transition-colors hover:bg-gold/25 active:scale-[0.98]"
          >
            {continueLabel} →
          </button>
        )}
      </div>

      {/* audio controls */}
      <div className="mt-auto flex items-center gap-2 pt-4">
        <button
          onClick={onReplay}
          aria-label="Hear that again"
          className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-cream/80 transition hover:bg-white/10 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <button
          onClick={onToggleMute}
          aria-label={muted ? 'Turn voice on' : 'Turn voice off'}
          className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-cream/80 transition hover:bg-white/10 active:scale-95"
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4z" />
              <path d="m23 9-6 6M17 9l6 6" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
            </svg>
          )}
        </button>
        {speaking && (
          <div className="ml-1 flex items-end gap-[3px]" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="w-[3px] rounded-full bg-gold-soft/80"
                animate={{ height: [5, 16, 7, 13, 5] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
