import { useCallback, useRef } from 'react'

type Cue = 'smash' | 'pop' | 'chime' | 'win' | 'tap'

/**
 * Tiny WebAudio sound design — synthesised, so there are zero asset files to
 * ship and nothing to wait on. Each cue is a short shaped tone meant to make
 * the manipulative feel physical: a woody "smash", a soft "pop", a bright
 * "chime" when two fractions line up.
 */
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)

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

  /** Call once on the opening tap so iOS lets us make sound later. */
  const unlock = useCallback(() => {
    ctx()
  }, [])

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

  return { play, unlock }
}
