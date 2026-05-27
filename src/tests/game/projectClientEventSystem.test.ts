import { describe, expect, it } from 'vitest'

import {
  processDailyProjectClientEvents,
  resolveProjectClientEvent,
} from '../../game/systems/projectClientEventSystem'
import type { PendingProjectClientEvent } from '../../game/types'
import { createTestEmployee, createTestProject, createTestState } from './testHelpers'

function createPendingEvent(overrides: Partial<PendingProjectClientEvent> = {}): PendingProjectClientEvent {
  return {
    id: 'project-client-event-test',
    kind: 'deadline_cut',
    projectId: 'project-test',
    projectTitle: '测试项目',
    clientName: '测试甲方',
    triggeredDay: 1,
    title: '甲方要求提前交付',
    description: '测试甲方要求压缩交付周期。',
    severity: 'danger',
    options: [
      {
        id: 'rush',
        label: '接受加急',
        description: '截止日提前，团队压力上升。',
        effects: {
          deadlineDayDelta: -1,
          employeePressureDelta: 10,
          employeeEnergyDelta: -5,
        },
      },
    ],
    ...overrides,
  }
}

describe('projectClientEventSystem', () => {
  it('does not create pending events without running projects', () => {
    const state = createTestState(1972)
    state.projectContracts = [createTestProject({ status: 'available' })]

    const result = processDailyProjectClientEvents(state, 1)

    expect(result.pendingProjectClientEvents).toHaveLength(0)
  })

  it('does not create another event while one is pending', () => {
    const state = createTestState(1972)
    state.pendingProjectClientEvents = [createPendingEvent()]
    state.projectContracts = [createTestProject()]

    const result = processDailyProjectClientEvents(state, 1)

    expect(result.pendingProjectClientEvents).toHaveLength(1)
  })

  it('respects project event cooldown days', () => {
    const state = createTestState(1972)
    state.time.day = 6
    state.projectContracts = [createTestProject({ lastClientEventDay: 5, deadlineDay: 8 })]

    const result = processDailyProjectClientEvents(state, 6)

    expect(result.pendingProjectClientEvents).toHaveLength(0)
  })

  it('applies deadline choice effects and writes an event log', () => {
    const state = createTestState()
    state.projectContracts = [
      createTestProject({
        deadlineDay: 5,
        assignedEmployees: { product: ['employee-1'] },
      }),
    ]
    state.employees = [
      createTestEmployee({
        id: 'employee-1',
        assignedTo: { type: 'project', id: 'project-test', role: 'product' },
        pressure: 20,
        energy: 80,
      }),
    ]
    state.pendingProjectClientEvents = [createPendingEvent()]

    const result = resolveProjectClientEvent(state, 'project-client-event-test', 'rush')

    expect(result.projectContracts[0]?.deadlineDay).toBe(4)
    expect(result.employees[0]?.pressure).toBe(30)
    expect(result.employees[0]?.energy).toBe(75)
    expect(result.pendingProjectClientEvents).toHaveLength(0)
    expect(result.events.some((event) => event.title === '已处理：甲方要求提前交付')).toBe(true)
  })

  it('applies scope change effects to amount and progress', () => {
    const state = createTestState()
    state.projectContracts = [
      createTestProject({
        amount: 10000,
        phaseProgress: {
          product: 40,
          design: 30,
          frontend: 20,
          backend: 20,
          testing: 10,
        },
      }),
    ]
    state.pendingProjectClientEvents = [
      createPendingEvent({
        kind: 'scope_change',
        title: '甲方临时追加需求',
        severity: 'warning',
        options: [
          {
            id: 'accept_scope',
            label: '接受追加',
            description: '项目金额上升，产品和设计返工。',
            effects: {
              amountDelta: 1000,
              progressDelta: { product: -5, design: -10 },
              scopeChangeLevelDelta: 1,
            },
          },
        ],
      }),
    ]

    const result = resolveProjectClientEvent(state, 'project-client-event-test', 'accept_scope')

    expect(result.projectContracts[0]?.amount).toBe(11000)
    expect(result.projectContracts[0]?.phaseProgress.product).toBe(35)
    expect(result.projectContracts[0]?.phaseProgress.design).toBe(20)
    expect(result.projectContracts[0]?.scopeChangeLevel).toBe(1)
  })

  it('does not trigger for completed or breached projects', () => {
    const state = createTestState(1972)
    state.projectContracts = [
      createTestProject({ id: 'completed-project', status: 'completed' }),
      createTestProject({ id: 'breached-project', status: 'breached' }),
    ]

    const result = processDailyProjectClientEvents(state, 1)

    expect(result.pendingProjectClientEvents).toHaveLength(0)
  })
})
