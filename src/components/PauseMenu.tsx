import { motion } from 'framer-motion'

interface Props {
  onResume: () => void
  onRestart: () => void
}

export default function PauseMenu({ onResume, onRestart }: Props) {
  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-center justify-center bg-space-900/80 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex w-[min(360px,86vw)] flex-col gap-3 rounded-3xl border border-white/10 bg-space-700/90 p-7 text-center"
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-semibold text-cream">Paused</h2>
        <p className="mb-3 text-sm text-cream/55">Take your time — the chocolate isn't going anywhere.</p>
        <button
          onClick={onResume}
          className="min-h-[54px] rounded-xl bg-gradient-to-b from-gold-soft to-gold-deep font-semibold text-space-900 transition active:scale-95"
        >
          Keep playing
        </button>
        <button
          onClick={onRestart}
          className="min-h-[54px] rounded-xl border border-white/12 bg-white/5 font-medium text-cream/85 transition hover:bg-white/10 active:scale-95"
        >
          Start over
        </button>
      </motion.div>
    </motion.div>
  )
}
