import NovaAvatar from './NovaAvatar'
import {
  gameStars,
  isComplete,
  totalCleared,
  type ProgressGameId,
  type ProgressState,
} from '../hooks/useProgress'

export type GameId = 'equivalence' | 'cookies' | 'balance' | 'pourin' | 'pourout' | 'cake'

interface Tile {
  id: GameId | 'locked'
  label: string
  blurb: string
  icon: JSX.Element
  enabled: boolean
  /** Total rounds (used for the progress badge). For the lesson, treat as a
   *  one-round "completion" — done or not. */
  totalRounds: number
}

const TILES: Tile[] = [
  {
    id: 'equivalence',
    label: 'Equivalence Lab',
    blurb: 'Smash a chocolate bar — find when ½ = 2/4',
    enabled: true,
    totalRounds: 1,
    icon: (
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none">
        <rect x="6" y="10" width="36" height="11" rx="2.5" stroke="currentColor" strokeWidth="2.6" />
        <rect x="6" y="10" width="18" height="11" rx="2.5" fill="currentColor" />
        <rect x="6" y="27" width="36" height="11" rx="2.5" stroke="currentColor" strokeWidth="2.6" />
        <rect x="6" y="27" width="18" height="11" rx="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'cookies',
    label: 'Cookie Share',
    blurb: 'Share cookies fairly — fractions as dividing up',
    enabled: true,
    totalRounds: 2,
    icon: (
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none">
        <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2.6" />
        <path d="M24 8v32M8 24h32" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="17" cy="17" r="1.8" fill="currentColor" />
        <circle cx="30" cy="28" r="1.8" fill="currentColor" />
        <circle cx="29" cy="16" r="1.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'balance',
    label: 'Balance Scale',
    blurb: 'Weigh fractions — which is bigger, which match',
    enabled: true,
    totalRounds: 4,
    icon: (
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <path d="M24 9v30M12 39h24" />
        <path d="M9 16h30" />
        <path d="M9 16l-5 10a6 6 0 0 0 10 0L9 16ZM39 16l-5 10a6 6 0 0 0 10 0L39 16Z" />
      </svg>
    ),
  },
  {
    id: 'pourin',
    label: 'Fill the Glass',
    blurb: 'Press and hold — stop pouring at the target fraction',
    enabled: true,
    totalRounds: 5,
    icon: (
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 10h20l-3 30H17z" />
        <path d="M14 28h20" />
        <path d="M24 4v4M22 6h4" />
      </svg>
    ),
  },
  {
    id: 'pourout',
    label: 'Tilt to Pour',
    blurb: 'Tilt the iPad — leave the target amount in the glass',
    enabled: true,
    totalRounds: 5,
    icon: (
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 14l16-4 3 28-16 4z" />
        <path d="M11 24l18-4" />
        <path d="M34 18l6-4M38 26l6-2" />
      </svg>
    ),
  },
  {
    id: 'cake',
    label: 'Slice the Cake',
    blurb: 'Swipe down the dotted line — slice the target fraction',
    enabled: true,
    totalRounds: 5,
    icon: (
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="18" width="36" height="22" rx="2" />
        <line x1="24" y1="12" x2="24" y2="40" strokeDasharray="2 4" />
        <path d="M6 24h36" />
      </svg>
    ),
  },
]

interface HubProps {
  onPick: (id: GameId) => void
  progress: ProgressState
  onReset: () => void
  onViewProgress: () => void
}

export default function Hub({ onPick, progress, onReset, onViewProgress }: HubProps) {
  const flagship = TILES.find((t) => t.id === 'equivalence')!
  const sandbox = TILES.filter((t) => t.id !== 'equivalence')
  const overall = totalCleared(progress)

  return (
    <section className="flex h-full w-full flex-col gap-6 px-5 pb-8 pt-10 sm:px-10 lg:flex-row lg:items-center lg:gap-12 lg:px-16">
      {/* greeting */}
      <header className="flex shrink-0 flex-col items-start gap-4 lg:w-[320px]">
        <NovaAvatar mood="happy" speaking={false} size={60} halo={0.55} />
        <h1 className="h-display font-display text-[clamp(2.4rem,6.4vh,3.6rem)] font-semibold leading-[1.02] text-cream">
          Fractions, by <em className="not-italic font-display italic text-gold-soft">feel</em>.
        </h1>
        <p className="max-w-xs text-[1.05rem] leading-relaxed text-cream/65" style={{ textWrap: 'pretty' }}>
          Hi, I'm <span className="text-gold-soft">Nova</span>. Pick a game and let's play —
          there's no wrong way to explore.
        </p>
        <p className="text-sm text-cream/35">Best on an iPad, held sideways · sound on 🔊</p>

        {/* progression summary */}
        <ProgressSummary overall={overall} onReset={onReset} onViewProgress={onViewProgress} />
      </header>

      {/* tiles */}
      <div className="flex flex-1 flex-col gap-5 lg:max-w-2xl">
        {/* Flagship — the complete, polished lesson */}
        <FlagshipTile tile={flagship} progress={progress} onPick={onPick} />

        {/* Sandbox — exploratory prototypes */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-cream/50">
            Sandbox
          </span>
          <span className="h-px flex-1 bg-cream/10" />
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-cream/30">
            prototypes
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {sandbox.map((t, i) => (
            <SandboxTile
              key={t.id}
              tile={t}
              index={i}
              progress={progress}
              onPick={onPick}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── sub-components ────────────────────────────────────────────────────── */

function ProgressSummary({
  overall,
  onReset,
  onViewProgress,
}: {
  overall: { earned: number; total: number }
  onReset: () => void
  onViewProgress: () => void
}) {
  if (overall.total === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.16em] text-cream/40">
          Fresh start · no rounds cleared yet
        </p>
        <button
          onClick={onViewProgress}
          className="text-[0.7rem] uppercase tracking-[0.16em] text-cream/45 transition hover:text-gold-soft"
        >
          View progress →
        </button>
      </div>
    )
  }
  const pct = Math.round((overall.earned / overall.total) * 100)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onViewProgress}
        className="flex items-center gap-2 rounded-full border border-gold/35 bg-gold/[0.07] px-3 py-1.5 transition hover:border-gold/55 hover:bg-gold/15"
      >
        <StarIcon className="h-3.5 w-3.5 text-gold-soft" />
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-gold-soft">
          {overall.earned} / {overall.total} cleared · {pct}%
        </span>
        <span className="text-[0.66rem] uppercase tracking-[0.18em] text-gold-soft/70">
          View →
        </span>
      </button>
      <button
        onClick={onReset}
        className="text-[0.7rem] uppercase tracking-[0.16em] text-cream/35 transition hover:text-cream/65"
      >
        Reset
      </button>
    </div>
  )
}

function FlagshipTile({
  tile,
  progress,
  onPick,
}: {
  tile: Tile
  progress: ProgressState
  onPick: (id: GameId) => void
}) {
  const gp = progress.games[tile.id as ProgressGameId]
  const complete = isComplete(gp)
  return (
    <button
      onClick={() => onPick(tile.id as GameId)}
      style={{ animation: 'replyInUp 420ms ease-out both' }}
      className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-gold/35 bg-gold/[0.07] p-6 text-left transition-all hover:border-gold/60 hover:bg-gold/15 active:scale-[0.99]"
    >
      <span
        className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-50 blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(227,178,60,0.35), transparent 70%)' }}
        aria-hidden
      />
      <span
        className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-gold/45 bg-gold/10 text-gold-soft transition-colors group-hover:bg-gold/20"
        style={{ boxShadow: '0 14px 30px -14px rgba(227,178,60,0.55)' }}
      >
        {tile.icon}
      </span>
      <span className="relative flex min-w-0 flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-gold/45 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold-soft">
            Start here
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cream/40">
            · the lesson
          </span>
          {complete && (
            <span className="flex items-center gap-1 rounded-full border border-mint/50 bg-mint/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-mint">
              <CheckIcon className="h-2.5 w-2.5" />
              Done
            </span>
          )}
        </span>
        <span className="font-display text-2xl font-semibold text-cream">
          {tile.label}
        </span>
        <span className="text-sm leading-snug text-cream/65">{tile.blurb}</span>
      </span>
    </button>
  )
}

function SandboxTile({
  tile,
  index,
  progress,
  onPick,
}: {
  tile: Tile
  index: number
  progress: ProgressState
  onPick: (id: GameId) => void
}) {
  const gp = progress.games[tile.id as ProgressGameId]
  const { earned } = gameStars(gp)
  const complete = isComplete(gp)
  return (
    <button
      disabled={!tile.enabled}
      onClick={() => tile.enabled && onPick(tile.id as GameId)}
      style={{ animation: 'replyInUp 420ms ease-out both', animationDelay: `${120 + index * 80}ms` }}
      className={[
        'group relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all',
        tile.enabled
          ? 'border-white/10 bg-white/[0.035] hover:border-gold/40 hover:bg-gold/[0.06] active:scale-[0.98]'
          : 'cursor-not-allowed border-white/8 bg-white/[0.02] opacity-50',
        complete ? 'border-mint/35 bg-mint/[0.05]' : '',
      ].join(' ')}
    >
      {/* progress badge — top right of the tile */}
      <span
        className={[
          'absolute right-3 top-3 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em]',
          complete
            ? 'border-mint/55 bg-mint/15 text-mint'
            : earned > 0
              ? 'border-gold/45 bg-gold/10 text-gold-soft'
              : 'border-white/10 bg-white/5 text-cream/40',
        ].join(' ')}
      >
        {complete ? (
          <>
            <CheckIcon className="h-2.5 w-2.5" /> {tile.totalRounds}/{tile.totalRounds}
          </>
        ) : (
          <>
            <StarIcon className="h-2.5 w-2.5" /> {earned}/{tile.totalRounds}
          </>
        )}
      </span>

      <span
        className={[
          'grid h-12 w-12 place-items-center rounded-full border transition-colors',
          tile.enabled
            ? 'border-white/15 text-cream/85 group-hover:border-gold/40 group-hover:text-gold-soft'
            : 'border-white/10 text-cream/35',
        ].join(' ')}
      >
        {tile.icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold text-cream">{tile.label}</span>
        <span className="text-[0.82rem] leading-snug text-cream/55">{tile.blurb}</span>
      </span>
    </button>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.5l2.95 6 6.6.96-4.78 4.66 1.13 6.58L12 17.6l-5.9 3.1 1.13-6.58L2.45 9.46l6.6-.96L12 2.5z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5 9-11" />
    </svg>
  )
}
