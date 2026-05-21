import type { useSpeech } from '../hooks/useSpeech'
import type { useSound } from '../hooks/useSound'

interface Props {
  speech: ReturnType<typeof useSpeech>
  sound: ReturnType<typeof useSound>
}

/**
 * Two persistent toggles in the very top-right of the viewport: a musical note
 * for the ambient music, and a microphone for voice + sound effects. Voice and
 * FX are intentionally bundled — one toggle quiets everything Nova says and
 * every interaction blip.
 */
export default function GlobalAudioToggles({ speech, sound }: Props) {
  const voiceOff = speech.muted || sound.fxMuted
  const setVoice = (off: boolean) => {
    speech.setMuted(off)
    sound.setFxMuted(off)
  }

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-30 flex gap-2 sm:right-5 sm:top-5">
      <button
        onClick={sound.toggleMusicMuted}
        aria-label={sound.musicMuted ? 'Turn music on' : 'Turn music off'}
        aria-pressed={!sound.musicMuted}
        className={[
          'pointer-events-auto grid h-10 w-10 place-items-center rounded-full border backdrop-blur-sm transition active:scale-95',
          sound.musicMuted
            ? 'border-white/10 bg-white/5 text-cream/45'
            : 'border-gold/45 bg-gold/15 text-gold-soft',
        ].join(' ')}
      >
        <NoteIcon muted={sound.musicMuted} />
      </button>

      <button
        onClick={() => setVoice(!voiceOff)}
        aria-label={voiceOff ? 'Turn voice and effects on' : 'Turn voice and effects off'}
        aria-pressed={!voiceOff}
        className={[
          'pointer-events-auto grid h-10 w-10 place-items-center rounded-full border backdrop-blur-sm transition active:scale-95',
          voiceOff
            ? 'border-white/10 bg-white/5 text-cream/45'
            : 'border-gold/45 bg-gold/15 text-gold-soft',
        ].join(' ')}
      >
        <MicIcon muted={voiceOff} />
      </button>
    </div>
  )
}

function NoteIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
      {muted && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  )
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      {muted && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  )
}
