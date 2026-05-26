import { BASE_OUTPUT_PER_MINUTE } from '../constants'
import { clamp, cloneState, nextRandom } from '../seed'
import type { Employee, GameState, SkillRole } from '../types'
import { addEvent } from './eventSystem'
import { addFinanceRecord } from './financeSystem'

export function getSkillEfficiency(employee: Employee, role: SkillRole): number {
  return (employee.realSkillAbilities[role] ?? 0) / 100
}

function ensureEmployeeBehaviorSeed(state: GameState, employee: Employee): number {
  if (Number.isFinite(employee.behaviorSeed)) {
    return employee.behaviorSeed
  }

  const random = nextRandom(state.rngSeed)
  state.rngSeed = random.seed
  employee.behaviorSeed = random.seed
  return employee.behaviorSeed
}

export function rollSlacking(state: GameState, employee: Employee): boolean {
  // 员工行为种子只由该员工自己的随机行为推进；摸鱼会影响本分钟产出，避免被市场刷新、合同生成或其他员工的判定顺序影响。
  const random = nextRandom(ensureEmployeeBehaviorSeed(state, employee))
  employee.behaviorSeed = random.seed
  return random.value < employee.slackingTendency
}

export function calculateEmployeeOutput(
  state: GameState,
  employee: Employee,
  role: SkillRole,
): number {
  const slacking = rollSlacking(state, employee)
  employee.status = slacking ? 'slacking' : 'working'
  if (slacking) {
    return 0
  }
  return BASE_OUTPUT_PER_MINUTE * getSkillEfficiency(employee, role)
}

export function updateEmployeeSatisfaction(state: GameState): GameState {
  const draft = cloneState(state)
  const overtimePenalty = Math.max(0, draft.settings.offWorkHour - 18) * 2
  draft.employees = draft.employees.map((employee) => {
    if (employee.status === 'fired') {
      return employee
    }
    const socialPenalty =
      employee.socialInsuranceRatio < 1 ? Math.ceil((1 - employee.socialInsuranceRatio) * 5) : 0
    return {
      ...employee,
      satisfaction: clamp(employee.satisfaction - overtimePenalty - socialPenalty, 0, 100),
      status: employee.assignedTo ? employee.status : 'idle',
    }
  })
  if (overtimePenalty > 0) {
    addEvent(draft, {
      type: 'employee',
      title: '员工满意度下降',
      message: `今天 ${draft.settings.offWorkHour}:00 下班，加班导致员工满意度下降 ${overtimePenalty}。`,
      severity: 'warning',
    })
  }
  return draft
}

export function renameEmployee(state: GameState, employeeId: string, nickname: string): GameState {
  const draft = cloneState(state)
  const employee = draft.employees.find((item) => item.id === employeeId)
  if (!employee) {
    addEvent(draft, {
      type: 'employee',
      title: '修改花名失败',
      message: '没有找到对应员工。',
      severity: 'warning',
    })
    return draft
  }
  employee.nickname = nickname
  addEvent(draft, {
    type: 'employee',
    title: '员工花名已更新',
    message: `${employee.name} 的花名改为 ${nickname}。`,
    severity: 'success',
    relatedEntityId: employeeId,
  })
  return draft
}

export function fireEmployee(
  state: GameState,
  employeeId: string,
  compensationRatio: number,
): GameState {
  const draft = cloneState(state)
  const employee = draft.employees.find((item) => item.id === employeeId)
  if (!employee || employee.status === 'fired') {
    addEvent(draft, {
      type: 'employee',
      title: '辞退失败',
      message: '没有找到可辞退的在职员工。',
      severity: 'warning',
    })
    return draft
  }
  const years = Math.max(1, employee.workYears)
  const compensation = Math.round(employee.salaryPerDay * 30 * years * compensationRatio)
  employee.status = 'fired'
  employee.assignedTo = undefined
  employee.firedDay = draft.time.day
  addFinanceRecord(draft, {
    type: 'fire_compensation',
    amount: -compensation,
    reason: `${employee.nickname ?? employee.name} 辞退赔偿`,
    relatedEntityId: employee.id,
  })
  addEvent(draft, {
    type: 'employee',
    title: '员工已离职',
    message: `${employee.nickname ?? employee.name} 已被辞退，赔偿 ${compensation}。`,
    severity: compensationRatio < 1 ? 'warning' : 'info',
    relatedEntityId: employee.id,
  })
  return draft
}
