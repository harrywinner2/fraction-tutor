import { useCallback, useRef, useState } from 'react'

type Cue = 'smash' | 'pop' | 'chime' | 'win' | 'tap'

/**
 * Tiny WebAudio sound design — synthesised, so there are zero asset files to
 * ship and nothing to wait on. Each cue is a short shaped tone meant to make
 * the manipulative feel physical: a woody "smash", a soft "pop", a bright
 * "chime" when two fractions line up. Also hosts the ambient music loop — a
 * soft, low-volume major-triad pad with slow breath, started on the first
 * gesture (iOS autoplay gate) and toggleable from the global controls.
 */
export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [fxMuted, setFxMuted] = useState(false)
  const [musicMuted, setMusicMuted] = useState(false)
  const fxMutedRef = useRef(false)
  fxMutedRef.current = fxMuted

  // Ambient music graph — built on first startMusic(), then survives the
  // session. Volume is shaped by `musicGainRef`; muting just ramps it to 0.
  const musicGainRef = useRef<GainNode | null>(null)
  const musicStartedRef = useRef(false)
  const MUSIC_VOLUME = 0.04 // deliberately quiet; "low-volume tune"

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

  /** One sustained sine voice with a slow gain LFO for "breath". */
  const padVoice = (ac: AudioContext, master: GainNode, freq: number, lfoHz: number, phase: number) => {
    const osc = ac.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    const voiceGain = ac.createGain()
    voiceGain.gain.value = 0.5

    // LFO on the voice gain — gently swells each note 0.3 → 1.0 → 0.3.
    const lfo = ac.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = lfoHz
    const lfoDepth = ac.createGain()
    lfoDepth.gain.value = 0.35
    lfo.connect(lfoDepth).connect(voiceGain.gain)

    osc.connect(voiceGain).connect(master)
    const t0 = ac.currentTime + phase
    osc.start(t0)
    lfo.start(t0)
  }

  const buildMusic = (ac: AudioContext) => {
    const master = ac.createGain()
    master.gain.value = musicMuted ? 0 : MUSIC_VOLUME
    // A gentle low-pass keeps things soft — no harsh upper harmonics.
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1400
    lp.Q.value = 0.5
    master.connect(lp).connect(ac.destination)

    // A major triad (A2, C#3, E3) plus a soft octave halo on top (A3).
    padVoice(ac, master, 110.0, 0.07, 0)
    padVoice(ac, master, 138.59, 0.06, 0.5)
    padVoice(ac, master, 164.81, 0.05, 1.0)
    padVoice(ac, master, 220.0, 0.04, 1.5)

    musicGainRef.current = master
  }

  /** Begin the ambient loop. Idempotent. Safe to call before unlock — the
   *  AudioContext will start suspended and resume on the first gesture. */
  const startMusic = useCallback(() => {
    if (musicStartedRef.current) return
    const ac = ctx()
    if (!ac) return
    buildMusic(ac)
    musicStartedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Call once on the opening tap so iOS lets us make sound later. */
  const unlock = useCallback(() => {
    ctx()
    startMusic()
  }, [startMusic])

  const toggleFxMuted = useCallback(() => setFxMuted((m) => !m), [])
  const setFxMutedExplicit = useCallback((next: boolean) => setFxMuted(next), [])
  const toggleMusicMuted = useCallback(() => {
    setMusicMuted((m) => {
      const next = !m
      const ac = ctxRef.current
      const g = musicGainRef.current
      if (ac && g) {
        // Smooth ramp avoids the click of an instant gain jump.
        g.gain.cancelScheduledValues(ac.currentTime)
        g.gain.linearRampToValueAtTime(next ? 0 : MUSIC_VOLUME, ac.currentTime + 0.25)
      }
      return next
    })
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
