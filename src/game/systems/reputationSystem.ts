import { clamp } from '../seed'
import type { Employee, GameState } from '../types'
import { average } from '../ui'
import { addEvent } from './eventSystem'

export const INITIAL_COMPANY_REPUTATION = 80
const HIGH_MORALE_REPUTATION_THRESHOLD = 80

function activeEmployees(state: Pick<GameState, 'employees'>): Employee[] {
  return state.employees.filter((employee) => employee.status !== 'fired')
}

export function calculateTeamMorale(state: Pick<GameState, 'employees'>): number {
  const employees = activeEmployees(state)
  // 团队士气沿用当前设计：在职员工平均满意度；它受薪酬、社保、加班、处罚和甲方事件影响。
  return Math.round(average(employees.map((employee) => employee.satisfaction), employees.length > 0 ? 0 : 72))
}

export function adjustCompanyReputation(
  state: GameState,
  delta: number,
  reason: string,
  relatedEntityId?: string,
): void {
  const previous = state.companyReputation
  const next = Math.round(clamp(previous + delta, 0, 100))
  if (next === previous) {
    return
  }

  state.companyReputation = next
  // 公司声誉是玩家长期经营口碑：劳动纠纷和主动离职会扣声誉，高团队士气会慢慢修复声誉；声誉会继续影响招聘 Offer 接受率。
  addEvent(state, {
    type: delta > 0 ? 'employee' : 'warning',
    title: delta > 0 ? '公司声誉提升' : '公司声誉下降',
    message: `${reason}，公司声誉 ${previous}% -> ${next}%。`,
    severity: delta > 0 ? 'success' : 'warning',
    relatedEntityId,
  })
}

export function recoverCompanyReputationFromMorale(state: GameState): void {
  const morale = calculateTeamMorale(state)
  if (morale <= HIGH_MORALE_REPUTATION_THRESHOLD) {
    return
  }

  adjustCompanyReputation(state, 1, `团队士气 ${morale}% 高于 ${HIGH_MORALE_REPUTATION_THRESHOLD}%`)
}

export function companyReputationOfferMultiplier(companyReputation: number): number {
  // 声誉系数会压低候选人接受 Offer 的概率：100 声誉无惩罚，50 声誉约为 80%，0 声誉约为 60%。
  return 0.6 + clamp(companyReputation, 0, 100) / 250
}
