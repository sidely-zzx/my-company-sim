import { PROJECT_WORK_TRACKS } from '../constants'
import { clamp } from '../seed'
import type {
  GameState,
  ProjectClientEventKind,
  ProjectClientEventOption,
  ProjectContract,
  ProjectWorkTrack,
  SkillRole,
} from '../types'

export interface ProjectClientEventDefinition {
  kind: ProjectClientEventKind
  title: string
  severity: 'info' | 'warning' | 'danger' | 'success'
  description: (project: ProjectContract) => string
  canTrigger: (project: ProjectContract, state: GameState) => boolean
  weight: (project: ProjectContract, state: GameState) => number
  options: (project: ProjectContract) => ProjectClientEventOption[]
}

const developmentTracks: ProjectWorkTrack[] = ['frontend', 'backend']
const developmentRoles: SkillRole[] = ['frontend', 'backend']
const allRoles: SkillRole[] = ['product', 'design', 'frontend', 'backend', 'testing']

function moneyDelta(project: ProjectContract, ratio: number, min: number): number {
  return Math.max(min, Math.round((project.amount * ratio) / 100) * 100)
}

function remainingDays(project: ProjectContract, state: GameState): number {
  return project.deadlineDay - state.time.day
}

function clientChaos(project: ProjectContract): number {
  return project.clientProfile?.requirementChaos ?? 50
}

function clientTemper(project: ProjectContract): number {
  return project.clientProfile?.temper ?? 50
}

function progressDelta(tracks: ProjectWorkTrack[], value: number): Partial<Record<ProjectWorkTrack, number>> {
  return Object.fromEntries(tracks.map((track) => [track, value])) as Partial<Record<ProjectWorkTrack, number>>
}

function abilityDelta(roles: SkillRole[], value: number): Partial<Record<SkillRole, number>> {
  return Object.fromEntries(roles.map((role) => [role, value])) as Partial<Record<SkillRole, number>>
}

function headcountDelta(roles: SkillRole[], value: number): Partial<Record<SkillRole, number>> {
  return Object.fromEntries(roles.map((role) => [role, value])) as Partial<Record<SkillRole, number>>
}

export const PROJECT_CLIENT_EVENT_DEFINITIONS: ProjectClientEventDefinition[] = [
  {
    kind: 'scope_change',
    title: '甲方临时追加需求',
    severity: 'warning',
    description: (project) => `${project.clientName} 临时提出新增功能，希望保持原交付节奏。`,
    canTrigger: (project, state) => remainingDays(project, state) > 1,
    weight: (project, state) => {
      const timePressure = remainingDays(project, state) <= 3 ? -16 : 0
      return clamp(16 + clientChaos(project) * 0.38 + (project.scopeChangeLevel ?? 0) * 6 + timePressure, 0, 70)
    },
    options: (project) => [
      {
        id: 'accept_scope',
        label: '接受追加',
        description: `项目金额 +${moneyDelta(project, 0.1, 800)}，但范围扩大、进度返工、团队压力上升。`,
        effects: {
          amountDelta: moneyDelta(project, 0.1, 800),
          progressDelta: {
            product: -6,
            design: -8,
            frontend: -6,
            backend: -6,
            testing: -4,
          },
          requirementAbilityDelta: abilityDelta(allRoles, 3),
          scopeChangeLevelDelta: 1,
          clientTrustDelta: 3,
          employeePressureDelta: 8,
          employeeEnergyDelta: -4,
        },
      },
      {
        id: 'negotiate_scope',
        label: '砍范围协商',
        description: `项目金额 +${moneyDelta(project, 0.05, 400)}，轻微返工，甲方信任小幅提升。`,
        effects: {
          amountDelta: moneyDelta(project, 0.05, 400),
          progressDelta: progressDelta(PROJECT_WORK_TRACKS, -3),
          scopeChangeLevelDelta: 1,
          clientTrustDelta: 1,
          employeePressureDelta: 4,
        },
      },
      {
        id: 'reject_scope',
        label: '拒绝追加',
        description: '项目范围不变，但甲方信任明显下降，后续合作更难。',
        effects: {
          clientTrustDelta: -8,
          employeePressureDelta: 2,
        },
      },
    ],
  },
  {
    kind: 'deadline_cut',
    title: '甲方要求提前交付',
    severity: 'danger',
    description: (project) => `${project.clientName} 要求压缩交付周期，希望项目更早上线。`,
    canTrigger: (project, state) => remainingDays(project, state) > 0,
    weight: (project, state) => {
      const nearDeadline = remainingDays(project, state) <= 2 ? 18 : 0
      return clamp(14 + clientTemper(project) * 0.42 + nearDeadline, 0, 82)
    },
    options: (project) => [
      {
        id: 'accept_rush',
        label: '接受加急',
        description: '截止日提前 2 天，甲方信任上升，但项目成员压力和疲劳显著增加。',
        effects: {
          deadlineDayDelta: -2,
          clientTrustDelta: 4,
          employeePressureDelta: 12,
          employeeEnergyDelta: -8,
          employeeSatisfactionDelta: -3,
        },
      },
      {
        id: 'partial_rush',
        label: '只提前 1 天',
        description: '截止日提前 1 天，团队压力小幅增加，甲方信任略升。',
        effects: {
          deadlineDayDelta: -1,
          clientTrustDelta: 1,
          employeePressureDelta: 6,
          employeeEnergyDelta: -3,
        },
      },
      {
        id: 'reject_rush',
        label: '拒绝提前',
        description: '交付周期不变，但甲方信任下降，并提高延期争议压力。',
        effects: {
          clientTrustDelta: -8,
          dailyPenaltyDelta: Math.max(100, Math.round(project.dailyPenalty * 0.08 / 100) * 100),
        },
      },
    ],
  },
  {
    kind: 'design_rework',
    title: '甲方推翻部分设计',
    severity: 'warning',
    description: (project) => `${project.clientName} 对已确认的方案反悔，要求重做一部分设计和实现。`,
    canTrigger: (project) => project.phaseProgress.design > 20 || project.currentPhase === 'development' || project.currentPhase === 'testing',
    weight: (project) => clamp(10 + clientChaos(project) * 0.34 + clientTemper(project) * 0.16, 0, 70),
    options: (project) => [
      {
        id: 'accept_rework',
        label: '安排返工',
        description: '设计和开发进度回退，甲方信任提升，团队压力增加。',
        effects: {
          progressDelta: {
            design: -12,
            frontend: -8,
            backend: -8,
            testing: -4,
          },
          clientTrustDelta: 3,
          employeePressureDelta: 7,
          employeeEnergyDelta: -3,
          scopeChangeLevelDelta: 1,
        },
      },
      {
        id: 'ask_confirmation',
        label: '要求确认单',
        description: `项目金额 +${moneyDelta(project, 0.04, 300)}，返工减少，但甲方信任只小幅提升。`,
        effects: {
          amountDelta: moneyDelta(project, 0.04, 300),
          progressDelta: {
            design: -6,
            frontend: -4,
            backend: -4,
          },
          clientTrustDelta: 1,
          employeePressureDelta: 4,
        },
      },
      {
        id: 'keep_original',
        label: '按原方案推进',
        description: '不返工，但甲方信任下降，验收阶段更容易出现扣款压力。',
        effects: {
          clientTrustDelta: -7,
          dailyPenaltyDelta: Math.max(100, Math.round(project.dailyPenalty * 0.06 / 100) * 100),
        },
      },
    ],
  },
  {
    kind: 'acceptance_dispute',
    title: '阶段验收挑刺',
    severity: 'warning',
    description: (project) => `${project.clientName} 在验收时提出一批边界问题，要求项目组处理后再确认。`,
    canTrigger: (project) => project.status === 'overdue' || project.phaseProgress.testing >= 20,
    weight: (project) => clamp(12 + clientTemper(project) * 0.42 + (project.status === 'overdue' ? 20 : 0), 0, 86),
    options: (project) => [
      {
        id: 'free_fix',
        label: '免费修复',
        description: '测试进度回退，甲方信任提升，团队压力增加。',
        effects: {
          progressDelta: { testing: -10 },
          clientTrustDelta: 2,
          employeePressureDelta: 5,
          employeeEnergyDelta: -2,
        },
      },
      {
        id: 'paid_fix',
        label: '争取变更费',
        description: `项目金额 +${moneyDelta(project, 0.03, 300)}，测试进度小幅回退，甲方信任略降。`,
        effects: {
          amountDelta: moneyDelta(project, 0.03, 300),
          progressDelta: { testing: -6 },
          clientTrustDelta: -1,
          employeePressureDelta: 3,
        },
      },
      {
        id: 'argue_acceptance',
        label: '强硬反驳',
        description: '进度不变，但甲方信任下降，延期违约金压力提高。',
        effects: {
          clientTrustDelta: -8,
          dailyPenaltyDelta: Math.max(100, Math.round(project.dailyPenalty * 0.1 / 100) * 100),
        },
      },
    ],
  },
  {
    kind: 'budget_for_scope',
    title: '甲方追加预算换更多范围',
    severity: 'info',
    description: (project) => `${project.clientName} 愿意追加预算，但希望同时扩大交付范围。`,
    canTrigger: (project) => project.status !== 'overdue' && (project.clientProfile?.budgetLevel ?? 50) >= 55,
    weight: (project) => clamp(10 + (project.clientProfile?.budgetLevel ?? 50) * 0.3 + clientChaos(project) * 0.12, 0, 62),
    options: (project) => [
      {
        id: 'accept_budget_scope',
        label: '接受加钱加范围',
        description: `项目金额 +${moneyDelta(project, 0.15, 1200)}，截止日延后 2 天，但开发和测试压力上升。`,
        effects: {
          amountDelta: moneyDelta(project, 0.15, 1200),
          deadlineDayDelta: 2,
          progressDelta: {
            frontend: -5,
            backend: -5,
            testing: -5,
          },
          requirementHeadcountDelta: headcountDelta(developmentRoles, 1),
          scopeChangeLevelDelta: 1,
          clientTrustDelta: 4,
          employeePressureDelta: 8,
        },
      },
      {
        id: 'partial_budget_scope',
        label: '只接部分',
        description: `项目金额 +${moneyDelta(project, 0.08, 600)}，截止日延后 1 天，轻微返工。`,
        effects: {
          amountDelta: moneyDelta(project, 0.08, 600),
          deadlineDayDelta: 1,
          progressDelta: progressDelta(developmentTracks, -3),
          scopeChangeLevelDelta: 1,
          clientTrustDelta: 1,
          employeePressureDelta: 4,
        },
      },
      {
        id: 'reject_budget_scope',
        label: '拒绝扩大范围',
        description: '项目保持原范围，甲方信任小幅下降。',
        effects: {
          clientTrustDelta: -4,
        },
      },
    ],
  },
]
