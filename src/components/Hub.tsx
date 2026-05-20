import NovaAvatar from './NovaAvatar'

export type GameId = 'equivalence' | 'cookies' | 'balance' | 'pourin' | 'pourout' | 'cake'

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
    id: 'pourin',
    label: 'Fill the Glass',
    blurb: 'Tap and hold the tap — stop at the target fraction',
    enabled: true,
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
    blurb: 'Swipe to cut — match the fraction exactly',
    enabled: true,
    icon: (
      <svg viewBox="0 0 48 48" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="16" />
        <path d="M24 8L33 33" />
        <path d="M24 24l9 9" />
      </svg>
    ),
  },
]

export default function Hub({ onPick }: { onPick: (id: GameId) => void }) {
  const flagship = TILES.find((t) => t.id === 'equivalence')!
  const sandbox = TILES.filter((t) => t.id !== 'equivalence')

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
      </header>

      {/* tiles */}
      <div className="flex flex-1 flex-col gap-5 lg:max-w-2xl">
        {/* Flagship — the complete, polished lesson */}
        <button
          onClick={() => onPick(flagship.id as GameId)}
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
            {flagship.icon}
          </span>
          <span className="relative flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center gap-2">
              <span className="rounded-full border border-gold/45 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold-soft">
                Start here
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.2em] text-cream/40">
                · the lesson
              </span>
            </span>
            <span className="font-display text-2xl font-semibold text-cream">
              {flagship.label}
            </span>
            <span className="text-sm leading-snug text-cream/65">{flagship.blurb}</span>
          </span>
        </button>

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
            <button
              key={t.id}
              disabled={!t.enabled}
              onClick={() => t.enabled && onPick(t.id as GameId)}
              style={{ animation: 'replyInUp 420ms ease-out both', animationDelay: `${120 + i * 80}ms` }}
              className={[
                'group flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all',
                t.enabled
                  ? 'border-white/10 bg-white/[0.035] hover:border-gold/40 hover:bg-gold/[0.06] active:scale-[0.98]'
                  : 'cursor-not-allowed border-white/8 bg-white/[0.02] opacity-50',
              ].join(' ')}
            >
              <span
                className={[
                  'grid h-12 w-12 place-items-center rounded-full border transition-colors',
                  t.enabled
                    ? 'border-white/15 text-cream/85 group-hover:border-gold/40 group-hover:text-gold-soft'
                    : 'border-white/10 text-cream/35',
                ].join(' ')}
              >
                {t.icon}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold text-cream">{t.label}</span>
                <span className="text-[0.82rem] leading-snug text-cream/55">{t.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
