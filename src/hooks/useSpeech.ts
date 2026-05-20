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
 * iPad-Safari realities still shape the API:
 *   - The first sound must happen inside a user gesture: call `prime()` once
 *     on the opening tap to unlock both audio paths.
 *   - SpeechSynthesis voices load asynchronously, so we wait for them.
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

export function useSpeech() {
  const [supported] = useState(
    () => typeof window !== 'undefined' && ('speechSynthesis' in window || 'Audio' in window),
  )
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [usingCachedVoice, setUsingCachedVoice] = useState(false)

  const mutedRef = useRef(muted)
  mutedRef.current = muted

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const manifestRef = useRef<Map<string, string> | null>(null)

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
    if (audioRef.current) {
      const el = audioRef.current
      audioRef.current = null
      try {
        el.pause()
        el.removeAttribute('src')
        el.load()
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
        const audio = new Audio(file)
        audio.preload = 'auto'
        audioRef.current = audio
        audio.onplay = () => setSpeaking(true)
        audio.onended = () => {
          if (audioRef.current === audio) audioRef.current = null
          setSpeaking(false)
        }
        audio.onerror = () => {
          if (audioRef.current === audio) audioRef.current = null
          setSpeaking(false)
          synth(text)
        }
        audio.play().catch(() => {
          if (audioRef.current === audio) audioRef.current = null
          synth(text)
        })
        return
      }

      synth(text)
    },
    [supported, cancel, synth],
  )

  /** Unlock both audio paths on the first user gesture (iOS autoplay policy). */
  const prime = useCallback(() => {
    if (typeof window === 'undefined') return
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      window.speechSynthesis.speak(u)
    }
    // Touch an HTMLAudioElement inside the gesture so iOS marks Audio() as unlocked.
    try {
      const a = new Audio()
      a.muted = true
      const p = a.play()
      if (p && typeof p.then === 'function') p.catch(() => {})
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
    /** True iff the OpenAI-rendered voice manifest is loaded — UI uses this to hide the "tap to hear Nova" hint when we don't have a real voice yet. */
    usingCachedVoice,
    speak,
    cancel,
    prime,
    toggleMute,
  }
}
