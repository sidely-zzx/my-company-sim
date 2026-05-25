import { useEffect } from 'react'

import { useGameStore } from '../../store/gameStore'

export function GameClock() {
  useEffect(() => {
    let lastTickAt = performance.now()
    const intervalId = window.setInterval(() => {
      const now = performance.now()
      const realDeltaMs = Math.min(now - lastTickAt, 1000)
      lastTickAt = now
      const state = useGameStore.getState()
      if (state.time.speed === 0 || state.time.paused) {
        return
      }
      state.tick(realDeltaMs)
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [])

  return null
}
