import { describe, expect, it } from 'vitest'

import {
  advanceProjectProgress,
  settleProjectsEndOfDay,
} from '../../game/systems/projectSystem'
import { createTestEmployee, createTestProject, createTestState } from './testHelpers'

describe('projectSystem', () => {
  it('uses skill ability divided by 100 as project efficiency', () => {
    const state = createTestState()
    state.employees = [
      createTestEmployee({
        id: 'employee-1',
        realSkillAbilities: { product: 80 },
        assignedTo: { type: 'project', id: 'project-test', role: 'product' },
        status: 'working',
      }),
    ]
    state.projectContracts = [
      createTestProject({
        assignedEmployees: { product: ['employee-1'] },
      }),
    ]

    const result = advanceProjectProgress(state, 1)

    expect(result.projectContracts[0]?.phaseProgress.product).toBe(0.8)
  })

  it('adds one event when a product track first reaches 100%', () => {
    const state = createTestState()
    state.employees = [
      createTestEmployee({
        id: 'employee-1',
        realSkillAbilities: { product: 100 },
        assignedTo: { type: 'project', id: 'project-test', role: 'product' },
        status: 'working',
      }),
    ]
    state.projectContracts = [
      createTestProject({
        phaseProgress: {
          product: 99,
          design: 0,
          frontend: 0,
          backend: 0,
          testing: 0,
        },
        assignedEmployees: { product: ['employee-1'] },
      }),
    ]

    const completed = advanceProjectProgress(state, 1)
    const afterRepeatTick = advanceProjectProgress(completed, 1)

    expect(completed.events.filter((event) => event.title === '产品阶段已完成')).toHaveLength(1)
    expect(afterRepeatTick.events.filter((event) => event.title === '产品阶段已完成')).toHaveLength(1)
    expect(afterRepeatTick.projectContracts[0]?.notifiedCompletedTracks).toContain('product')
  })

  it('adds separate events for frontend and backend development tracks', () => {
    const state = createTestState()
    state.employees = [
      createTestEmployee({
        id: 'frontend-employee',
        realSkillAbilities: { frontend: 100 },
        assignedTo: { type: 'project', id: 'project-test', role: 'frontend' },
        status: 'working',
      }),
      createTestEmployee({
        id: 'backend-employee',
        realSkillAbilities: { backend: 100 },
        assignedTo: { type: 'project', id: 'project-test', role: 'backend' },
        status: 'working',
      }),
    ]
    state.projectContracts = [
      createTestProject({
        currentPhase: 'development',
        phaseProgress: {
          product: 100,
          design: 100,
          frontend: 99,
          backend: 99,
          testing: 0,
        },
        assignedEmployees: {
          frontend: ['frontend-employee'],
          backend: ['backend-employee'],
        },
      }),
    ]

    const result = advanceProjectProgress(state, 1)

    expect(result.events.some((event) => event.title === '前端开发已完成')).toBe(true)
    expect(result.events.some((event) => event.title === '后端开发已完成')).toBe(true)
    expect(result.projectContracts[0]?.notifiedCompletedTracks).toEqual(
      expect.arrayContaining(['frontend', 'backend']),
    )
  })

  it('moves unfinished projects into overdue instead of failing them', () => {
    const state = createTestState()
    state.projectContracts = [createTestProject({ deadlineDay: 1, dailyPenalty: 1000 })]

    const result = settleProjectsEndOfDay(state, 2)

    expect(result.projectContracts[0]?.status).toBe('overdue')
    expect(result.projectContracts[0]?.overdueDays).toBe(1)
    expect(result.money).toBe(state.money - 1000)
    expect(result.mailbox.some((mail) => mail.type === 'project_overdue')).toBe(true)
  })

  it('charges one daily penalty for each overdue end-of-day settlement', () => {
    const state = createTestState()
    state.projectContracts = [
      createTestProject({ deadlineDay: 1, dailyPenalty: 500, status: 'overdue' }),
    ]

    const day2 = settleProjectsEndOfDay(state, 2)
    const day3 = settleProjectsEndOfDay(day2, 3)

    expect(day3.projectContracts[0]?.overdueDays).toBe(2)
    expect(day3.money).toBe(state.money - 1000)
  })

  it('pays the full amount and stops penalties when completed', () => {
    const state = createTestState()
    state.employees = [
      createTestEmployee({
        id: 'employee-1',
        realSkillAbilities: { testing: 100 },
        assignedTo: { type: 'project', id: 'project-test', role: 'testing' },
        status: 'working',
      }),
    ]
    state.projectContracts = [
      createTestProject({
        status: 'overdue',
        deadlineDay: 1,
        overdueDays: 2,
        currentPhase: 'testing',
        amount: 9000,
        phaseProgress: {
          product: 100,
          design: 100,
          frontend: 100,
          backend: 100,
          testing: 99,
        },
        assignedEmployees: { testing: ['employee-1'] },
      }),
    ]

    const completed = advanceProjectProgress(state, 1)
    const settled = settleProjectsEndOfDay(completed, 3)

    expect(settled.projectContracts[0]?.status).toBe('completed')
    expect(settled.money).toBe(state.money + 9000)
    expect(settled.mailbox.some((mail) => mail.type === 'project_completed')).toBe(true)
    expect(settled.financeRecords.filter((record) => record.type === 'project_penalty')).toHaveLength(0)
  })
})
