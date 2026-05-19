import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'

/**
 * The manipulative. A chocolate bar cut into `segments` pieces with `filled`
 * of them gold. Two ways to touch it:
 *
 *  - 'smash': tap anywhere → every piece splits in two (the signature gesture).
 *             The gold *length* never changes, which is the whole revelation.
 *  - 'build': tap a piece → fill up to there, so the student can make a
 *             fraction with their own hands.
 */
interface Props {
  segments: number
  filled: number
  interactive?: 'smash' | 'build'
  label?: string
  /** Ignite the bar gold — used when an equivalence is proven. */
  glow?: boolean
  /** Pulsing "tap me" affordance for the very first smash. */
  hint?: boolean
  onSmash?: () => void
  onBuildChange?: (filled: number) => void
}

export default function FractionBar({
  segments,
  filled,
  interactive,
  label,
  glow,
  hint,
  onSmash,
  onBuildChange,
}: Props) {
  // Animation controls (not a remount key) so the bar can shudder *and* the
  // pieces can split apart at the same time.
  const controls = useAnimationControls()

  const handleSmash = () => {
    if (interactive !== 'smash' || !onSmash) return
    void controls.start({
      x: [0, -8, 7, -5, 0],
      rotate: [0, -0.7, 0.7, -0.3, 0],
      transition: { duration: 0.34 },
    })
    onSmash()
  }

  const handleCell = (index: number) => {
    if (interactive !== 'build' || !onBuildChange) return
    // Tapping the last filled piece clears it; otherwise fill up to here.
    onBuildChange(index + 1 === filled ? index : index + 1)
  }

  const cells = Array.from({ length: segments }, (_, i) => i)

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <motion.div
        animate={controls}
        onClick={handleSmash}
        role={interactive === 'smash' ? 'button' : undefined}
        aria-label={interactive === 'smash' ? 'Smash the chocolate bar' : label}
        className={[
          'relative flex h-[clamp(64px,12vh,108px)] w-[min(680px,86vw)] gap-[3px] rounded-2xl p-[6px]',
          'bg-[#10162b] ring-1 transition-shadow duration-500',
          glow
            ? 'ring-gold shadow-glow'
            : 'ring-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.45)]',
          interactive === 'smash' ? 'cursor-pointer active:scale-[0.985]' : '',
          interactive === 'build' && filled === 0
            ? 'animate-[invite_1.8s_ease-in-out_infinite]'
            : '',
        ].join(' ')}
      >
        <AnimatePresence initial={false}>
          {cells.map((i) => {
            const isFilled = i < filled
            const cls = [
              'relative flex-1 rounded-xl transition-colors duration-300',
              isFilled
                ? 'bg-gradient-to-b from-gold-soft to-gold-deep'
                : 'bg-white/[0.045] ring-1 ring-inset ring-white/10',
              // In smash mode the parent owns the tap, so the pieces must let
              // the click pass straight through to it.
              interactive === 'build' ? 'cursor-pointer' : 'pointer-events-none',
            ].join(' ')
            const motionProps = {
              layout: true,
              initial: { opacity: 0, scaleX: 0.4 },
              animate: { opacity: 1, scaleX: 1 },
              exit: { opacity: 0, scaleX: 0.4 },
              transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
              className: cls,
            }
            const fill = isFilled && (
              <span className="pointer-events-none absolute inset-x-0 top-1 mx-auto h-[3px] w-2/3 rounded-full bg-white/35" />
            )
            return interactive === 'build' ? (
              <motion.button
                key={`${segments}-${i}`}
                {...motionProps}
                onClick={(e) => {
                  e.stopPropagation()
                  handleCell(i)
                }}
                aria-label={`Piece ${i + 1} of ${segments}, ${isFilled ? 'filled' : 'empty'}`}
              >
                {fill}
              </motion.button>
            ) : (
              <motion.div key={`${segments}-${i}`} {...motionProps} aria-hidden>
                {fill}
              </motion.div>
            )
          })}
        </AnimatePresence>

        {hint && interactive === 'smash' && (
          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="rounded-full bg-black/45 px-4 py-2 text-sm font-semibold text-cream backdrop-blur"
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              👆 tap to smash
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {label && (
        <div className="flex items-baseline gap-3">
          <span className="text-sm uppercase tracking-[0.18em] text-cream/55">
            {label}
          </span>
          <span className="font-display text-2xl font-semibold text-gold-soft tabular-nums">
            {filled}
            <span className="mx-[2px] text-cream/40">/</span>
            {segments}
          </span>
        </div>
      )}
    </div>
  )
}
