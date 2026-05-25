import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import createGameApp, { type GameAppHandle } from './gameApp'

const MyComponent = () => {
  const ref = useRef<HTMLDivElement>(null)
  const gameRef = useRef<GameAppHandle | null>(null)
  const activeEmployeeCountRef = useRef(0)
  const activeEmployeeCount = useGameStore((state) =>
    state.employees.filter((employee) => employee.status !== 'fired').length,
  )

  activeEmployeeCountRef.current = activeEmployeeCount

  useEffect(() => {
    let disposed = false

    if (!ref.current) {
      return undefined
    }

    void createGameApp(ref.current, { activeEmployeeCount }).then((createdGame) => {
      if (disposed) {
        createdGame.destroy()
        return
      }

      gameRef.current = createdGame
      createdGame.setActiveEmployeeCount(activeEmployeeCountRef.current)
    })

    return () => {
      disposed = true
      gameRef.current?.destroy()
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    gameRef.current?.setActiveEmployeeCount(activeEmployeeCount)
  }, [activeEmployeeCount])

  return <div ref={ref} className="h-full w-full" />
}
export default MyComponent
