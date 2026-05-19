import { motion } from 'framer-motion'
import { useMemo } from 'react'

/**
 * A confetti burst for the "I got it" moments. `fireKey` changes every time a
 * celebration should play, which remounts and replays the particles.
 */
export default function Celebration({
  level,
  fireKey,
}: {
  level: 'small' | 'big'
  fireKey: number
}) {
  const colors = ['#E3B23C', '#EBC76A', '#5BD6A0', '#F5F0E6', '#7FA8FF']
  const count = level === 'big' ? 64 : 26

  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * (level === 'big' ? 720 : 420),
        y: -(Math.random() * (level === 'big' ? 460 : 280) + 120),
        rot: Math.random() * 720 - 360,
        color: colors[i % colors.length],
        size: Math.random() * 8 + 6,
        delay: Math.random() * 0.15,
        round: Math.random() > 0.5,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fireKey],
  )

  return (
    <div
      key={fireKey}
      className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center overflow-hidden"
    >
      <div className="relative bottom-1/3">
        {bits.map((b) => (
          <motion.span
            key={b.id}
            className="absolute"
            style={{
              width: b.size,
              height: b.size,
              backgroundColor: b.color,
              borderRadius: b.round ? '50%' : 2,
            }}
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
            animate={{ opacity: [1, 1, 0], x: b.x, y: [0, b.y, b.y + 220], rotate: b.rot }}
            transition={{ duration: level === 'big' ? 1.9 : 1.3, delay: b.delay, ease: 'easeOut' }}
          />
        ))}
      </div>
    </div>
  )
}
