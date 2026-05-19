import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { useSpeech } from '../hooks/useSpeech'

interface Props {
  speech: ReturnType<typeof useSpeech>
  onExit: () => void
  /** Nova's current line. Spoken automatically whenever it changes. */
  message: string
  title: string
  children: React.ReactNode
}

/**
 * Shared frame for the prototype games: a back button, a Nova bubble that
 * speaks itself when the line changes, and audio controls. The message is
 * plain text (no Framer entrance) so it can never flash out — the lesson
 * learned from the earlier disappearing-box bugs.
 */
export default function GameShell({ speech, onExit, message, title, children }: Props) {
  const last = useRef('')
  useEffect(() => {
    if (message && message !== last.current) {
      last.current = message
      speech.speak(message)
    }
  }, [message, speech])
  useEffect(() => () => speech.cancel(), [speech])

  return (
    <div className="flex h-full w-full flex-col">
      {/* top: back + Nova line + audio */}
      <div className="z-20 flex items-start gap-3 px-4 pt-4 sm:px-6">
        <button
          onClick={() => {
            speech.cancel()
            onExit()
          }}
          aria-label="Back to menu"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-cream/80 backdrop-blur transition hover:bg-white/10 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 items-start gap-3">
          <motion.div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold-deep shadow-glow"
            animate={{ scale: speech.speaking ? [1, 1.06, 1] : 1 }}
            transition={{ duration: 0.5, repeat: speech.speaking ? Infinity : 0 }}
          >
            <svg width="26" height="26" viewBox="-16 -16 32 32">
              <ellipse cx="-6" cy="-2" rx="2.4" ry="2.8" fill="#3a2a14" />
              <ellipse cx="6" cy="-2" rx="2.4" ry="2.8" fill="#3a2a14" />
              <path d="M -6 4 Q 0 9 6 4" stroke="#3a2a14" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </motion.div>
          <div className="max-w-[46ch] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.055] px-4 py-3 backdrop-blur-sm">
            <div className="mb-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-soft/80">
              {title}
            </div>
            <p className="text-[1rem] leading-snug text-cream">{message}</p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => speech.speak(message)}
            aria-label="Hear that again"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-cream/80 transition hover:bg-white/10 active:scale-95"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button
            onClick={speech.toggleMute}
            aria-label={speech.muted ? 'Turn voice on' : 'Turn voice off'}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-cream/80 transition hover:bg-white/10 active:scale-95"
          >
            {speech.muted ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4z" />
                <path d="m23 9-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6 9H2v6h4l5 4z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* play area */}
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  )
}
