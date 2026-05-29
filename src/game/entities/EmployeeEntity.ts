import { clamp, nextRandom, randomInt } from '../seed'
import type { Employee, EmployeeDisciplineAction, EmployeeStatus } from '../types'

interface EmployeeBehaviorWeight {
  status: EmployeeStatus
  weight: number
}

interface InitialEmployeeBehaviorInput {
  salaryFit: number
  slackingTendency: number
  averageAbility: number
}

interface InitialEmployeeBehaviorProfile {
  behaviorSeed: number
  energy: number
  pressure: number
  discipline: number
}

export interface InitialEmployeeBehaviorResult {
  seed: number
  profile: InitialEmployeeBehaviorProfile
}

export interface EmployeeDisciplineResult {
  applied: boolean
  action: EmployeeDisciplineAction
  fineAmount?: number
  message: string
}

const DISCIPLINABLE_STATUSES: EmployeeStatus[] = ['slacking', 'smoking', 'job_browsing', 'gaming']
const LOW_SEVERITY_STATUSES: EmployeeStatus[] = ['drinking_water', 'toilet']
const NON_WORK_STATUS_WEIGHT_RATIO = 1

function clampAttribute(value: number): number {
  return Math.round(clamp(value, 0, 100))
}

function employeeDisplayName(employee: Employee): string {
  return employee.nickname ?? employee.name
}

function averageWeightedStatus(weights: EmployeeBehaviorWeight[], roll: number): EmployeeStatus {
  const total = weights.reduce((sum, item) => sum + Math.max(0, item.weight), 0)
  if (total <= 0) {
    return 'working'
  }

  let cursor = roll * total
  for (const item of weights) {
    cursor -= Math.max(0, item.weight)
    if (cursor <= 0) {
      return item.status
    }
  }
  return weights[weights.length - 1]?.status ?? 'working'
}

export function createInitialEmployeeBehaviorProfile(
  seed: number,
  input: InitialEmployeeBehaviorInput,
): InitialEmployeeBehaviorResult {
  const energyRoll = randomInt(seed, 70, 95)
  const pressureRoll = randomInt(energyRoll.seed, -8, 10)
  const disciplineRoll = randomInt(pressureRoll.seed, -10, 10)
  const behaviorSeedRoll = nextRandom(disciplineRoll.seed)
  const salaryBonus = clamp((input.salaryFit - 0.85) * 28, -14, 18)
  const slackingPenalty = input.slackingTendency * 55

  return {
    seed: behaviorSeedRoll.seed,
    profile: {
      behaviorSeed: behaviorSeedRoll.seed,
      energy: energyRoll.value,
      pressure: clampAttribute(28 - salaryBonus + pressureRoll.value),
      // 初始自律刻意压低到约 20-50：摸鱼倾向会明显拉低自律，能力只提供少量正向修正，给后续管理动作留下成长空间。
      discipline: clampAttribute(36 - slackingPenalty * 0.45 + input.averageAbility * 0.08 + disciplineRoll.value),
    },
  }
}

export class EmployeeEntity {
  private readonly employee: Employee
  constructor(employee: Employee) {
    this.employee = employee
  }

  updateBehavior(totalMinutes: number, hasProductiveWork: boolean): void {
    if (this.employee.status === 'fired') {
      return
    }

    if (!this.employee.assignedTo || !hasProductiveWork) {
      // 员工状态受当前是否有真实产出工作影响：已预安排但项目阶段未到时保持空闲，不消耗精力，也不会推动项目进度。
      this.employee.status = 'idle'
      return
    }

    if (this.employee.status === 'idle') {
      this.employee.status = 'working'
    }

    if (totalMinutes % 10 !== 0) {
      return
    }

    const random = nextRandom(this.employee.behaviorSeed)
    this.employee.behaviorSeed = random.seed
    this.employee.status = averageWeightedStatus(this.createStatusWeights(), random.value)
    this.applyCurrentStateEffect()
  }

  calculateOutputMultiplier(): number {
    if (this.employee.status === 'focused_work') {
      return 1.4
    }
    if (this.employee.status === 'working') {
      return 1
    }
    return 0
  }

  isDisciplinable(): boolean {
    return DISCIPLINABLE_STATUSES.includes(this.employee.status)
  }

  applyDiscipline(action: EmployeeDisciplineAction, fineRatio = 0.1): EmployeeDisciplineResult {
    if (this.employee.status === 'fired') {
      return {
        applied: false,
        action,
        message: `${employeeDisplayName(this.employee)} 已离职，不能继续处理。`,
      }
    }

    if (action === 'ignore') {
      this.employee.pressure = clampAttribute(this.employee.pressure - 1)
      return {
        applied: true,
        action,
        message: `${employeeDisplayName(this.employee)} 本次未被处理。`,
      }
    }

    if (action === 'verbal_warn') {
      const lightWarning = LOW_SEVERITY_STATUSES.includes(this.employee.status)
      this.employee.pressure = clampAttribute(this.employee.pressure + (lightWarning ? 2 : 4))
      this.employee.discipline = clampAttribute(this.employee.discipline + 1)
      this.restoreWorkAfterDiscipline()
      return {
        applied: true,
        action,
        message: `${employeeDisplayName(this.employee)} 收到口头提醒。`,
      }
    }

    if (!this.isDisciplinable()) {
      return {
        applied: false,
        action,
        message: `${employeeDisplayName(this.employee)} 当前状态不适合正式处罚。`,
      }
    }

    if (action === 'formal_warn') {
      this.employee.pressure = clampAttribute(this.employee.pressure + 8)
      this.employee.discipline = clampAttribute(this.employee.discipline + 5)
      this.employee.satisfaction = clampAttribute(this.employee.satisfaction - 3)
      this.restoreWorkAfterDiscipline()
      return {
        applied: true,
        action,
        message: `${employeeDisplayName(this.employee)} 收到正式警告。`,
      }
    }

    const normalizedFineRatio = clamp(fineRatio, 0, 1)
    const fineAmount = Math.round(this.employee.salaryPerDay * normalizedFineRatio)
    this.employee.pressure = clampAttribute(this.employee.pressure + 12)
    // 罚款会大幅提高自律，让同一个员工后续更难再进入可罚状态，避免玩家稳定刷罚款收入。
    this.employee.discipline = clampAttribute(this.employee.discipline + Math.ceil(normalizedFineRatio * 50))
    // 罚款满意度扣除直接跟罚款比例挂钩；扣得越重，员工越容易在日结离职流程中跑路。
    this.employee.satisfaction = clampAttribute(this.employee.satisfaction - Math.ceil(normalizedFineRatio * 50))
    this.restoreWorkAfterDiscipline()
    return {
      applied: true,
      action,
      fineAmount,
      message: `${employeeDisplayName(this.employee)} 被罚款。`,
    }
  }

  private restoreWorkAfterDiscipline(): void {
    // 玩家主动提醒、警告或罚款会打断当前摸鱼/离岗行为；只要员工仍有当前工作，就立刻回到正常工作状态。
    if (this.employee.assignedTo) {
      this.employee.status = 'working'
    }
  }

  private createStatusWeights(): EmployeeBehaviorWeight[] {
    const energyLow = (100 - this.employee.energy) / 100
    const pressureHigh = this.employee.pressure / 100
    const disciplineLow = (100 - this.employee.discipline) / 100
    const satisfactionLow = (100 - this.employee.satisfaction) / 100
    // 自律用平方曲线压制可罚状态：中等自律已经明显减少摸鱼，高自律会让可罚状态趋近消失。
    const disciplineSuppression = Math.pow(1 - this.employee.discipline / 100, 2)
    const punishableNonWorkWeight = (weight: number) => weight * NON_WORK_STATUS_WEIGHT_RATIO * disciplineSuppression
    // 喝水和上厕所是低严重度状态，不产生罚款收益；自律 100 时仍保留少量生理需求。
    const lowSeverityNonWorkWeight = (weight: number) =>
      weight * NON_WORK_STATUS_WEIGHT_RATIO * Math.max(0.15, disciplineSuppression)

    return [
      {
        status: 'focused_work',
        // 全力工作的概率主要受精力和自律影响，压力会压低专注状态出现概率。
        weight: 6 + this.employee.energy * 0.18 + this.employee.discipline * 0.12 - this.employee.pressure * 0.12,
      },
      {
        status: 'working',
        // 普通工作权重保留稳定基础，避免员工过度频繁进入非工作状态。
        weight: 42 + this.employee.energy * 0.18 + this.employee.discipline * 0.1 - this.employee.pressure * 0.08,
      },
      {
        status: 'slacking',
        weight: punishableNonWorkWeight(this.employee.slackingTendency * 20 + disciplineLow * 10 + energyLow * 10),
      },
      {
        status: 'drinking_water',
        weight: lowSeverityNonWorkWeight(2 + energyLow * 10 + pressureHigh * 4),
      },
      {
        status: 'smoking',
        weight: punishableNonWorkWeight(1 + pressureHigh * 10 + disciplineLow * 10),
      },
      {
        status: 'toilet',
        weight: lowSeverityNonWorkWeight(31 + energyLow * 10 + pressureHigh * 5),
      },
      {
        status: 'job_browsing',
        weight: punishableNonWorkWeight(satisfactionLow * 20 + pressureHigh * 6),
      },
      {
        status: 'gaming',
        weight: punishableNonWorkWeight(disciplineLow * 10 + this.employee.slackingTendency * 20 + pressureHigh * 4),
      },
    ]
  }

  private applyCurrentStateEffect(): void {
    switch (this.employee.status) {
      case 'focused_work':
        this.employee.energy = clampAttribute(this.employee.energy - 4)
        this.employee.pressure = clampAttribute(this.employee.pressure + 2)
        break
      case 'working':
        this.employee.energy = clampAttribute(this.employee.energy - 2)
        this.employee.pressure = clampAttribute(this.employee.pressure + 1)
        break
      case 'slacking':
        this.employee.energy = clampAttribute(this.employee.energy + 1)
        this.employee.pressure = clampAttribute(this.employee.pressure - 1)
        this.employee.discipline = clampAttribute(this.employee.discipline - 1)
        break
      case 'drinking_water':
        this.employee.energy = clampAttribute(this.employee.energy + 3)
        this.employee.pressure = clampAttribute(this.employee.pressure - 1)
        break
      case 'smoking':
        this.employee.energy = clampAttribute(this.employee.energy - 1)
        this.employee.pressure = clampAttribute(this.employee.pressure - 4)
        this.employee.discipline = clampAttribute(this.employee.discipline - 1)
        break
      case 'toilet':
        this.employee.pressure = clampAttribute(this.employee.pressure - 1)
        break
      case 'job_browsing':
        this.employee.pressure = clampAttribute(this.employee.pressure - 1)
        break
      case 'gaming':
        this.employee.energy = clampAttribute(this.employee.energy + 2)
        this.employee.pressure = clampAttribute(this.employee.pressure - 2)
        this.employee.discipline = clampAttribute(this.employee.discipline - 2)
        break
      default:
        break
    }
  }
}
