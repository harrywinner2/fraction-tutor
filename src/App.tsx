import { useCallback, useState } from 'react'
import { useSpeech } from './hooks/useSpeech'
import { useSound } from './hooks/useSound'
import { useProgress, type ProgressGameId } from './hooks/useProgress'
import Starfield from './components/Starfield'
import GlobalAudioToggles from './components/GlobalAudioToggles'
import LoadingScreen from './components/LoadingScreen'
import Hub, { type GameId } from './components/Hub'
import ProgressPage from './components/ProgressPage'
import EquivalenceLab from './games/EquivalenceLab'
import CookieShare from './games/CookieShare'
import BalanceScale from './games/BalanceScale'
import PourIn from './games/PourIn'
import PourOut from './games/PourOut'
import CakeSlice from './games/CakeSlice'

type Screen = 'hub' | 'progress' | GameId

/**
 * The shell. One starfield, one set of audio hooks, one progress store, and a
 * tiny router between the game-select hub and each fraction game.
 *
 * Audio is unlocked once via the LoadingScreen's "Tap to begin" button —
 * that single user gesture primes SpeechSynthesis, blesses the persistent
 * <audio> element, and starts the ambient music. While the user reads the
 * loading screen, every voice clip in the manifest is being pulled into the
 * HTTP cache in the background so the first spoken line plays instantly.
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>('hub')
  const [started, setStarted] = useState(false)
  const speech = useSpeech()
  const sound = useSound()
  const progress = useProgress()

  const begin = () => {
    speech.prime()
    sound.unlock()
    setStarted(true)
  }
  const pick = (id: GameId) => setScreen(id)
  const toHub = () => {
    speech.cancel()
    setScreen('hub')
  }
  const toProgress = () => setScreen('progress')

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

      {!started && (
        <LoadingScreen
          loaded={speech.loadProgress.loaded}
          total={speech.loadProgress.total}
          ready={speech.ready}
          onBegin={begin}
        />
      )}

      {started && <GlobalAudioToggles speech={speech} sound={sound} />}

      <main className="relative z-10 h-full w-full">
        {screen === 'hub' && (
          <Hub
            onPick={pick}
            progress={progress.state}
            onReset={progress.resetAll}
            onViewProgress={toProgress}
          />
        )}
        {screen === 'progress' && (
          <ProgressPage progress={progress.state} onBack={toHub} onReset={progress.resetAll} />
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
