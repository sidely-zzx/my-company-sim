import {
  LABOR_FIRST_DAY_REQUIREMENT_CUTOFF_MINUTE,
  LABOR_FULL_DAY_REQUIRED_MINUTES,
  LABOR_PARTIAL_DAY_REQUIREMENT_RATIO,
} from '../constants'
import { EmployeeEntity } from '../entities/EmployeeEntity'
import type { GameState, LaborContract } from '../types'

export function calculateLaborRequiredOutput(contract: LaborContract, day: number): number {
  if (contract.assignmentStartedDay === day && contract.assignmentStartedMinute !== undefined) {
    const remainingMinutes = Math.max(0, LABOR_FIRST_DAY_REQUIREMENT_CUTOFF_MINUTE - contract.assignmentStartedMinute)
    // 中途上岗当天只按 17:00 前剩余时间折算要求；17:00 后上岗当天要求为 0，避免玩家被瞬间判定失败。
    return Math.min(
      contract.requiredAbility * LABOR_FULL_DAY_REQUIRED_MINUTES,
      Math.round(contract.requiredAbility * remainingMinutes * LABOR_PARTIAL_DAY_REQUIREMENT_RATIO),
    )
  }

  if (contract.assignmentStartedDay !== undefined && contract.assignmentStartedDay < day) {
    return contract.requiredAbility * LABOR_FULL_DAY_REQUIRED_MINUTES
  }

  return 0
}

export function resetLaborDailyOutput(contract: LaborContract, day: number): void {
  contract.todayOutputDay = day
  contract.todayOutput = 0
  contract.todayRequiredOutput = calculateLaborRequiredOutput(contract, day)
}

export function ensureLaborOutputDay(contract: LaborContract, day: number): void {
  if (contract.todayOutputDay !== day) {
    resetLaborDailyOutput(contract, day)
    return
  }

  contract.todayRequiredOutput = calculateLaborRequiredOutput(contract, day)
}

export function markLaborAssignmentStarted(state: GameState, contract: LaborContract): void {
  contract.assignmentStartedDay = state.time.day
  contract.assignmentStartedMinute = state.time.minuteOfDay
  resetLaborDailyOutput(contract, state.time.day)
}

export function clearLaborAssignmentStarted(contract: LaborContract): void {
  contract.assignmentStartedDay = undefined
  contract.assignmentStartedMinute = undefined
}

export function advanceLaborContractOutputForMinute(state: GameState): void {
  for (const contract of state.laborContracts) {
    if (contract.status !== 'active' || !contract.assignedEmployeeId) {
      continue
    }

    ensureLaborOutputDay(contract, state.time.day)

    const employee = state.employees.find((item) => item.id === contract.assignedEmployeeId)
    if (!employee || employee.status === 'fired') {
      continue
    }

    const ability = employee.realSkillAbilities[contract.requiredRole] ?? 0
    const multiplier = new EmployeeEntity(employee).calculateOutputMultiplier()
    // 人力外包产出按每分钟累计：岗位能力越高、工作分钟越多、全力工作倍率越高，当天越容易达标并结算收入。
    contract.todayOutput += ability * multiplier
  }
}
