export type GameId = 'equivalence' | 'cookies' | 'balance'

interface Tile {
  id: GameId | 'locked'
  label: string
  blurb: string
  icon: JSX.Element
  enabled: boolean
}

const TILES: Tile[] = [
  {
    id: 'equivalence',
    label: 'Equivalence Lab',
    blurb: 'Smash a chocolate bar — find when ½ = 2/4',
    enabled: true,
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
    icon: (
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <path d="M24 9v30M12 39h24" />
        <path d="M9 16h30" />
        <path d="M9 16l-5 10a6 6 0 0 0 10 0L9 16ZM39 16l-5 10a6 6 0 0 0 10 0L39 16Z" />
      </svg>
    ),
  },
  {
    id: 'locked',
    label: 'More soon',
    blurb: 'Number line · pour · merge — coming next',
    enabled: false,
    icon: (
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
        <rect x="13" y="22" width="22" height="16" rx="3" />
        <path d="M18 22v-5a6 6 0 0 1 12 0v5" />
      </svg>
    ),
  },
]

export default function Hub({ onPick }: { onPick: (id: GameId) => void }) {
  return (
    <div className="flex h-full w-full flex-col gap-6 px-5 pb-8 pt-10 sm:px-10 lg:flex-row lg:items-center lg:gap-12 lg:px-16">
      {/* greeting */}
      <div className="flex shrink-0 flex-col items-start gap-4 lg:w-[320px]">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold-deep shadow-glow">
          <svg width="34" height="34" viewBox="-16 -16 32 32">
            <ellipse cx="-6" cy="-2" rx="2.6" ry="3" fill="#3a2a14" />
            <ellipse cx="6" cy="-2" rx="2.6" ry="3" fill="#3a2a14" />
            <path d="M -6 4 Q 0 10 6 4" stroke="#3a2a14" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-display text-[clamp(2.2rem,6vh,3.2rem)] font-semibold leading-tight text-cream">
          Fractions
        </h1>
        <p className="max-w-xs text-[1.05rem] leading-relaxed text-cream/65">
          Hi, I'm <span className="text-gold-soft">Nova</span>. Pick a game and
          let's play with fractions — there's no wrong way to explore.
        </p>
        <p className="text-sm text-cream/35">Best on an iPad, held sideways · sound on 🔊</p>
      </div>

      {/* tiles */}
      <div className="grid flex-1 grid-cols-2 gap-4 sm:gap-5 lg:max-w-2xl xl:grid-cols-2">
        {TILES.map((t, i) => (
          <button
            key={t.id}
            disabled={!t.enabled}
            onClick={() => t.enabled && onPick(t.id as GameId)}
            style={{ animation: 'replyInUp 420ms ease-out both', animationDelay: `${i * 80}ms` }}
            className={[
              'group flex items-center gap-4 rounded-2xl border p-5 text-left transition-all',
              t.enabled
                ? 'border-white/12 bg-white/[0.05] hover:border-gold/50 hover:bg-gold/10 active:scale-[0.98]'
                : 'cursor-not-allowed border-white/8 bg-white/[0.02] opacity-50',
            ].join(' ')}
          >
            <span
              className={[
                'grid h-16 w-16 shrink-0 place-items-center rounded-full border transition-colors',
                t.enabled
                  ? 'border-gold/40 text-gold-soft group-hover:bg-gold/15'
                  : 'border-white/15 text-cream/40',
              ].join(' ')}
            >
              {t.icon}
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-lg font-semibold text-cream">{t.label}</span>
              <span className="text-sm leading-snug text-cream/55">{t.blurb}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
