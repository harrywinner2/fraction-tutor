import { motion } from 'framer-motion'
import type { Mood } from '../types'

/**
 * The little crowd that peeks over the table in the Synthesis screenshots.
 * They are the warmth of the room — their faces and bounce react to the
 * lesson's mood so the student feels cheered on, not tested.
 */

export interface Kid {
  skin: string
  hair: string
  hairStyle: 'bun' | 'curls' | 'short' | 'wave'
}

export const KIDS: Kid[] = [
  { skin: '#E8B98C', hair: '#3A2A1C', hairStyle: 'bun' },
  { skin: '#C98A5E', hair: '#1C1C24', hairStyle: 'curls' },
  { skin: '#F0C9A0', hair: '#6B4A2A', hairStyle: 'wave' },
  { skin: '#A86A45', hair: '#241A12', hairStyle: 'short' },
]

function Face({ mood }: { mood: Mood }) {
  // Eyes
  const eyeWide = mood === 'surprised'
  const eyeHappy = mood === 'cheer' || mood === 'happy'
  // Mouth path per mood
  const mouth =
    mood === 'cheer'
      ? 'M -9 4 Q 0 18 9 4 Q 0 9 -9 4 Z'
      : mood === 'surprised'
        ? '' // drawn as ellipse below
        : mood === 'happy'
          ? 'M -8 4 Q 0 13 8 4'
          : mood === 'encourage'
            ? 'M -7 5 Q 0 10 7 5'
            : mood === 'curious'
              ? 'M -6 6 Q 2 9 7 4'
              : mood === 'sad'
                ? 'M -7 8 Q 0 1 7 8'
                : 'M -6 5 Q 0 8 6 5'

  return (
    <g>
      {/* eyes */}
      {eyeHappy ? (
        <>
          <path d="M -13 -4 Q -9 -9 -5 -4" stroke="#2a2018" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M 5 -4 Q 9 -9 13 -4" stroke="#2a2018" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="-9" cy="-4" rx={eyeWide ? 3.4 : 2.6} ry={eyeWide ? 4.2 : 3} fill="#2a2018" />
          <ellipse cx="9" cy="-4" rx={eyeWide ? 3.4 : 2.6} ry={eyeWide ? 4.2 : 3} fill="#2a2018" />
        </>
      )}
      {/* curious raised brow */}
      {mood === 'curious' && (
        <path d="M 4 -11 Q 9 -13 14 -10" stroke="#2a2018" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
      {/* sad sloping brows */}
      {mood === 'sad' && (
        <>
          <path d="M -13 -10 Q -9 -8 -5 -9" stroke="#2a2018" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 5 -9 Q 9 -8 13 -10" stroke="#2a2018" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
      {/* mouth */}
      {mood === 'surprised' ? (
        <ellipse cx="0" cy="7" rx="5" ry="6.5" fill="#5a2a2a" />
      ) : (
        <path
          d={mouth}
          stroke="#5a2a2a"
          strokeWidth="2.4"
          fill={mood === 'cheer' ? '#7a3535' : 'none'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* cheeks when cheering */}
      {mood === 'cheer' && (
        <>
          <circle cx="-16" cy="3" r="3.5" fill="#F2A0A0" opacity="0.55" />
          <circle cx="16" cy="3" r="3.5" fill="#F2A0A0" opacity="0.55" />
        </>
      )}
    </g>
  )
}

function Hair({ style, color }: { style: Kid['hairStyle']; color: string }) {
  switch (style) {
    case 'bun':
      return (
        <>
          <circle cx="0" cy="-30" r="7" fill={color} />
          <path d="M -22 -8 Q -24 -30 0 -32 Q 24 -30 22 -8 Q 14 -22 0 -22 Q -14 -22 -22 -8 Z" fill={color} />
        </>
      )
    case 'curls':
      return (
        <g fill={color}>
          <circle cx="-16" cy="-16" r="9" />
          <circle cx="0" cy="-22" r="10" />
          <circle cx="16" cy="-16" r="9" />
          <circle cx="-20" cy="-4" r="7" />
          <circle cx="20" cy="-4" r="7" />
        </g>
      )
    case 'wave':
      return (
        <path
          d="M -22 -4 Q -26 -26 0 -28 Q 26 -26 22 -4 Q 18 -16 10 -14 Q 4 -22 0 -20 Q -4 -22 -10 -14 Q -18 -16 -22 -4 Z"
          fill={color}
        />
      )
    default: // short
      return <path d="M -21 -6 Q -22 -26 0 -27 Q 22 -26 21 -6 Q 10 -18 0 -18 Q -10 -18 -21 -6 Z" fill={color} />
  }
}

export function KidAvatar({
  kid,
  mood,
  index = 0,
}: {
  kid: Kid
  mood: Mood
  index?: number
}) {
  const cheering = mood === 'cheer'
  return (
    <motion.svg
      width="92"
      height="104"
      viewBox="-30 -40 60 70"
      initial={false}
      animate={{
        y: cheering ? [-2, -16, -2] : [0, -3, 0],
        rotate: mood === 'curious' && index % 2 === 0 ? -7 : 0,
      }}
      transition={
        cheering
          ? { duration: 0.55, repeat: 2, ease: 'easeOut' }
          : { duration: 3 + index * 0.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }
      }
      style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.4))' }}
    >
      {/* shoulders */}
      <path d="M -26 30 Q -22 8 0 8 Q 22 8 26 30 Z" fill="#2c3658" />
      {/* head */}
      <circle cx="0" cy="0" r="20" fill={kid.skin} />
      <Hair style={kid.hairStyle} color={kid.hair} />
      <Face mood={mood} />
      {cheering && (
        <>
          <motion.text
            x="-26"
            y="-26"
            fontSize="14"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0.6], y: [-26, -38] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.15 }}
          >
            ✨
          </motion.text>
          <motion.text
            x="20"
            y="-22"
            fontSize="12"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.5], y: [-22, -34] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 + index * 0.15 }}
          >
            ⭐
          </motion.text>
        </>
      )}
    </motion.svg>
  )
}

export default function Characters({ mood }: { mood: Mood }) {
  return (
    <div className="relative flex w-full flex-col items-center">
      <div className="flex items-end justify-center gap-1 sm:gap-3">
        {KIDS.map((kid, i) => (
          <KidAvatar key={i} kid={kid} mood={mood} index={i} />
        ))}
      </div>
      {/* the table / rail they peek over */}
      <div className="-mt-5 h-4 w-[min(680px,82vw)] rounded-full bg-gradient-to-b from-[#3a4566] to-[#222a44]" />
      <div className="-mt-3 h-3 w-[min(680px,82vw)] rounded-full bg-[#1a2138] shadow-[0_8px_20px_rgba(0,0,0,0.45)]" />
    </div>
  )
}
