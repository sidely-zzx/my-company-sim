import { describe, expect, it } from 'vitest'

import {
  advanceEmployeeBehavior,
  applyEmployeeDiscipline,
  calculateEmployeeOutput,
  calculateFireCompensation,
} from '../../game/systems/employeeSystem'
import { createTestEmployee, createTestState } from './testHelpers'

describe('employeeSystem', () => {
  it('updates behavior only on every tenth game minute', () => {
    const state = createTestState()
    state.employees = [
      createTestEmployee({
        assignedTo: { type: 'project', id: 'project-test', role: 'product' },
        status: 'working',
        behaviorSeed: 1,
      }),
    ]

    advanceEmployeeBehavior(state, 9)
    expect(state.employees[0]?.behaviorSeed).toBe(1)

    advanceEmployeeBehavior(state, 10)
    expect(state.employees[0]?.behaviorSeed).not.toBe(1)
  })

  it('uses employee status as project output multiplier', () => {
    const state = createTestState()
    const focused = createTestEmployee({ status: 'focused_work', realSkillAbilities: { product: 80 } })
    const working = createTestEmployee({ status: 'working', realSkillAbilities: { product: 80 } })
    const slacking = createTestEmployee({ status: 'slacking', realSkillAbilities: { product: 80 } })

    expect(calculateEmployeeOutput(state, focused, 'product')).toBeCloseTo(1.12)
    expect(calculateEmployeeOutput(state, working, 'product')).toBe(0.8)
    expect(calculateEmployeeOutput(state, slacking, 'product')).toBe(0)
  })

  it('records fine income with selected ratio and changes employee attributes', () => {
    const state = createTestState()
    state.employees = [
      createTestEmployee({
        id: 'employee-1',
        status: 'gaming',
        salaryPerDay: 300,
        loyalty: 70,
        satisfaction: 80,
        assignedTo: { type: 'project', id: 'project-test', role: 'product' },
      }),
    ]

    const result = applyEmployeeDiscipline(state, 'employee-1', 'fine', 0.2)

    expect(result.money).toBe(state.money + 60)
    expect(result.financeRecords[0]?.type).toBe('discipline_fine')
    expect(result.employees[0]?.loyalty).toBeLessThan(70)
    expect(result.employees[0]?.satisfaction).toBeLessThan(80)
  })

  it('changes caught employees back to working after warning or penalty', () => {
    const state = createTestState()
    state.employees = [
      createTestEmployee({
        id: 'employee-1',
        status: 'job_browsing',
        assignedTo: { type: 'project', id: 'project-test', role: 'product' },
      }),
      createTestEmployee({
        id: 'employee-2',
        status: 'gaming',
        assignedTo: { type: 'project', id: 'project-test', role: 'product' },
      }),
    ]

    const warned = applyEmployeeDiscipline(state, 'employee-1', 'verbal_warn')
    const fined = applyEmployeeDiscipline(state, 'employee-2', 'fine')

    expect(warned.employees[0]?.status).toBe('working')
    expect(fined.employees[1]?.status).toBe('working')
  })

  it('uses workDays for fire compensation and employee shape', () => {
    const employee = createTestEmployee({ salaryPerDay: 300, workDays: 31 })

    expect(calculateFireCompensation(employee, 1)).toBe(600)
    expect('workYears' in employee).toBe(false)
  })
})
