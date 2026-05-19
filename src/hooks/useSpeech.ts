import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Read-aloud for the tutor, built on the browser SpeechSynthesis API.
 *
 * Two iPad-Safari realities shaped this hook:
 *  1. The first utterance must happen inside a user gesture, so we expose
 *     `prime()` to call once on the opening tap.
 *  2. Voices load asynchronously; we wait for them and prefer a warm en voice.
 */
export function useSpeech() {
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
  )
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  useEffect(() => {
    if (!supported) return
    const pick = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return
      const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
      const preferred =
        en.find((v) => /samantha|karen|moira|google us english|aaron|jamie/i.test(v.name)) ??
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
  }, [supported])

  const cancel = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text: string) => {
      if (!supported || mutedRef.current || !text) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      if (voiceRef.current) u.voice = voiceRef.current
      u.rate = 0.96 // a touch slower — calmer for a kid
      u.pitch = 1.06 // a touch brighter — warmer
      u.onstart = () => setSpeaking(true)
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(u)
    },
    [supported],
  )

  /** Unlock audio on the opening tap (iOS autoplay policy). */
  const prime = useCallback(() => {
    if (!supported) return
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    window.speechSynthesis.speak(u)
  }, [supported])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m
      if (next) {
        window.speechSynthesis?.cancel()
        setSpeaking(false)
      }
      return next
    })
  }, [])

  return { supported, muted, speaking, speak, cancel, prime, toggleMute }
}
