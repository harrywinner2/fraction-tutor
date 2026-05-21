import { useMemo } from 'react'

/**
 * The deep-space backdrop from the Synthesis world: a dark navy gradient,
 * two soft nebula glows, and a field of slowly drifting, twinkling stars.
 * Each star has its own slow translate (outer span) and twinkle (inner span)
 * so the two animations don't fight over `transform`. Speeds are deliberately
 * long (60–120 s) — the drift is meant to be subliminal, not noticeable.
 */
export default function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2
        const radius = 6 + Math.random() * 10 // px excursion of the drift loop
        return {
          id: i,
          top: Math.random() * 100,
          left: Math.random() * 100,
          size: Math.random() * 2 + 1,
          twinkleDelay: Math.random() * 6,
          twinkleDuration: Math.random() * 4 + 3,
          driftDelay: -Math.random() * 90, // negative to desync the loops
          driftDuration: 60 + Math.random() * 60,
          dx: Math.cos(angle) * radius,
          dy: Math.sin(angle) * radius,
          opacity: Math.random() * 0.5 + 0.25,
        }
      }),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 8%, #142046 0%, #0e1530 38%, #0a0f1f 66%, #070b16 100%)',
        }}
      />
      <div
        className="absolute -left-32 top-1/4 h-[42rem] w-[42rem] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(70,90,170,0.35), transparent 70%)' }}
      />
      <div
        className="absolute -right-40 bottom-0 h-[40rem] w-[40rem] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(227,178,60,0.16), transparent 70%)' }}
      />
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            ['--dx' as string]: `${s.dx}px`,
            ['--dy' as string]: `${s.dy}px`,
            animation: `drift ${s.driftDuration}s ease-in-out ${s.driftDelay}s infinite`,
            willChange: 'transform',
          }}
        >
          <span
            className="block rounded-full bg-white"
            style={{
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animation: `twinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
            }}
          />
        </span>
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50%      { opacity: 0.9;  transform: scale(1.15); }
        }
        @keyframes drift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          25%      { transform: translate3d(var(--dx), calc(var(--dy) * -1), 0); }
          50%      { transform: translate3d(0, var(--dy), 0); }
          75%      { transform: translate3d(calc(var(--dx) * -1), calc(var(--dy) * -0.5), 0); }
        }
      `}</style>
    </div>
  )
}
