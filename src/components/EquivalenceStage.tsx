import { motion, AnimatePresence } from 'framer-motion'
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
        <motion.div
          className="relative flex h-12 w-16 items-center justify-center"
          animate={lit ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, repeat: lit ? Infinity : 0, repeatDelay: 0.6 }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={lit ? 'eq' : 'q'}
              initial={{ opacity: 0, rotate: -20, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className={[
                'font-display text-5xl font-semibold',
                lit ? 'text-gold drop-shadow-[0_0_14px_rgba(227,178,60,0.85)]' : 'text-cream/30',
              ].join(' ')}
            >
              {lit ? '=' : '?'}
            </motion.span>
          </AnimatePresence>
        </motion.div>
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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-2 flex items-center gap-3 rounded-full border border-gold/30 bg-gold/5 px-6 py-3 font-display text-2xl font-semibold text-gold-soft tabular-nums"
        >
          <span>1/2</span>
          <span className="text-cream/40">=</span>
          <span>2/4</span>
          <span className="text-cream/40">=</span>
          <span>3/6</span>
        </motion.div>
      )}
    </div>
  )
}
