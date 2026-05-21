import { useCallback, useEffect, useState } from 'react'

/**
 * Tiny per-game progression tracker, persisted to localStorage.
 *
 * Why this exists: progress that vanishes between sessions feels disposable.
 * Even for a four-page prototype, surfacing "you cleared 3 of 5 cake rounds
 * last time" turns the menu from a chooser into a journey. It also gives a
 * teacher or parent something to glance at without micromanaging.
 *
 * What we track: per-game, the *set* of round indices that have been cleared
 * (so out-of-order play counts honestly), the total rounds known, and first/
 * latest play timestamps. The Equivalence Lab is treated as a one-round
 * "lesson" — cleared when the player reaches the finale beat.
 *
 * Shape on disk: a single JSON blob keyed by `STORAGE_KEY`, schema-versioned
 * so we can evolve without trashing old saves.
 */

export type ProgressGameId =
  | 'equivalence'
  | 'cookies'
  | 'balance'
  | 'pourin'
  | 'pourout'
  | 'cake'

export interface GameProgress {
  cleared: number[]
  total: number
  completedAt?: number
  lastPlayedAt?: number
}

export interface ProgressState {
  schemaVersion: 1
  games: Partial<Record<ProgressGameId, GameProgress>>
}

const STORAGE_KEY = 'slice-progress-v1'
const EMPTY: ProgressState = { schemaVersion: 1, games: {} }

function load(): ProgressState {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as ProgressState
    if (parsed.schemaVersion !== 1) return EMPTY
    return parsed
  } catch {
    return EMPTY
  }
}

function save(state: ProgressState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* private mode / quota — silently drop */
  }
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(() => load())

  // Persist on every change. Tiny payload, no need for debouncing.
  useEffect(() => {
    save(state)
  }, [state])

  /** Note that a specific round of a specific game was cleared. Idempotent —
   *  re-clearing an already-cleared round just refreshes the play timestamp. */
  const recordRound = useCallback((id: ProgressGameId, roundIndex: number, total: number) => {
    setState((prev) => {
      const now = Date.now()
      const existing = prev.games[id]
      const cleared = new Set(existing?.cleared ?? [])
      cleared.add(roundIndex)
      const clearedArr = [...cleared].sort((a, b) => a - b)
      const next: GameProgress = {
        cleared: clearedArr,
        total: Math.max(total, existing?.total ?? 0),
        completedAt:
          existing?.completedAt ??
          (clearedArr.length >= total && total > 0 ? now : undefined),
        lastPlayedAt: now,
      }
      return { ...prev, games: { ...prev.games, [id]: next } }
    })
  }, [])

  /** Convenience for single-arc experiences (the Equivalence Lab lesson). */
  const markLessonComplete = useCallback(
    (id: ProgressGameId = 'equivalence') => {
      // Treated as a one-round game: round 0 of 1.
      // recordRound is idempotent so repeat completions are harmless.
      setState((prev) => {
        const now = Date.now()
        const existing = prev.games[id]
        const next: GameProgress = {
          cleared: [0],
          total: 1,
          completedAt: existing?.completedAt ?? now,
          lastPlayedAt: now,
        }
        return { ...prev, games: { ...prev.games, [id]: next } }
      })
    },
    [],
  )

  const resetAll = useCallback(() => {
    setState(EMPTY)
  }, [])

  return { state, recordRound, markLessonComplete, resetAll }
}

/* ─ helpers consumed by the UI ─────────────────────────────────────────── */

export function gameStars(p: GameProgress | undefined): { earned: number; total: number } {
  if (!p) return { earned: 0, total: 0 }
  return { earned: p.cleared.length, total: p.total }
}

export function isComplete(p: GameProgress | undefined): boolean {
  if (!p) return false
  return p.total > 0 && p.cleared.length >= p.total
}

/** Sum every cleared round across every game — the headline number the Hub
 *  shows so the player sees their total contribution at a glance. */
export function totalCleared(state: ProgressState): { earned: number; total: number } {
  let earned = 0
  let total = 0
  for (const g of Object.values(state.games)) {
    if (!g) continue
    earned += g.cleared.length
    total += g.total
  }
  return { earned, total }
}
