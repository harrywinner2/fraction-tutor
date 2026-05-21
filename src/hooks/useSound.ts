import { useCallback, useEffect, useRef, useState } from 'react'

type Cue = 'smash' | 'pop' | 'chime' | 'win' | 'tap'

/**
 * Audio hub for the app:
 *
 *   • **FX** — a tiny WebAudio sound design (synthesised, zero asset files).
 *     Each cue is a short shaped tone meant to make the manipulative feel
 *     physical: a woody "smash", a soft "pop", a bright "chime".
 *
 *   • **Music** — a real royalty-free track ("Easy Lemon (60 second)" by
 *     Kevin MacLeod, CC-BY 4.0) played through a single HTMLAudioElement
 *     with `loop = true`. We chose a real track over a longer synthesised
 *     loop because real music has *intent* — phrasing, rest, return — and
 *     the synth version was just a drone.
 *
 *   • **iOS autoplay** — both paths are unlocked from the first user
 *     gesture by `unlock()`, which also kicks off `startMusic()`.
 */
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [fxMuted, setFxMuted] = useState(false)
  const [musicMuted, setMusicMuted] = useState(false)
  const fxMutedRef = useRef(false)
  fxMutedRef.current = fxMuted

  // Ambient music — one persistent <audio> element, looping.
  const musicElRef = useRef<HTMLAudioElement | null>(null)
  const musicStartedRef = useRef(false)
  const MUSIC_VOLUME = 0.22 // a real track, so we want it audible — not subliminal

  const ctx = () => {
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      if (AC) ctxRef.current = new AC()
    }
    if (ctxRef.current?.state === 'suspended') void ctxRef.current.resume()
    return ctxRef.current
  }

  /** Begin the ambient music. Idempotent. Must be called inside a user
   *  gesture on iOS — `unlock()` already does that. */
  const startMusic = useCallback(() => {
    if (musicStartedRef.current) return
    musicStartedRef.current = true
    if (typeof window === 'undefined') return
    const base = import.meta.env.BASE_URL || '/'
    const el = new Audio(`${base}music/ambient.mp3`)
    el.loop = true
    el.preload = 'auto'
    el.volume = musicMuted ? 0 : MUSIC_VOLUME
    el.setAttribute('playsinline', '')
    musicElRef.current = el
    el.play().catch(() => {
      /* autoplay blocked — toggling the music button will resume. */
    })
  }, [musicMuted])

  /** Call once on the opening tap so iOS lets us make sound later. */
  const unlock = useCallback(() => {
    ctx()
    startMusic()
  }, [startMusic])

  // Reflect mute state on the music element. Gentle ramp avoids the click.
  useEffect(() => {
    const el = musicElRef.current
    if (!el) return
    const from = el.volume
    const to = musicMuted ? 0 : MUSIC_VOLUME
    if (from === to) return
    const start = performance.now()
    const dur = 250
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur)
      el.volume = from + (to - from) * k
      if (k < 1) requestAnimationFrame(tick)
      else if (musicMuted) {
        // pause once we've ramped down — saves a touch of CPU
        try {
          el.pause()
        } catch {
          /* no-op */
        }
      }
    }
    if (!musicMuted && el.paused) el.play().catch(() => {})
    requestAnimationFrame(tick)
  }, [musicMuted])

  const toggleFxMuted = useCallback(() => setFxMuted((m) => !m), [])
  const setFxMutedExplicit = useCallback((next: boolean) => setFxMuted(next), [])
  const toggleMusicMuted = useCallback(() => setMusicMuted((m) => !m), [])

  const tone = (
    ac: AudioContext,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    when = 0,
    glideTo?: number,
  ) => {
    const t0 = ac.currentTime + when
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  const play = useCallback((cue: Cue) => {
    if (fxMutedRef.current) return
    const ac = ctx()
    if (!ac) return
    switch (cue) {
      case 'tap':
        tone(ac, 320, 0.07, 'sine', 0.18)
        break
      case 'smash':
        tone(ac, 180, 0.16, 'triangle', 0.34, 0, 70)
        tone(ac, 90, 0.22, 'sawtooth', 0.16, 0, 45)
        break
      case 'pop':
        tone(ac, 520, 0.1, 'sine', 0.26, 0, 760)
        break
      case 'chime':
        tone(ac, 660, 0.18, 'sine', 0.22)
        tone(ac, 880, 0.26, 'sine', 0.2, 0.06)
        tone(ac, 1320, 0.34, 'sine', 0.16, 0.12)
        break
      case 'win':
        ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          tone(ac, f, 0.4, 'sine', 0.22, i * 0.11),
        )
        break
    }
  }, [])

  return {
    play,
    unlock,
    startMusic,
    fxMuted,
    musicMuted,
    toggleFxMuted,
    toggleMusicMuted,
    setFxMuted: setFxMutedExplicit,
  }
}
