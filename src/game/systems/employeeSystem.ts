import { BASE_OUTPUT_PER_MINUTE, SOCIAL_INSURANCE_COMPANY_RATE } from '../constants'
import { EmployeeEntity } from '../entities/EmployeeEntity'
import { isProjectRoleActive } from '../projectPhase'
import { clamp, cloneState, nextRandom } from '../seed'
import type { Employee, EmployeeDisciplineAction, GameState, SkillRole } from '../types'
import { processIdlePendingAssignments, releaseEmployeeFromCurrentAssignment } from './assignmentSystem'
import { addEvent } from './eventSystem'
import { addFinanceRecord } from './financeSystem'
import { sendMail } from './mailSystem'
import { adjustCompanyReputation } from './reputationSystem'

const SALARY_DECREASE_SATISFACTION_FACTOR = 30
const SOCIAL_DECREASE_SATISFACTION_FACTOR = 10

const RESIGNATION_COMPLAINTS = [
  '这破公司谁爱待谁待，我是不奉陪了。',
  '工资社保都能省，良心也一起省了。',
  '每天都在画饼，饼都快把我噎死了。',
  '老板算盘打得响，我耳朵先受不了了。',
  '再待下去，我怕简历都不好意思写这段经历。',
]

export function getSkillEfficiency(employee: Employee, role: SkillRole): number {
  return (employee.realSkillAbilities[role] ?? 0) / 100
}

export function calculateEmployeeEffectiveAbility(employee: Employee, role: SkillRole): number {
  // 有效能力是员工真实能力和当前状态共同作用后的履约能力；它影响人力外包满意度，也让摸鱼/离岗真正反映到甲方反馈上。
  return Math.round((employee.realSkillAbilities[role] ?? 0) * new EmployeeEntity(employee).calculateOutputMultiplier())
}

export function calculateFireCompensation(employee: Employee): number {
  // 赔偿月份由本公司工作天数折算；workDays 只受入职后的日结影响，不再使用候选人过往工作经验。
  const compensationWeeks = Math.max(1, Math.ceil(employee.workDays / 7))
  return Math.round(employee.salaryPerDay * compensationWeeks)
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
  let compensationPenaltyTotal = 0
  let unpaidSocialInsuranceGapTotal = 0
  draft.employees = draft.employees.map((employee) => {
    if (employee.status === 'fired') {
      return employee
    }

    const highestSalaryPerDay = employee.highestSalaryPerDay
    const highestSocialInsuranceRatio = employee.highestSocialInsuranceRatio
    const salaryDecreaseRatio = Math.max(0, highestSalaryPerDay - employee.salaryPerDay) / Math.max(highestSalaryPerDay, 1)
    const socialDecreaseRatio = Math.max(0, highestSocialInsuranceRatio - employee.socialInsuranceRatio)
    const compensationPenalty =
      Math.ceil(salaryDecreaseRatio * SALARY_DECREASE_SATISFACTION_FACTOR) +
      Math.ceil(socialDecreaseRatio * SOCIAL_DECREASE_SATISFACTION_FACTOR)
    compensationPenaltyTotal += compensationPenalty
    const unpaidSocialInsuranceGap = Math.round(
      employee.salaryPerDay * (1 - employee.socialInsuranceRatio) * SOCIAL_INSURANCE_COMPANY_RATE,
    )
    unpaidSocialInsuranceGapTotal += unpaidSocialInsuranceGap

    const socialPressure =
      employee.socialInsuranceRatio < 1 ? Math.ceil((1 - employee.socialInsuranceRatio) * 5) : 0

    return {
      ...employee,
      workDays: employee.workDays + 1,
      energy: clamp(employee.energy + 30 - overtimePenalty * 2, 0, 100),
      // 低社保仍会增加压力；社保欠缴差额还会每日累计，低满意度离职或仲裁时才集中结算。
      pressure: clamp(employee.pressure - 8 + overtimePenalty * 2 + socialPressure, 0, 100),
      // 工资和社保按历史最高待遇做长期对比：玩家降待遇后，每个日结都会持续伤害满意度。
      satisfaction: clamp(employee.satisfaction - overtimePenalty - compensationPenalty, 0, 100),
      status: employee.assignedTo ? employee.status : 'idle',
      highestSalaryPerDay: Math.max(highestSalaryPerDay, employee.salaryPerDay),
      highestSocialInsuranceRatio: Math.max(highestSocialInsuranceRatio, employee.socialInsuranceRatio),
      unpaidSocialInsuranceGap: employee.unpaidSocialInsuranceGap + unpaidSocialInsuranceGap,
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
  if (compensationPenaltyTotal > 0) {
    addEvent(draft, {
      type: 'employee',
      title: '薪酬调整影响满意度',
      message: `今日降薪或降低社保在日结时共扣除 ${compensationPenaltyTotal} 点员工满意度。`,
      severity: 'warning',
    })
  }
  if (unpaidSocialInsuranceGapTotal > 0) {
    addEvent(draft, {
      type: 'warning',
      title: '社保公积金差额累计',
      message: `今日未足额缴纳的社保公积金差额累计 ${unpaidSocialInsuranceGapTotal}，低满意度离职或仲裁时可能按 200% 补缴。`,
      severity: 'warning',
    })
  }
  return draft
}

function calculateVoluntaryResignationChance(employee: Employee): number {
  // 主动离职概率受满意度和压力共同影响；满意度越低、压力越高，员工越可能跑路并损害公司声誉。
  return clamp(
    (35 - employee.satisfaction) / 110 + employee.pressure / 550,
    0.02,
    0.35,
  )
}

function pickResignationComplaint(state: GameState): string {
  const roll = nextRandom(state.rngSeed)
  state.rngSeed = roll.seed
  return RESIGNATION_COMPLAINTS[Math.min(RESIGNATION_COMPLAINTS.length - 1, Math.floor(roll.value * RESIGNATION_COMPLAINTS.length))]
}

function sendLowSatisfactionDepartureMail(
  state: GameState,
  employee: Employee,
  subjectPrefix: string,
  reasonText: string,
): void {
  const displayName = employee.nickname ?? employee.name
  const complaint = pickResignationComplaint(state)
  const backpay = employee.unpaidSocialInsuranceGap > 0 ? employee.unpaidSocialInsuranceGap * 2 : 0
  const financeRecordId = backpay > 0
    ? addFinanceRecord(state, {
      type: 'social_insurance_backpay',
      amount: -backpay,
      reason: `${displayName} 离职社保公积金差额 200% 补缴`,
      relatedEntityId: employee.id,
    })
    : undefined
  const backpayText = backpay > 0
    ? `累计社保公积金差额 ${employee.unpaidSocialInsuranceGap}，按 200% 补缴 ${backpay}，已从公司现金扣除。`
    : '该员工没有累计社保公积金差额，本次不产生补缴扣款。'
  sendMail(state, {
    type: 'employee_resignation',
    from: displayName,
    subject: `${subjectPrefix}：${displayName}`,
    body: `${displayName} ${reasonText}：“${complaint}” 当前工作和后续安排已自动释放，公司声誉受到影响。${backpayText}`,
    relatedEntityId: employee.id,
    financeRecordId,
  })
}

export function processVoluntaryResignations(state: GameState): GameState {
  const draft = cloneState(state)
  let hasResignation = false

  for (const employee of draft.employees) {
    if (employee.status === 'fired' || employee.satisfaction >= 35) {
      continue
    }

    const mustResign = employee.satisfaction <= 0
    if (!mustResign) {
      const roll = nextRandom(draft.rngSeed)
      draft.rngSeed = roll.seed
      const chance = calculateVoluntaryResignationChance(employee)
      if (roll.value > chance) {
        continue
      }
    }

    const displayName = employee.nickname ?? employee.name
    releaseEmployeeFromCurrentAssignment(draft, employee)
    employee.pendingAssignment = undefined
    employee.status = 'fired'
    employee.firedDay = draft.time.day
    hasResignation = true
    adjustCompanyReputation(draft, -10, `${displayName} 主动离职`, employee.id)
    sendLowSatisfactionDepartureMail(draft, employee, '员工跑路', '因满意度过低选择跑路')
    addEvent(draft, {
      type: 'employee',
      title: '员工跑路',
      message: `${displayName} 因满意度过低跑路，当前工作和后续安排已释放。`,
      severity: 'danger',
      relatedEntityId: employee.id,
    })
  }

  if (hasResignation) {
    processIdlePendingAssignments(draft)
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
  const salaryIncreaseBonus =
    nextSalary > previousSalary ? Math.ceil(((nextSalary - previousSalary) / Math.max(previousSalary, 1)) * SALARY_DECREASE_SATISFACTION_FACTOR) : 0
  const socialIncreaseBonus =
    nextSocialRatio > previousSocialRatio ? Math.ceil((nextSocialRatio - previousSocialRatio) * SOCIAL_DECREASE_SATISFACTION_FACTOR) : 0

  employee.salaryPerDay = nextSalary
  employee.socialInsuranceRatio = nextSocialRatio
  // 提高工资或社保会在当天立刻提升满意度；降低待遇不立刻扣，后续每日按历史最高差额持续扣。
  employee.satisfaction = clamp(employee.satisfaction + salaryIncreaseBonus + socialIncreaseBonus, 0, 100)

  addEvent(draft, {
    type: 'employee',
    title: '员工薪酬已调整',
    message: `${employee.nickname ?? employee.name} 日薪 ${previousSalary} -> ${nextSalary}，社保 ${Math.round(previousSocialRatio * 100)}% -> ${Math.round(nextSocialRatio * 100)}%；涨薪或涨社保即时增加满意度 ${salaryIncreaseBonus + socialIncreaseBonus}，低于历史最高值会在日结持续扣满意度。`,
    severity: nextSalary < previousSalary || nextSocialRatio < previousSocialRatio ? 'warning' : 'success',
    relatedEntityId: employee.id,
  })
  return draft
}

export function fireEmployee(
  state: GameState,
  employeeId: string,
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
  const compensation = calculateFireCompensation(employee)
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
    severity: 'info',
    relatedEntityId: employee.id,
  })
  if (employee.satisfaction < 35) {
    // 低满意度员工被辞退时会把负面情绪扩散出去，和主动跑路一样损害公司招聘口碑。
    adjustCompanyReputation(draft, -10, `${employee.nickname ?? employee.name} 低满意度离职`, employee.id)
    sendLowSatisfactionDepartureMail(draft, employee, '员工离职吐槽', '满意度过低，被辞退后公开吐槽公司')
  }
  processIdlePendingAssignments(draft)
  return draft
}
