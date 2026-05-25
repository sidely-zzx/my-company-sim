import { useEffect, useRef } from 'react'
import createGameApp, { type GameAppHandle } from './gameApp'

const MyComponent = () => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let game: GameAppHandle | null = null

    if (!ref.current) {
      return undefined
    }

    void createGameApp(ref.current).then((createdGame) => {
      if (disposed) {
        createdGame.destroy()
        return
      }

      game = createdGame
    })

    return () => {
      disposed = true
      game?.destroy()
    }
  }, [])

  return <div ref={ref} className="h-full w-full" />
}
export default MyComponent
