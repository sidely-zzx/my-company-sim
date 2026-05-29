import { clamp, nextRandom, randomInt } from '../seed'
import type { Employee, EmployeeDisciplineAction, EmployeeStatus } from '../types'

interface EmployeeBehaviorWeight {
  status: EmployeeStatus
  weight: number
}

interface InitialEmployeeBehaviorInput {
  salaryFit: number
  socialInsuranceRatio: number
  satisfaction: number
  arbitrationTendency: number
  slackingTendency: number
  averageAbility: number
  resumeWorkYears: number
}

interface InitialEmployeeBehaviorProfile {
  behaviorSeed: number
  energy: number
  loyalty: number
  pressure: number
  discipline: number
  ambition: number
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
  const ambitionRoll = randomInt(disciplineRoll.seed, -8, 12)
  const behaviorSeedRoll = nextRandom(ambitionRoll.seed)
  const salaryBonus = clamp((input.salaryFit - 0.85) * 28, -14, 18)
  const socialBonus = input.socialInsuranceRatio * 12
  const satisfactionBonus = (input.satisfaction - 70) * 0.35
  const slackingPenalty = input.slackingTendency * 55

  return {
    seed: behaviorSeedRoll.seed,
    profile: {
      behaviorSeed: behaviorSeedRoll.seed,
      energy: energyRoll.value,
      loyalty: clampAttribute(55 + salaryBonus + socialBonus + satisfactionBonus),
      pressure: clampAttribute(28 + input.arbitrationTendency * 0.18 - salaryBonus + pressureRoll.value),
      discipline: clampAttribute(62 - slackingPenalty + input.averageAbility * 0.16 + disciplineRoll.value),
      ambition: clampAttribute(35 + input.resumeWorkYears * 3 + input.averageAbility * 0.38 + ambitionRoll.value),
    },
  }
}

export class EmployeeEntity {
   private readonly employee: Employee
  constructor(employee: Employee) {
    this.employee = employee;
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
      this.employee.loyalty = clampAttribute(this.employee.loyalty + 1)
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
      this.employee.discipline = clampAttribute(this.employee.discipline + (lightWarning ? 2 : 4))
      this.employee.loyalty = clampAttribute(this.employee.loyalty - 1)
      this.employee.satisfaction = clampAttribute(this.employee.satisfaction - (lightWarning ? 1 : 2))
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
      this.employee.discipline = clampAttribute(this.employee.discipline + 8)
      this.employee.loyalty = clampAttribute(this.employee.loyalty - 6)
      this.employee.satisfaction = clampAttribute(this.employee.satisfaction - 8)
      this.employee.arbitrationTendency = clampAttribute(this.employee.arbitrationTendency + 3)
      this.restoreWorkAfterDiscipline()
      return {
        applied: true,
        action,
        message: `${employeeDisplayName(this.employee)} 收到正式警告。`,
      }
    }

    const fineAmount = Math.round(this.employee.salaryPerDay * clamp(fineRatio, 0, 1))
    this.employee.pressure = clampAttribute(this.employee.pressure + 12)
    this.employee.discipline = clampAttribute(this.employee.discipline + 10)
    this.employee.loyalty = clampAttribute(this.employee.loyalty - 10)
    this.employee.satisfaction = clampAttribute(this.employee.satisfaction - 12)
    this.employee.arbitrationTendency = clampAttribute(this.employee.arbitrationTendency + 8)
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
    const loyaltyLow = (100 - this.employee.loyalty) / 100
    const satisfactionLow = (100 - this.employee.satisfaction) / 100

    return [
      {
        status: 'focused_work',
        weight: 6 + this.employee.energy * 0.18 + this.employee.discipline * 0.12 + this.employee.ambition * 0.2 - this.employee.pressure * 0.12,
      },
      {
        status: 'working',
        weight: 36 + this.employee.energy * 0.18 + this.employee.discipline * 0.1 + this.employee.loyalty * 0.08 - this.employee.pressure * 0.08,
      },
      {
        status: 'slacking',
        weight: this.employee.slackingTendency * 20 + disciplineLow * 10 + energyLow * 10,
      },
      {
        status: 'drinking_water',
        weight: 2 + energyLow * 10 + pressureHigh * 4,
      },
      {
        status: 'smoking',
        weight: 1 + pressureHigh * 10 + disciplineLow * 10,
      },
      {
        status: 'toilet',
        weight: 31 + energyLow * 10 + pressureHigh * 5,
      },
      {
        status: 'job_browsing',
        weight: loyaltyLow * 10 +  satisfactionLow * 20,
      },
      {
        status: 'gaming',
        weight: disciplineLow * 10 + this.employee.slackingTendency * 20 + pressureHigh * 4,
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
        this.employee.loyalty = clampAttribute(this.employee.loyalty - 2)
        this.employee.pressure = clampAttribute(this.employee.pressure - 1)
        break
      case 'gaming':
        this.employee.energy = clampAttribute(this.employee.energy + 2)
        this.employee.pressure = clampAttribute(this.employee.pressure - 2)
        this.employee.discipline = clampAttribute(this.employee.discipline - 2)
        this.employee.loyalty = clampAttribute(this.employee.loyalty - 1)
        break
      default:
        break
    }
  }
}
