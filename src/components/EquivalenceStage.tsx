import { motion } from 'framer-motion'
import FractionBar from './FractionBar'
import type { BarSpec } from '../types'

interface Props {
  kind: 'none' | 'single' | 'compare'
  top?: BarSpec
  bottom?: BarSpec
  showEquals?: boolean
  ledger?: boolean
  hint?: boolean
  onSmash?: () => void
  onBuildChange?: (filled: number) => void
}

const sameAmount = (a?: BarSpec, b?: BarSpec) =>
  !!a && !!b && a.filled > 0 && a.filled * b.segments === b.filled * a.segments

export default function EquivalenceStage({
  kind,
  top,
  bottom,
  showEquals,
  ledger,
  hint,
  onSmash,
  onBuildChange,
}: Props) {
  if (kind === 'none') {
    return (
      <div className="flex h-full items-center justify-center">
        <motion.div
          className="font-display text-[clamp(5rem,16vh,9rem)] font-semibold text-cream/10"
          animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          ½
        </motion.div>
      </div>
    )
  }

  const equal = sameAmount(top, bottom)
  const lit = !!showEquals && equal

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      {top && (
        <FractionBar
          segments={top.segments}
          filled={top.filled}
          interactive={top.interactive}
          label={top.label}
          glow={lit}
          hint={hint && top.interactive === 'smash'}
          onSmash={onSmash}
          onBuildChange={onBuildChange}
        />
      )}

      {kind === 'compare' && showEquals && (
        <div
          className="relative flex h-12 w-16 items-center justify-center"
          style={lit ? { animation: 'eqPulse 1.1s ease-in-out infinite' } : undefined}
        >
          {/* Plain element: opacity is always 1, only colour/scale transition.
              It can change but it can never vanish. */}
          <span
            className={[
              'font-display text-5xl font-semibold transition-all duration-300',
              lit
                ? 'scale-110 text-gold drop-shadow-[0_0_14px_rgba(227,178,60,0.85)]'
                : 'scale-100 text-cream/30',
            ].join(' ')}
          >
            {lit ? '=' : '?'}
          </span>
        </div>
      )}

      {bottom && (
        <FractionBar
          segments={bottom.segments}
          filled={bottom.filled}
          interactive={bottom.interactive}
          label={bottom.label}
          glow={lit}
          hint={hint && bottom.interactive === 'smash'}
          onSmash={onSmash}
          onBuildChange={onBuildChange}
        />
      )}

      {ledger && (
        <div
          style={{ animation: 'replyInUp 420ms ease-out 300ms both' }}
          className="mt-2 flex flex-col items-center gap-2 rounded-2xl border border-gold/30 bg-gold/5 px-7 py-4 font-display text-2xl font-semibold text-gold-soft tabular-nums"
        >
          <div className="flex items-center gap-3">
            <span>1/2</span>
            <span className="text-cream/40">=</span>
            <span>2/4</span>
            <span className="text-cream/40">=</span>
            <span>3/6</span>
          </div>
          <div className="flex items-center gap-3">
            <span>1/3</span>
            <span className="text-cream/40">=</span>
            <span>2/6</span>
          </div>
        </div>
      )}
    </div>
  )
}
