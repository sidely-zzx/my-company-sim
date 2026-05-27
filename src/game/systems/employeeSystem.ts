import { BASE_OUTPUT_PER_MINUTE } from '../constants'
import { EmployeeEntity } from '../entities/EmployeeEntity'
import { isProjectRoleActive } from '../projectPhase'
import { clamp, cloneState } from '../seed'
import type { Employee, EmployeeDisciplineAction, GameState, SkillRole } from '../types'
import { processIdlePendingAssignments, releaseEmployeeFromCurrentAssignment } from './assignmentSystem'
import { addEvent } from './eventSystem'
import { addFinanceRecord } from './financeSystem'

export function getSkillEfficiency(employee: Employee, role: SkillRole): number {
  return (employee.realSkillAbilities[role] ?? 0) / 100
}

export function calculateFireCompensation(employee: Employee, compensationRatio: number): number {
  const normalizedRatio = Number.isFinite(compensationRatio) ? Math.max(0, compensationRatio) : 1
  // 赔偿月份由本公司工作天数折算；workDays 只受入职后的日结影响，不再使用候选人过往工作经验。
  const compensationMonths = Math.max(1, Math.ceil(employee.workDays / 30))
  return Math.round(employee.salaryPerDay * compensationMonths * normalizedRatio)
}

export function calculateEmployeeOutput(
  _state: GameState,
  employee: Employee,
  role: SkillRole,
): number {
  return BASE_OUTPUT_PER_MINUTE * getSkillEfficiency(employee, role) * new EmployeeEntity(employee).calculateOutputMultiplier()
}

function hasProductiveWork(state: GameState, employee: Employee): boolean {
  if (!employee.assignedTo) {
    return false
  }

  if (employee.assignedTo.type === 'labor') {
    return true
  }

  const project = state.projectContracts.find((item) => item.id === employee.assignedTo?.id)
  // 项目员工是否真正工作取决于项目状态和当前阶段；未到阶段的预安排仍保留分配，但状态和产出都按空闲处理。
  return Boolean(
    project &&
      ['active', 'overdue'].includes(project.status) &&
      isProjectRoleActive(project, employee.assignedTo.role),
  )
}

export function advanceEmployeeBehavior(state: GameState, totalMinutes: number): void {
  for (const employee of state.employees) {
    new EmployeeEntity(employee).updateBehavior(totalMinutes, hasProductiveWork(state, employee))
  }
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
      workDays: employee.workDays + 1,
      energy: clamp(employee.energy + 30 - overtimePenalty * 2, 0, 100),
      pressure: clamp(employee.pressure - 8 + overtimePenalty * 2 + socialPenalty, 0, 100),
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

export function applyEmployeeDiscipline(
  state: GameState,
  employeeId: string,
  action: EmployeeDisciplineAction,
  fineRatio = 0.1,
): GameState {
  const draft = cloneState(state)
  const employee = draft.employees.find((item) => item.id === employeeId)
  if (!employee || employee.status === 'fired') {
    addEvent(draft, {
      type: 'employee',
      title: '员工处理失败',
      message: '没有找到可处理的在职员工。',
      severity: 'warning',
    })
    return draft
  }

  const result = new EmployeeEntity(employee).applyDiscipline(action, fineRatio)
  if (!result.applied) {
    addEvent(draft, {
      type: 'employee',
      title: '员工处理无效',
      message: result.message,
      severity: 'warning',
      relatedEntityId: employee.id,
    })
    return draft
  }

  if (result.fineAmount && result.fineAmount > 0) {
    addFinanceRecord(draft, {
      type: 'discipline_fine',
      amount: result.fineAmount,
      reason: `${employee.nickname ?? employee.name} 纪律罚款`,
      relatedEntityId: employee.id,
    })
  }

  addEvent(draft, {
    type: 'employee',
    title: '员工处理完成',
    message: result.fineAmount
      ? `${result.message} 公司收到罚款 ${result.fineAmount}。`
      : result.message,
    severity: action === 'ignore' ? 'info' : 'warning',
    relatedEntityId: employee.id,
  })
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
  const compensation = calculateFireCompensation(employee, compensationRatio)
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
