import { describe, expect, it } from 'vitest'

import {
  processArbitrationFilings,
  processArbitrationResults,
} from '../../game/systems/arbitrationSystem'
import { createTestEmployee, createTestState } from './testHelpers'

describe('arbitrationSystem', () => {
  it('files arbitration only for low satisfaction employees with unpaid social insurance gap', () => {
    const state = createTestState()
    state.rngSeed = 1
    state.employees = [
      createTestEmployee({
        socialInsuranceRatio: 0,
        satisfaction: 0,
        unpaidSocialInsuranceGap: 100,
      }),
    ]

    const filed = processArbitrationFilings(state)
    filed.time.day = 4
    const result = processArbitrationResults(filed, 4)

    expect(filed.pendingArbitrations[0]?.resultDay).toBe(4)
    expect(result.pendingArbitrations[0]?.status).toBe('won_by_employee')
    expect(result.mailbox.some((mail) => mail.type === 'labor_dispute_result')).toBe(true)
    expect(result.financeRecords.some((record) => record.type === 'arbitration')).toBe(true)
  })

  it('does not file arbitration without unpaid social insurance gap', () => {
    const state = createTestState()
    state.employees = [
      createTestEmployee({
        satisfaction: 0,
        unpaidSocialInsuranceGap: 0,
      }),
    ]

    const result = processArbitrationFilings(state)

    expect(result.pendingArbitrations).toHaveLength(0)
  })
})
