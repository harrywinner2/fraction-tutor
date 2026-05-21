import {
  gameStars,
  isComplete,
  totalCleared,
  type GameProgress,
  type ProgressGameId,
  type ProgressState,
} from '../hooks/useProgress'

interface Props {
  progress: ProgressState
  onBack: () => void
  onReset: () => void
}

/* ──────────────────────────────────────────────────────────────────────── *
 *  Meta — kept in lockstep with each game's LEVELS / ROUNDS so the page
 *  knows how many stars each game can ever award.
 * ──────────────────────────────────────────────────────────────────────── */
interface GameMeta {
  id: ProgressGameId
  label: string
  totalRounds: number
  color: 'gold' | 'mint' | 'cyan' | 'pink' | 'violet' | 'orange'
  icon: JSX.Element
  blurb: string
}

const META: GameMeta[] = [
  {
    id: 'equivalence',
    label: 'Equivalence Lab',
    totalRounds: 1,
    color: 'gold',
    blurb: 'The flagship lesson — a single end-to-end arc.',
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
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
    totalRounds: 2,
    color: 'pink',
    blurb: 'Two fairness puzzles.',
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
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
    totalRounds: 4,
    color: 'violet',
    blurb: 'Four targets to weigh up.',
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M24 9v30M12 39h24" />
        <path d="M9 16h30" />
        <path d="M9 16l-5 10a6 6 0 0 0 10 0L9 16ZM39 16l-5 10a6 6 0 0 0 10 0L39 16Z" />
      </svg>
    ),
  },
  {
    id: 'pourin',
    label: 'Fill the Glass',
    totalRounds: 5,
    color: 'cyan',
    blurb: 'Five tap-and-hold rounds.',
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 10h20l-3 30H17z" />
        <path d="M14 28h20" />
        <path d="M24 4v4M22 6h4" />
      </svg>
    ),
  },
  {
    id: 'pourout',
    label: 'Tilt to Pour',
    totalRounds: 5,
    color: 'mint',
    blurb: 'Five tilts to leave behind.',
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 14l16-4 3 28-16 4z" />
        <path d="M11 24l18-4" />
        <path d="M34 18l6-4M38 26l6-2" />
      </svg>
    ),
  },
  {
    id: 'cake',
    label: 'Slice the Cake',
    totalRounds: 5,
    color: 'orange',
    blurb: 'Five cuts to nail.',
    icon: (
      <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="18" width="36" height="22" rx="2" />
        <line x1="24" y1="12" x2="24" y2="40" strokeDasharray="2 4" />
        <path d="M6 24h36" />
      </svg>
    ),
  },
]

const COLOR_RING: Record<GameMeta['color'], string> = {
  gold: 'border-gold/50 text-gold-soft',
  mint: 'border-mint/50 text-mint',
  cyan: 'border-cyan-300/50 text-cyan-200',
  pink: 'border-pink-300/40 text-pink-200',
  violet: 'border-violet-300/40 text-violet-200',
  orange: 'border-orange-300/45 text-orange-200',
}

export default function ProgressPage({ progress, onBack, onReset }: Props) {
  const overall = totalCleared(progress)
  const pct = overall.total === 0 ? 0 : Math.round((overall.earned / overall.total) * 100)

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-7 px-5 pb-14 pt-6 sm:px-10 sm:pt-10">
        {/* header row */}
        <div className="flex items-center justify-between gap-3 pr-24 sm:pr-28">
          <button
            onClick={onBack}
            aria-label="Back to menu"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-cream/80 backdrop-blur transition hover:bg-white/10 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-cream/45">
            Progress
          </p>
        </div>

        {/* hero summary */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gold/[0.06] px-6 py-7 sm:px-10 sm:py-10">
          <span
            className="absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl opacity-60"
            style={{ background: 'radial-gradient(circle, rgba(227,178,60,0.35), transparent 70%)' }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-gold-soft/90">
                Your journey so far
              </p>
              <h1 className="font-display text-[clamp(2rem,5.2vh,2.8rem)] font-semibold leading-tight text-cream">
                {overall.earned} <span className="text-cream/55">of</span> {overall.total} rounds cleared
              </h1>
              <p className="text-sm text-cream/55">
                {pct === 0
                  ? 'Pick a game and start exploring — Nova will guide you.'
                  : pct === 100
                    ? "Every round, cleared. You really do feel fractions now."
                    : `${pct}% of the way through. Keep going — there's more to find.`}
              </p>
            </div>

            {/* progress ring */}
            <ProgressRing pct={pct} earned={overall.earned} total={overall.total} />
          </div>
        </section>

        {/* per-game grid */}
        <section className="flex flex-col gap-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-cream/55">
            Per-game breakdown
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {META.map((m) => (
              <GameCard key={m.id} meta={m} p={progress.games[m.id]} />
            ))}
          </div>
        </section>

        {/* footer */}
        <div className="flex items-center justify-between pt-4">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-cream/35">
            Stored locally in your browser · no account, no upload
          </p>
          <button
            onClick={onReset}
            className="text-[0.72rem] uppercase tracking-[0.18em] text-cream/40 transition hover:text-cream/75"
          >
            Reset progress
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── pieces ────────────────────────────────────────────────────────────── */

function ProgressRing({ pct, earned, total }: { pct: number; earned: number; total: number }) {
  const SIZE = 132
  const STROKE = 9
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const offset = CIRC * (1 - pct / 100)

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke="url(#ringGrad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{
            transform: `rotate(-90deg)`,
            transformOrigin: `${SIZE / 2}px ${SIZE / 2}px`,
            transition: 'stroke-dashoffset 600ms ease-out',
          }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EBC76A" />
            <stop offset="100%" stopColor="#5BD6A0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center">
          <span className="font-display text-3xl font-semibold tabular-nums text-cream">
            {pct}%
          </span>
          <span className="text-[0.62rem] uppercase tracking-[0.18em] text-cream/45">
            {earned} / {total || 0}
          </span>
        </div>
      </div>
    </div>
  )
}

function GameCard({ meta, p }: { meta: GameMeta; p: GameProgress | undefined }) {
  const { earned, total: actualTotal } = gameStars(p)
  // Use card meta total if the player hasn't played yet (no `p`).
  const total = actualTotal || meta.totalRounds
  const complete = isComplete(p)
  const ringClass = COLOR_RING[meta.color]
  const cleared = new Set(p?.cleared ?? [])

  return (
    <div
      className={[
        'relative flex flex-col gap-4 rounded-2xl border bg-white/[0.03] p-5 transition-colors',
        complete ? 'border-mint/40 bg-mint/[0.045]' : 'border-white/10',
      ].join(' ')}
    >
      {/* top row: icon + name + completion chip */}
      <div className="flex items-start gap-3">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border bg-white/[0.04] ${ringClass}`}
        >
          {meta.icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-base font-semibold text-cream">{meta.label}</p>
          <p className="text-[0.78rem] leading-snug text-cream/55">{meta.blurb}</p>
        </div>
        <span
          className={[
            'shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em]',
            complete
              ? 'border-mint/55 bg-mint/15 text-mint'
              : earned > 0
                ? 'border-gold/45 bg-gold/10 text-gold-soft'
                : 'border-white/10 bg-white/5 text-cream/40',
          ].join(' ')}
        >
          {earned} / {total}
        </span>
      </div>

      {/* round dots */}
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const hit = cleared.has(i)
          return (
            <span
              key={i}
              className={[
                'inline-flex h-7 w-7 items-center justify-center rounded-full border text-[0.68rem] font-semibold transition-colors',
                hit
                  ? complete
                    ? 'border-mint/55 bg-mint/15 text-mint'
                    : 'border-gold/55 bg-gold/15 text-gold-soft'
                  : 'border-white/12 bg-white/[0.03] text-cream/30',
              ].join(' ')}
              aria-label={hit ? `Round ${i + 1} cleared` : `Round ${i + 1} not yet`}
            >
              {hit ? '★' : i + 1}
            </span>
          )
        })}
      </div>

      {/* recency */}
      <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.16em] text-cream/40">
        <span>
          {complete && p?.completedAt
            ? `Finished ${relative(p.completedAt)}`
            : earned > 0
              ? `Latest: ${relative(p?.lastPlayedAt)}`
              : 'Not played yet'}
        </span>
        {complete && <span className="text-mint/85">★ complete</span>}
      </div>
    </div>
  )
}

/** Compact relative-time formatter — "just now" / "3 hours ago" / "5 May". */
function relative(ts: number | undefined): string {
  if (!ts) return '—'
  const diff = Date.now() - ts
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
