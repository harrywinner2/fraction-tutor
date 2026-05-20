import { useState } from 'react'
import { useSpeech } from './hooks/useSpeech'
import { useSound } from './hooks/useSound'
import Starfield from './components/Starfield'
import Hub, { type GameId } from './components/Hub'
import EquivalenceLab from './games/EquivalenceLab'
import CookieShare from './games/CookieShare'
import BalanceScale from './games/BalanceScale'
import PourIn from './games/PourIn'
import PourOut from './games/PourOut'
import CakeSlice from './games/CakeSlice'

/**
 * The shell. One starfield, one set of audio hooks, and a tiny router between
 * the game-select hub and each fraction game. Audio is primed on the first
 * tile tap — the user gesture iOS requires before any speech or sound.
 */
export default function App() {
  const [screen, setScreen] = useState<'hub' | GameId>('hub')
  const speech = useSpeech()
  const sound = useSound()

  const pick = (id: GameId) => {
    speech.prime()
    sound.unlock()
    setScreen(id)
  }
  const toHub = () => {
    speech.cancel()
    setScreen('hub')
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-space-900 font-sans">
      <Starfield />
      <div className="pointer-events-none absolute inset-0 grain" aria-hidden />
      <main className="relative z-10 h-full w-full">
        {screen === 'hub' && <Hub onPick={pick} />}
        {screen === 'equivalence' && (
          <EquivalenceLab speech={speech} sound={sound} onExit={toHub} />
        )}
        {screen === 'cookies' && (
          <CookieShare speech={speech} sound={sound} onExit={toHub} />
        )}
        {screen === 'balance' && (
          <BalanceScale speech={speech} sound={sound} onExit={toHub} />
        )}
        {screen === 'pourin' && <PourIn speech={speech} sound={sound} onExit={toHub} />}
        {screen === 'pourout' && <PourOut speech={speech} sound={sound} onExit={toHub} />}
        {screen === 'cake' && <CakeSlice speech={speech} sound={sound} onExit={toHub} />}
      </main>
    </div>
  )
}
