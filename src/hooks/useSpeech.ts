import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Read-aloud for the tutor. Two paths, picked per-line:
 *
 *   1. **Cached OpenAI TTS** — `scripts/generate-voice.mjs` pre-renders every
 *      conversation line into `/public/voice/<hash>.mp3` and writes a manifest
 *      mapping `text → file`. At runtime we play the matching clip via an
 *      `<audio>` element. This is the warm Nova voice the lesson is designed for.
 *
 *   2. **SpeechSynthesis fallback** — for any line not yet rendered (a brand
 *      new beat, a dynamic game message), we fall back to the browser's
 *      built-in voice so the lesson never goes silent.
 *
 * iPad-Safari realities shape the design here:
 *   - iOS allows an `<audio>` element to be played outside a user gesture
 *     *only* if that exact element was successfully `play()`'d inside a
 *     gesture before. So we keep ONE persistent element and reuse it for every
 *     line; `prime()` plays a silent clip on it during the opening tap to
 *     "bless" it for later programmatic playback.
 *   - SpeechSynthesis also needs a gesture-bound first utterance, hence the
 *     volume-0 utterance in `prime()`.
 *   - Voices load asynchronously, so we wait for them.
 */

interface ManifestLine {
  id: string
  file: string
  text: string
}
interface Manifest {
  version: number
  model: string
  voice: string
  format: string
  lines: ManifestLine[]
}

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim()

// 0-sample WAV — 44-byte RIFF header, no audio data. Plays as instant silence,
// supported by every browser. Used solely to "bless" the persistent <audio>
// element inside the opening user gesture so later `.src = …; .play()` calls
// are allowed without a fresh gesture.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

export function useSpeech() {
  const [supported] = useState(
    () =>
      typeof window !== 'undefined' &&
      ('speechSynthesis' in window || typeof Audio !== 'undefined'),
  )
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [usingCachedVoice, setUsingCachedVoice] = useState(false)

  const mutedRef = useRef(muted)
  mutedRef.current = muted

  /** One persistent <audio> element, reused for every line. Created lazily on
   *  the first call to `getAudio()` — typically inside `prime()`. */
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  /** Generation counter so a stale clip's load/error doesn't clobber the UI
   *  state of a newer clip — speak() bumps this and ignores results from any
   *  request whose token has been superseded. */
  const reqTokenRef = useRef(0)

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const manifestRef = useRef<Map<string, string> | null>(null)

  const getAudio = (): HTMLAudioElement => {
    if (!audioElRef.current) {
      const el = new Audio()
      el.preload = 'auto'
      // playsinline avoids iOS Safari sometimes taking over the screen for
      // <audio> elements that came from a non-gesture path.
      el.setAttribute('playsinline', '')
      audioElRef.current = el
    }
    return audioElRef.current
  }

  // Fetch the voice manifest once. If it's missing or empty we just fall back
  // to SpeechSynthesis — the lesson is still usable.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const base = import.meta.env.BASE_URL || '/'
    const url = `${base}voice/manifest.json`
    fetch(url, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Manifest | null) => {
        if (!m || !Array.isArray(m.lines)) return
        const map = new Map<string, string>()
        for (const line of m.lines) {
          map.set(normalize(line.text), `${base}${line.file}`)
        }
        manifestRef.current = map
        setUsingCachedVoice(map.size > 0)
      })
      .catch(() => {
        /* silent — fallback handles it */
      })
  }, [])

  // SpeechSynthesis voice pick (fallback path).
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const pick = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return
      const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
      const preferred =
        en.find((v) =>
          /samantha|karen|moira|google us english|aaron|jamie|nova/i.test(v.name),
        ) ??
        en.find((v) => v.lang.toLowerCase() === 'en-us') ??
        en[0] ??
        voices[0]
      voiceRef.current = preferred ?? null
    }
    pick()
    window.speechSynthesis.onvoiceschanged = pick
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const cancel = useCallback(() => {
    // Bump the token so any in-flight load/play for the previous line is
    // ignored by its handlers below.
    reqTokenRef.current += 1
    const el = audioElRef.current
    if (el) {
      try {
        el.pause()
        // Don't tear down the src here — we want the element to stay "blessed".
        // Just reset the playhead.
        el.currentTime = 0
      } catch {
        /* no-op */
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [])

  const synth = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance(text)
    if (voiceRef.current) u.voice = voiceRef.current
    u.rate = 0.96
    u.pitch = 1.06
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!supported || mutedRef.current || !text) return
      cancel()

      const file = manifestRef.current?.get(normalize(text))
      if (file) {
        const myToken = ++reqTokenRef.current
        const el = getAudio()

        const isCurrent = () => reqTokenRef.current === myToken

        // Reset handlers + state for this line.
        el.onplay = () => {
          if (isCurrent()) setSpeaking(true)
        }
        el.onended = () => {
          if (isCurrent()) setSpeaking(false)
        }
        el.onerror = () => {
          if (!isCurrent()) return
          setSpeaking(false)
          synth(text)
        }

        try {
          el.muted = false
          el.src = file
          el.currentTime = 0
        } catch {
          synth(text)
          return
        }

        const p = el.play()
        if (p && typeof p.then === 'function') {
          p.catch(() => {
            if (!isCurrent()) return
            synth(text)
          })
        }
        return
      }

      synth(text)
    },
    [supported, cancel, synth],
  )

  /** Unlock both audio paths on the first user gesture (iOS autoplay policy).
   *  Must run synchronously inside a real tap/click handler. */
  const prime = useCallback(() => {
    if (typeof window === 'undefined') return

    // SpeechSynthesis prime — a zero-volume utterance to unlock the queue.
    if ('speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance('')
        u.volume = 0
        window.speechSynthesis.speak(u)
      } catch {
        /* no-op */
      }
    }

    // HTMLAudio prime — get-or-create the persistent element and play a
    // silent WAV on it. Once this play() succeeds (or even just gets dispatched
    // inside a gesture), iOS will let us call play() on this element again
    // outside a gesture, simply by swapping .src.
    try {
      const el = getAudio()
      // Stash the eventual real src target; for priming we use SILENT_WAV.
      el.muted = true
      el.src = SILENT_WAV
      const p = el.play()
      if (p && typeof p.then === 'function') {
        p.then(() => {
          try {
            el.pause()
            el.currentTime = 0
          } catch {
            /* no-op */
          }
          el.muted = false
        }).catch(() => {
          el.muted = false
        })
      } else {
        el.muted = false
      }
    } catch {
      /* no-op */
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      if (next) cancel()
      return next
    })
  }, [cancel])

  return {
    supported,
    muted,
    speaking,
    /** True iff the OpenAI-rendered voice manifest is loaded — UI uses this to
     *  decide whether to advertise "warm Nova voice" affordances. */
    usingCachedVoice,
    speak,
    cancel,
    prime,
    toggleMute,
  }
}
