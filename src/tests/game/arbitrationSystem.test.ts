import { describe, expect, it } from 'vitest'

import {
  processArbitrationFilings,
  processArbitrationResults,
  processSocialInsuranceComplaints,
} from '../../game/systems/arbitrationSystem'
import { createTestEmployee, createTestState } from './testHelpers'

describe('arbitrationSystem', () => {
  it('deducts double missed social insurance when a complaint is triggered', () => {
    const state = createTestState()
    state.rngSeed = 1
    state.employees = [
      createTestEmployee({
        salaryPerDay: 1000,
        socialInsuranceRatio: 0,
        satisfaction: 0,
      }),
    ]

    const result = processSocialInsuranceComplaints(state)

    expect(result.financeRecords[0]?.amount).toBe(-760)
    expect(result.mailbox.some((mail) => mail.type === 'social_insurance_complaint')).toBe(true)
  })

  it('files arbitration and sends the result on the third day', () => {
    const state = createTestState()
    state.rngSeed = 1
    state.employees = [
      createTestEmployee({
        socialInsuranceRatio: 0,
        satisfaction: 0,
        arbitrationTendency: 100,
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
})
