import { useCallback, useState } from 'react'
import { useSpeech } from './hooks/useSpeech'
import { useSound } from './hooks/useSound'
import { useProgress, type ProgressGameId } from './hooks/useProgress'
import Starfield from './components/Starfield'
import GlobalAudioToggles from './components/GlobalAudioToggles'
import Hub, { type GameId } from './components/Hub'
import EquivalenceLab from './games/EquivalenceLab'
import CookieShare from './games/CookieShare'
import BalanceScale from './games/BalanceScale'
import PourIn from './games/PourIn'
import PourOut from './games/PourOut'
import CakeSlice from './games/CakeSlice'

/**
 * The shell. One starfield, one set of audio hooks, one progress store, and a
 * tiny router between the game-select hub and each fraction game. Audio is
 * primed on the first tile tap — the user gesture iOS requires before any
 * speech or sound.
 */
export default function App() {
  const [screen, setScreen] = useState<'hub' | GameId>('hub')
  const speech = useSpeech()
  const sound = useSound()
  const progress = useProgress()

  const pick = (id: GameId) => {
    speech.prime()
    sound.unlock()
    setScreen(id)
  }
  const toHub = () => {
    speech.cancel()
    setScreen('hub')
  }

  // Per-game progression callback — every game calls this when a round is
  // cleared. The `id` argument is closured so each game receives a clean
  // `(round, total) => void` and never needs to know its own GameId.
  const onRoundCleared = useCallback(
    (id: ProgressGameId) => (round: number, total: number) =>
      progress.recordRound(id, round, total),
    [progress],
  )
  const onLessonComplete = useCallback(
    () => progress.markLessonComplete('equivalence'),
    [progress],
  )

  return (
    <div className="relative h-full w-full overflow-hidden bg-space-900 font-sans">
      <Starfield />
      <div className="pointer-events-none absolute inset-0 grain" aria-hidden />
      <GlobalAudioToggles speech={speech} sound={sound} />
      <main className="relative z-10 h-full w-full">
        {screen === 'hub' && (
          <Hub onPick={pick} progress={progress.state} onReset={progress.resetAll} />
        )}
        {screen === 'equivalence' && (
          <EquivalenceLab
            speech={speech}
            sound={sound}
            onExit={toHub}
            onLessonComplete={onLessonComplete}
          />
        )}
        {screen === 'cookies' && (
          <CookieShare
            speech={speech}
            sound={sound}
            onExit={toHub}
            onRoundCleared={onRoundCleared('cookies')}
          />
        )}
        {screen === 'balance' && (
          <BalanceScale
            speech={speech}
            sound={sound}
            onExit={toHub}
            onRoundCleared={onRoundCleared('balance')}
          />
        )}
        {screen === 'pourin' && (
          <PourIn
            speech={speech}
            sound={sound}
            onExit={toHub}
            onRoundCleared={onRoundCleared('pourin')}
          />
        )}
        {screen === 'pourout' && (
          <PourOut
            speech={speech}
            sound={sound}
            onExit={toHub}
            onRoundCleared={onRoundCleared('pourout')}
          />
        )}
        {screen === 'cake' && (
          <CakeSlice
            speech={speech}
            sound={sound}
            onExit={toHub}
            onRoundCleared={onRoundCleared('cake')}
          />
        )}
      </main>
    </div>
  )
}
