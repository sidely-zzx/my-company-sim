import { useEffect, useMemo, useRef, useState } from 'react'
import { employeeStatusLabels } from '../../game/ui'
import { getStarterStatusEmployeeId } from '../../game/systems/tutorialSystem'
import { useGameStore } from '../../store/gameStore'
import { EmployeeDisciplineDialog } from '../game/EmployeeDisciplineDialog'
import { EmployeeDetailDialog } from '../game/EmployeeDetailDialog'
import createGameApp, { OFFICE_IMAGE_HEIGHT, OFFICE_IMAGE_WIDTH, type GameAppHandle } from './gameApp'
import type { PixiEmployeeView } from './employee'
import {
  DESK_COLUMNS,
  DESK_COLUMN_CENTER_XS,
  DESK_ROW_CENTER_YS,
} from './desk'

const TUTORIAL_EMPLOYEE_OFFSET_X = -20
const TUTORIAL_EMPLOYEE_HOTSPOT_WIDTH = 116
const TUTORIAL_EMPLOYEE_HOTSPOT_HEIGHT = 150
const TUTORIAL_EMPLOYEE_HOTSPOT_OFFSET_Y = -92

const MyComponent = () => {
  const ref = useRef<HTMLDivElement>(null)
  const gameRef = useRef<GameAppHandle | null>(null)
  const employeeViewsRef = useRef<PixiEmployeeView[]>([])
  const employees = useGameStore((state) => state.employees)
  const tutorial = useGameStore((state) => state.tutorial)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>()
  const [detailEmployeeId, setDetailEmployeeId] = useState<string>()
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
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
  const tutorialEmployeeId = getStarterStatusEmployeeId(tutorial)
  const tutorialEmployeeIndex = tutorialEmployeeId
    ? employeeViews.findIndex((employee) => employee.id === tutorialEmployeeId)
    : -1
  const tutorialHotspotStyle = useMemo(() => {
    if (tutorialEmployeeIndex < 0 || viewportSize.width <= 0 || viewportSize.height <= 0) {
      return undefined
    }

    const row = Math.floor(tutorialEmployeeIndex / DESK_COLUMNS)
    const column = tutorialEmployeeIndex % DESK_COLUMNS
    const stationX = DESK_COLUMN_CENTER_XS[column]
    const stationY = DESK_ROW_CENTER_YS[row]
    if (stationX === undefined || stationY === undefined) {
      return undefined
    }

    // 教学员工热点只负责把办公室里可见的员工变成 DOM 锚点和点击入口；真实员工位置仍由 Pixi 场景绘制。
    const officeScale = Math.max(viewportSize.width / OFFICE_IMAGE_WIDTH, viewportSize.height / OFFICE_IMAGE_HEIGHT)
    const officeLeft = (viewportSize.width - OFFICE_IMAGE_WIDTH * officeScale) / 2
    const officeTop = (viewportSize.height - OFFICE_IMAGE_HEIGHT * officeScale) / 2
    const width = TUTORIAL_EMPLOYEE_HOTSPOT_WIDTH * officeScale
    const height = TUTORIAL_EMPLOYEE_HOTSPOT_HEIGHT * officeScale
    const centerX = officeLeft + (stationX + TUTORIAL_EMPLOYEE_OFFSET_X) * officeScale
    const top = officeTop + (stationY + TUTORIAL_EMPLOYEE_HOTSPOT_OFFSET_Y) * officeScale

    return {
      left: `${centerX - width / 2}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    }
  }, [tutorialEmployeeIndex, viewportSize.height, viewportSize.width])

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

  useEffect(() => {
    const node = ref.current
    if (!node) {
      return undefined
    }

    const updateSize = () => {
      setViewportSize({ width: node.clientWidth, height: node.clientHeight })
    }
    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(node)
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <>
      <div className="relative h-full w-full overflow-hidden">
        <div className="h-full w-full" ref={ref} />
        {tutorialEmployeeId && tutorialHotspotStyle ? (
          <button
            type="button"
            data-tutorial-anchor="starter-employee-hotspot"
            className="absolute z-20 grid place-items-center rounded-lg border-2 border-[#ffd46a] bg-[rgba(255,212,106,0.14)] text-[11px] font-black text-[#fff3cd] shadow-[0_0_0_2px_rgba(255,212,106,0.28),0_0_26px_rgba(255,212,106,0.42)]"
            style={tutorialHotspotStyle}
            onClick={() => setSelectedEmployeeId(tutorialEmployeeId)}
          >
            抓摸鱼
          </button>
        ) : null}
      </div>
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
