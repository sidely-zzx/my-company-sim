import { SOCIAL_INSURANCE_COMPANY_RATE } from '../constants'
import { cloneState } from '../seed'
import type { FinanceRecordType, GameState } from '../types'
import { addEvent, createId } from './eventSystem'

export interface FinanceInput {
  type: FinanceRecordType
  amount: number
  reason: string
  relatedEntityId?: string
  mailId?: string
}

export function addFinanceRecord(state: GameState, input: FinanceInput): string {
  const id = createId(state, 'finance')
  state.money += input.amount
  state.financeRecords.push({
    id,
    day: state.time.day,
    minute: state.time.minuteOfDay,
    type: input.type,
    amount: input.amount,
    reason: input.reason,
    relatedEntityId: input.relatedEntityId,
    mailId: input.mailId,
  })
  return id
}

export function settleDailyFinance(state: GameState): GameState {
  const draft = cloneState(state)
  for (const employee of draft.employees.filter((item) => item.status !== 'fired')) {
    addFinanceRecord(draft, {
      type: 'salary',
      amount: -employee.salaryPerDay,
      reason: `${employee.nickname ?? employee.name} 日薪`,
      relatedEntityId: employee.id,
    })
    const socialInsuranceCost = Math.round(
      employee.salaryPerDay * employee.socialInsuranceRatio * SOCIAL_INSURANCE_COMPANY_RATE,
    )
    if (socialInsuranceCost > 0) {
      addFinanceRecord(draft, {
        type: 'social_insurance',
        amount: -socialInsuranceCost,
        reason: `${employee.nickname ?? employee.name} 社保公积金公司成本`,
        relatedEntityId: employee.id,
      })
    }
  }
  addEvent(draft, {
    type: 'finance',
    title: '每日人工成本已结算',
    message: '工资和社保公积金成本已从现金中扣除。',
    severity: 'info',
  })
  return draft
}
