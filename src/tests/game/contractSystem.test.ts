import { describe, expect, it } from 'vitest'

import {
  acceptLaborContract,
  assignEmployeeToLabor,
  settleLaborContractsEndOfDay,
} from '../../game/systems/contractSystem'
import { createTestEmployee, createTestState } from './testHelpers'

describe('contractSystem', () => {
  it('charges a penalty when an accepted labor contract has no assigned employee after deadline', () => {
    let state = createTestState()
    const contract = state.laborContracts[0]
    if (!contract) {
      throw new Error('expected labor contract')
    }
    state = acceptLaborContract(state, contract.id)
    state.laborContracts[0] = {
      ...state.laborContracts[0]!,
      deadlineDay: 1,
      dailyBudget: 600,
    }

    const result = settleLaborContractsEndOfDay(state, 2)

    expect(result.money).toBe(state.money - 600)
    expect(result.mailbox.some((mail) => mail.type === 'contract_breach')).toBe(true)
  })

  it('assigns an employee and settles daily labor income', () => {
    let state = createTestState()
    state.employees = [createTestEmployee({ id: 'employee-1', realSkillAbilities: { frontend: 90 } })]
    state.laborContracts[0] = {
      ...state.laborContracts[0]!,
      requiredRole: 'frontend',
      requiredAbility: 50,
      dailyBudget: 700,
    }
    state = acceptLaborContract(state, state.laborContracts[0]!.id)
    state = assignEmployeeToLabor(state, 'employee-1', state.laborContracts[0]!.id)

    const result = settleLaborContractsEndOfDay(state, 1)

    expect(result.money).toBe(state.money + 700)
    expect(result.laborContracts[0]?.status).toBe('active')
  })

  it('uses current employee status when checking labor satisfaction', () => {
    let state = createTestState()
    state.employees = [createTestEmployee({ id: 'employee-1', realSkillAbilities: { frontend: 90 } })]
    state.laborContracts[0] = {
      ...state.laborContracts[0]!,
      requiredRole: 'frontend',
      requiredAbility: 50,
      satisfaction: 100,
    }
    state = acceptLaborContract(state, state.laborContracts[0]!.id)
    state = assignEmployeeToLabor(state, 'employee-1', state.laborContracts[0]!.id)
    state.employees[0] = {
      ...state.employees[0]!,
      status: 'slacking',
    }

    const result = settleLaborContractsEndOfDay(state, 1)

    expect(result.laborContracts[0]?.satisfaction).toBeLessThan(100)
  })
})
