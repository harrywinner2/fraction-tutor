import NovaAvatar from './NovaAvatar'

interface Props {
  /** Number of clips successfully prefetched. */
  loaded: number
  /** Total clips known from the manifest. 0 before the manifest lands. */
  total: number
  /** When true, the prefetch is done — show the "Tap to begin" affordance. */
  ready: boolean
  /** Called from the user-gesture button so iOS lets us play audio later. */
  onBegin: () => void
}

/**
 * Full-screen overlay shown while the voice clips are warming up in the HTTP
 * cache. Doubles as the iOS audio-unlock surface — the "Tap to begin" button
 * is the first real user gesture, which we use to prime SpeechSynthesis and
 * start the ambient music. The progress bar is honest, not theatrical: it
 * reflects the actual `fetch` count from `useSpeech`.
 */
export default function LoadingScreen({ loaded, total, ready, onBegin }: Props) {
  const pct = total === 0 ? 0 : Math.round((loaded / total) * 100)
  const label = ready
    ? "Ready when you are."
    : total === 0
      ? "Reaching for Nova's voice…"
      : "Warming up Nova's voice…"

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-space-900/95 backdrop-blur-md">
      <div className="flex w-full max-w-md flex-col items-center gap-7 px-6 text-center">
        <div className="relative">
          <NovaAvatar mood="happy" speaking={!ready} size={88} halo={0.85} />
          {!ready && (
            <span
              className="absolute -inset-6 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(235,199,106,0.25), transparent 70%)',
                animation: 'pulseHalo 2.4s ease-in-out infinite',
              }}
              aria-hidden
            />
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-gold-soft/85">
            Slice — fractions by feel
          </p>
          <h1 className="font-display text-[clamp(1.8rem,5vh,2.4rem)] font-semibold leading-[1.05] text-cream">
            {label}
          </h1>
        </div>

        {/* progress bar — honest count, not a fake timer */}
        <div className="w-full max-w-xs">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-soft to-gold transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[0.7rem] uppercase tracking-[0.16em] text-cream/45">
            <span>{ready ? 'all set' : `${loaded} / ${total || '…'} clips`}</span>
            <span className="tabular-nums text-cream/55">{pct}%</span>
          </div>
        </div>

        <button
          onClick={onBegin}
          disabled={!ready}
          className={[
            'rounded-full border px-7 py-3.5 text-base font-semibold transition active:scale-[0.98]',
            ready
              ? 'border-gold/55 bg-gold/15 text-gold-soft hover:bg-gold/25'
              : 'cursor-not-allowed border-white/8 bg-white/[0.04] text-cream/35',
          ].join(' ')}
        >
          {ready ? 'Tap to begin' : 'Loading…'}
        </button>

        <p className="max-w-xs text-xs leading-relaxed text-cream/35">
          We're caching every line Nova will say so playback is instant the
          moment the words appear. iPad in landscape, with the volume on, is
          the best way to play.
        </p>
      </div>

      <style>{`
        @keyframes pulseHalo {
          0%, 100% { opacity: 0.35; transform: scale(0.92); }
          50%      { opacity: 0.85; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
