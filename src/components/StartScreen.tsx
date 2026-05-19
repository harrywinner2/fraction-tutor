import { motion } from 'framer-motion'

/**
 * The opening tap. It exists for delight *and* for a technical reason: iOS
 * Safari only lets us start speech + audio from inside a user gesture, so the
 * whole experience begins with one big friendly button.
 */
export default function StartScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="font-display text-[clamp(3rem,9vh,5rem)] font-semibold leading-none text-cream"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Slice
      </motion.div>
      <motion.p
        className="mt-4 max-w-md text-lg text-cream/65"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        When is <span className="font-display italic text-gold-soft">one half</span> the same
        as <span className="font-display italic text-gold-soft">two quarters</span>? Let's find
        out — with chocolate.
      </motion.p>
      <motion.button
        onClick={onBegin}
        className="mt-10 rounded-full bg-gradient-to-b from-gold-soft to-gold-deep px-12 py-5 text-xl font-semibold text-space-900 shadow-glow"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 18 }}
        whileTap={{ scale: 0.95 }}
      >
        Tap to begin
      </motion.button>
      <motion.p
        className="mt-6 text-sm text-cream/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        Best on an iPad, held sideways · sound on 🔊
      </motion.p>
    </motion.div>
  )
}
