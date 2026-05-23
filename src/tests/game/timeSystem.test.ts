import { describe, expect, it } from 'vitest'

import { WORK_START_MINUTE } from '../../game/constants'
import { createInitialGameState } from '../../game/initialState'
import { updateEmployeeSatisfaction } from '../../game/systems/employeeSystem'
import { advanceGameTime, setOffWorkHour, setSpeed } from '../../game/systems/timeSystem'
import { createTestEmployee } from './testHelpers'

describe('timeSystem', () => {
  it('jumps to the next day at the configured off-work hour', () => {
    const state = createInitialGameState(1)
    const result = advanceGameTime(state, 9 * 60 * 2000)

    expect(result.time.day).toBe(2)
    expect(result.time.minuteOfDay).toBe(WORK_START_MINUTE)
    expect(result.financeReports.some((report) => report.day === 1)).toBe(true)
  })

  it('supports 18:00, 21:00, and 24:00 off-work boundaries', () => {
    const base = createInitialGameState(1)
    const at18 = advanceGameTime(setOffWorkHour(base, 18), 9 * 60 * 2000)
    const at21 = advanceGameTime(setOffWorkHour(base, 21), 12 * 60 * 2000)
    const at24 = advanceGameTime(setOffWorkHour(base, 24), 15 * 60 * 2000)

    expect(at18.time.day).toBe(2)
    expect(at21.time.day).toBe(2)
    expect(at24.time.day).toBe(2)
  })

  it('supports pause and 2x speed', () => {
    const state = createInitialGameState(1)
    const paused = advanceGameTime(setSpeed(state, 0), 2000)
    const fast = advanceGameTime(setSpeed(state, 2), 2000)

    expect(paused.time.minuteOfDay).toBe(WORK_START_MINUTE)
    expect(fast.time.minuteOfDay).toBe(WORK_START_MINUTE + 2)
  })

  it('reduces satisfaction more when the workday ends late', () => {
    const state = createInitialGameState(1)
    state.employees = [createTestEmployee({ satisfaction: 80 })]
    const result = updateEmployeeSatisfaction(setOffWorkHour(state, 21))

    expect(result.employees[0]?.satisfaction).toBe(74)
  })
})
