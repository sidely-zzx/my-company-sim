import { BASE_OUTPUT_PER_MINUTE } from '../constants'
import { clamp, cloneState, nextRandom } from '../seed'
import type { Employee, GameState, SkillRole } from '../types'
import { processIdlePendingAssignments, releaseEmployeeFromCurrentAssignment } from './assignmentSystem'
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

export function updateEmployeeCompensation(
  state: GameState,
  employeeId: string,
  salaryPerDay: number,
  socialInsuranceRatio: number,
): GameState {
  const draft = cloneState(state)
  const employee = draft.employees.find((item) => item.id === employeeId)
  if (!employee) {
    addEvent(draft, {
      type: 'employee',
      title: '薪酬调整失败',
      message: '没有找到对应员工。',
      severity: 'warning',
    })
    return draft
  }
  if (employee.status === 'fired') {
    addEvent(draft, {
      type: 'employee',
      title: '薪酬调整失败',
      message: `${employee.nickname ?? employee.name} 已离职，不能调整薪酬。`,
      severity: 'warning',
      relatedEntityId: employee.id,
    })
    return draft
  }

  const previousSalary = employee.salaryPerDay
  const previousSocialRatio = employee.socialInsuranceRatio
  const nextSalary = Number.isFinite(salaryPerDay) ? Math.max(0, Math.round(salaryPerDay)) : 0
  const nextSocialRatio = Number.isFinite(socialInsuranceRatio)
    ? clamp(socialInsuranceRatio, 0, 1)
    : 0
  const salaryDelta = nextSalary - previousSalary
  const salaryDeltaRatio = salaryDelta / Math.max(previousSalary, 1)
  const satisfactionDelta =
    salaryDelta > 0
      ? Math.min(10, Math.round(salaryDeltaRatio * 20))
      : -Math.min(20, Math.round(Math.abs(salaryDeltaRatio) * 30))

  employee.salaryPerDay = nextSalary
  employee.socialInsuranceRatio = nextSocialRatio
  // 工资调整会立刻改变满意度；满意度随后还会继续被加班、社保不足和仲裁系统读取。
  employee.satisfaction = clamp(employee.satisfaction + satisfactionDelta, 0, 100)

  addEvent(draft, {
    type: 'employee',
    title: '员工薪酬已调整',
    message: `${employee.nickname ?? employee.name} 日薪 ${previousSalary} -> ${nextSalary}，社保 ${Math.round(previousSocialRatio * 100)}% -> ${Math.round(nextSocialRatio * 100)}%，满意度 ${satisfactionDelta >= 0 ? '+' : ''}${satisfactionDelta}。`,
    severity: satisfactionDelta < 0 ? 'warning' : 'success',
    relatedEntityId: employee.id,
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
  // 辞退赔偿按当前日工资作为 N 的基数；赔偿系数越低，现金支出越少但劳动风险越高。
  const compensation = Math.round(employee.salaryPerDay * compensationRatio)
  releaseEmployeeFromCurrentAssignment(draft, employee)
  employee.pendingAssignment = undefined
  employee.status = 'fired'
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
  processIdlePendingAssignments(draft)
  return draft
}
