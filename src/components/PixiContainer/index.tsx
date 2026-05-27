import { useEffect, useMemo, useRef, useState } from 'react'
import { employeeStatusLabels } from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import { EmployeeDisciplineDialog } from '../game/EmployeeDisciplineDialog'
import { EmployeeDetailDialog } from '../game/EmployeeDetailDialog'
import createGameApp, { type GameAppHandle } from './gameApp'
import type { PixiEmployeeView } from './employee'

const MyComponent = () => {
  const ref = useRef<HTMLDivElement>(null)
  const gameRef = useRef<GameAppHandle | null>(null)
  const employeeViewsRef = useRef<PixiEmployeeView[]>([])
  const employees = useGameStore((state) => state.employees)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>()
  const [detailEmployeeId, setDetailEmployeeId] = useState<string>()
  const employeeViews = useMemo<PixiEmployeeView[]>(() => (
    employees
      .filter((employee) => employee.status !== 'fired')
      .map((employee) => ({
        id: employee.id,
        name: employee.nickname ?? employee.name,
        status: employee.status,
        statusLabel: employeeStatusLabels[employee.status],
      }))
  ), [employees])
  const selectedEmployee = selectedEmployeeId
    ? employees.find((employee) => employee.id === selectedEmployeeId)
    : undefined

  employeeViewsRef.current = employeeViews

  useEffect(() => {
    let disposed = false

    if (!ref.current) {
      return undefined
    }

    void createGameApp(ref.current, {
      employees: employeeViewsRef.current,
      onEmployeeClick: (employeeId) => setSelectedEmployeeId(employeeId),
    }).then((createdGame) => {
      if (disposed) {
        createdGame.destroy()
        return
      }

      gameRef.current = createdGame
      createdGame.setEmployees(employeeViewsRef.current)
    })

    return () => {
      disposed = true
      gameRef.current?.destroy()
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    gameRef.current?.setEmployees(employeeViews)
  }, [employeeViews])

  return (
    <>
      <div ref={ref} className="h-full w-full" />
      <EmployeeDisciplineDialog
        employee={selectedEmployee}
        open={Boolean(selectedEmployee)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEmployeeId(undefined)
          }
        }}
        onOpenDetail={(employeeId) => {
          setSelectedEmployeeId(undefined)
          setDetailEmployeeId(employeeId)
        }}
      />
      <EmployeeDetailDialog
        employeeId={detailEmployeeId}
        open={Boolean(detailEmployeeId)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailEmployeeId(undefined)
          }
        }}
      />
    </>
  )
}
export default MyComponent
