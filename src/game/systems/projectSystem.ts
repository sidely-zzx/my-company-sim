import { PROJECT_BREACH_PENALTY_RATE, PROJECT_WORK_TRACKS } from '../constants'
import { CLIENT_COMPANIES } from '../data/clientCompanies'
import { PROJECT_TEMPLATES } from '../data/projectTemplates'
import { clamp, cloneState, nextRandom, randomChoice } from '../seed'
import type {
  AssignmentMode,
  ClientCompanyProfile,
  GameState,
  ProjectContract,
  ProjectPhase,
  ProjectRequirement,
  ProjectWorkTrack,
  SkillRole,
} from '../types'
import {
  assignEmployeeToTarget,
  cancelPendingAssignmentsForProject,
  releaseCompletedProjectRoleAssignments,
  releaseProjectAssignments,
} from './assignmentSystem'
import { calculateEmployeeOutput } from './employeeSystem'
import { addEvent, createId } from './eventSystem'
import { addFinanceRecord } from './financeSystem'
import { sendMail } from './mailSystem'

const CLIENT_BLACKLIST_TRUST_THRESHOLD = 20
const CLIENT_PROJECT_COMPLETED_TRUST_DELTA = 8
const CLIENT_PROJECT_OVERDUE_TRUST_DELTA = -5
const CLIENT_PROJECT_BREACHED_TRUST_DELTA = -25
const breachableProjectStatuses = ['accepted', 'active', 'overdue'] as const
const completedTrackEventTitles: Record<ProjectWorkTrack, string> = {
  product: '产品阶段已完成',
  design: '设计阶段已完成',
  frontend: '前端开发已完成',
  backend: '后端开发已完成',
  testing: '测试阶段已完成',
}

function roundTo(value: number, unit: number): number {
  return Math.max(unit, Math.round(value / unit) * unit)
}

function clientAmountMultiplier(client: ClientCompanyProfile): number {
  // 预算等级决定甲方能给多少钱；客情只做小幅溢价，需求混乱则补偿额外返工成本。
  return clamp(
    0.72 + client.budgetLevel * 0.007 + (client.relationship - 50) * 0.0015 + (client.requirementChaos - 50) * 0.0018,
    0.75,
    1.55,
  )
}

function clientDurationOffset(client: ClientCompanyProfile): number {
  // 周期受客情正向影响；需求混乱和坏脾气会压缩交付窗口，直接影响延期风险。
  return Math.round(
    (client.relationship - 50) / 22 -
      (client.requirementChaos - 50) / 20 -
      (client.temper - 50) / 24,
  )
}

function clientPenaltyMultiplier(client: ClientCompanyProfile): number {
  // 脾气越大越爱扣款，混乱需求也会放大验收争议；关系好能压低每日违约金。
  return clamp(
    0.85 + client.temper * 0.006 + (client.requirementChaos - 50) * 0.002 - (client.relationship - 50) * 0.0015,
    0.7,
    1.65,
  )
}

function clientRequirementOffset(client: ClientCompanyProfile): number {
  // 岗位门槛代表甲方验收标准；混乱和暴躁会提高能力要求，并影响玩家需要安排的员工能力。
  return Math.round((client.requirementChaos - 50) * 0.18 + (client.temper - 50) * 0.08)
}

function adjustProjectRequirements(
  requirements: ProjectRequirement[],
  client: ClientCompanyProfile,
): ProjectRequirement[] {
  const abilityOffset = clientRequirementOffset(client)

  return requirements.map((requirement) => {
    const needsExtraDeveloper =
      client.requirementChaos >= 80 &&
      ['frontend', 'backend', 'testing'].includes(requirement.role) &&
      requirement.headcount < 2

    return {
      ...requirement,
      minAbility: clamp(requirement.minAbility + abilityOffset, 20, 95),
      headcount: requirement.headcount + (needsExtraDeveloper ? 1 : 0),
    }
  })
}

function clientProgressMultiplier(project: ProjectContract): number {
  if (!project.clientProfile) {
    return 1
  }

  const client = project.clientProfile
  // 推进效率表示合作摩擦：好关系减少等待和返工，高需求混乱/坏脾气会拖慢同样能力员工的产出。
  return clamp(
    1 +
      (client.relationship - 50) * 0.002 -
      (client.requirementChaos - 50) * 0.004 -
      (client.temper - 50) * 0.002,
    0.72,
    1.18,
  )
}

function clientTrust(state: GameState, client: ClientCompanyProfile): number {
  return state.clientRelations.find((relation) => relation.clientCompanyId === client.id)?.trust ?? client.trust
}

function clientWithCurrentTrust(state: GameState, client: ClientCompanyProfile): ClientCompanyProfile {
  return {
    ...client,
    trust: clientTrust(state, client),
  }
}

function randomClientByTrust(state: GameState): ClientCompanyProfile | undefined {
  const candidates = CLIENT_COMPANIES.map((client) => clientWithCurrentTrust(state, client)).filter(
    (client) => client.trust >= CLIENT_BLACKLIST_TRUST_THRESHOLD,
  )
  const totalWeight = candidates.reduce((total, client) => total + client.trust * client.trust, 0)
  if (candidates.length === 0 || totalWeight <= 0) {
    return undefined
  }

  const roll = nextRandom(state.rngSeed)
  state.rngSeed = roll.seed
  let cursor = roll.value * totalWeight
  for (const client of candidates) {
    cursor -= client.trust * client.trust
    if (cursor <= 0) {
      return client
    }
  }

  return candidates[candidates.length - 1]
}

function updateClientTrust(state: GameState, project: ProjectContract, delta: number): void {
  if (project.clientCompanyId === undefined) {
    return
  }

  const baseClient = CLIENT_COMPANIES.find((client) => client.id === project.clientCompanyId)
  const relation = state.clientRelations.find((item) => item.clientCompanyId === project.clientCompanyId)
  const nextTrust = clamp((relation?.trust ?? project.clientProfile?.trust ?? baseClient?.trust ?? 50) + delta, 0, 100)

  // trust 是动态客情属性：合作结果会影响后续甲方项目刷新概率，过低会让甲方进入黑名单不再出现。
  if (relation) {
    relation.trust = nextTrust
    return
  }

  state.clientRelations.push({
    clientCompanyId: project.clientCompanyId,
    trust: nextTrust,
  })
}

function createProjectContract(state: GameState): ProjectContract | undefined {
  const client = randomClientByTrust(state)
  if (!client) {
    return undefined
  }

  const template = randomChoice(state.rngSeed, PROJECT_TEMPLATES)
  state.rngSeed = template.seed
  const amount = roundTo(template.value.amount * clientAmountMultiplier(client), 500)
  const durationDays = Math.max(2, template.value.durationDays + clientDurationOffset(client))
  const dailyPenalty = roundTo(template.value.dailyPenalty * clientPenaltyMultiplier(client), 100)

  return {
    id: createId(state, 'project'),
    clientCompanyId: client.id,
    clientName: client.name,
    clientProfile: client,
    title: `${client.name}${template.value.title}`,
    amount,
    deadlineDay: state.time.day + durationDays,
    dailyPenalty,
    overdueDays: 0,
    status: 'available',
    currentPhase: 'product',
    requirements: adjustProjectRequirements(template.value.requirements, client),
    phaseProgress: {
      product: 0,
      design: 0,
      frontend: 0,
      backend: 0,
      testing: 0,
    },
    notifiedCompletedTracks: [],
    assignedEmployees: {},
  }
}

export function generateProjectContracts(state: GameState): GameState {
  const draft = cloneState(state)
  const activeContracts = draft.projectContracts.filter((contract) => contract.status !== 'available')
  const availableContracts = Array.from({ length: 3 }, () => createProjectContract(draft)).filter(
    (project): project is ProjectContract => Boolean(project),
  )
  draft.projectContracts = [...activeContracts, ...availableContracts]
  return draft
}

export function acceptProjectContract(state: GameState, projectId: string): GameState {
  const draft = cloneState(state)
  const project = draft.projectContracts.find((item) => item.id === projectId)
  if (!project || project.status !== 'available') {
    addEvent(draft, {
      type: 'project',
      title: '项目签约失败',
      message: '没有找到可签约的项目外包。',
      severity: 'warning',
    })
    return draft
  }
  project.status = 'accepted'
  project.acceptedDay = draft.time.day
  sendMail(draft, {
    type: 'contract_signed',
    from: project.clientName,
    subject: `已签署项目外包：${project.title}`,
    body: `项目金额 ${project.amount}，截止第 ${project.deadlineDay} 天，延期每日违约金 ${project.dailyPenalty}。`,
    relatedEntityId: project.id,
  })
  addEvent(draft, {
    type: 'project',
    title: '项目外包已签约',
    message: project.title,
    severity: 'success',
    relatedEntityId: project.id,
  })
  return draft
}

export function assignEmployeeToProject(
  state: GameState,
  employeeId: string,
  projectId: string,
  role: SkillRole,
  mode: AssignmentMode = 'immediate',
): GameState {
  const draft = cloneState(state)
  assignEmployeeToTarget(draft, employeeId, { type: 'project', id: projectId, role }, mode)
  return draft
}

export function breachProjectContract(state: GameState, projectId: string): GameState {
  const draft = cloneState(state)
  const project = draft.projectContracts.find((item) => item.id === projectId)
  if (!project) {
    addEvent(draft, {
      type: 'project',
      title: '项目毁约失败',
      message: '没有找到可毁约的项目外包。',
      severity: 'warning',
    })
    return draft
  }

  if (!breachableProjectStatuses.includes(project.status as (typeof breachableProjectStatuses)[number])) {
    addEvent(draft, {
      type: 'project',
      title: '项目毁约失败',
      message: project.status === 'available' ? '项目尚未签约，不能毁约。' : '项目已结束，不能重复毁约。',
      severity: 'warning',
      relatedEntityId: project.id,
    })
    return draft
  }

  const penalty = Math.round(project.amount * PROJECT_BREACH_PENALTY_RATE)
  project.status = 'breached'
  project.breachedDay = draft.time.day
  updateClientTrust(draft, project, CLIENT_PROJECT_BREACHED_TRUST_DELTA)
  cancelPendingAssignmentsForProject(draft, project)
  releaseProjectAssignments(draft, project)
  const recordId = addFinanceRecord(draft, {
    type: 'project_penalty',
    amount: -penalty,
    reason: `${project.title} 项目毁约违约金`,
    relatedEntityId: project.id,
  })
  project.breachFinanceRecordId = recordId
  sendMail(draft, {
    type: 'contract_breach',
    from: project.clientName,
    subject: `项目毁约：${project.title}`,
    body: `公司主动毁约，需赔偿项目金额 30% 的违约金 ${penalty}。项目已终止，不再推进或产生延期扣款。`,
    relatedEntityId: project.id,
    financeRecordId: recordId,
  })
  addEvent(draft, {
    type: 'project',
    title: '项目已毁约',
    message: `${project.title} 已终止，扣除毁约违约金 ${penalty}。`,
    severity: 'danger',
    relatedEntityId: project.id,
  })
  return draft
}

function tracksForPhase(phase: ProjectPhase): ProjectWorkTrack[] {
  if (phase === 'development') {
    return ['frontend', 'backend']
  }
  return [phase]
}

function updateCurrentPhase(project: ProjectContract): void {
  if (project.phaseProgress.product < 100) {
    project.currentPhase = 'product'
    return
  }
  if (project.phaseProgress.design < 100) {
    project.currentPhase = 'design'
    return
  }
  if (project.phaseProgress.frontend < 100 || project.phaseProgress.backend < 100) {
    project.currentPhase = 'development'
    return
  }
  project.currentPhase = 'testing'
}

function isProjectComplete(project: ProjectContract): boolean {
  return PROJECT_WORK_TRACKS.every((track) => project.phaseProgress[track] >= 100)
}

function notifyCompletedTrack(state: GameState, project: ProjectContract, track: ProjectWorkTrack): void {
  // 阶段完成提示由轨道进度首次达到 100% 触发；记录已提示轨道，避免高频 tick 重复刷事件日志。
  project.notifiedCompletedTracks ??= []
  if (project.notifiedCompletedTracks.includes(track)) {
    return
  }
  project.notifiedCompletedTracks.push(track)
  addEvent(state, {
    type: 'project',
    title: completedTrackEventTitles[track],
    message: `${project.title} 的${completedTrackEventTitles[track].replace('已完成', '')}推进到 100%。`,
    severity: 'success',
    relatedEntityId: project.id,
  })
}

function completeProject(state: GameState, project: ProjectContract): void {
  if (project.status === 'completed' || project.status === 'breached') {
    return
  }
  project.status = 'completed'
  project.completedDay = state.time.day
  updateClientTrust(state, project, CLIENT_PROJECT_COMPLETED_TRUST_DELTA)
  cancelPendingAssignmentsForProject(state, project)
  releaseProjectAssignments(state, project)
  const recordId = addFinanceRecord(state, {
    type: 'project_income',
    amount: project.amount,
    reason: `${project.title} 项目完成款`,
    relatedEntityId: project.id,
  })
  project.settlementFinanceRecordId = recordId
  sendMail(state, {
    type: 'project_completed',
    from: project.clientName,
    subject: `项目验收通过：${project.title}`,
    body: `项目已完成，甲方支付全款 ${project.amount}。延期 ${project.overdueDays} 天的违约金不退还。`,
    relatedEntityId: project.id,
    financeRecordId: recordId,
  })
  addEvent(state, {
    type: 'project',
    title: '项目完成',
    message: `${project.title} 完成并收款 ${project.amount}。`,
    severity: 'success',
    relatedEntityId: project.id,
  })
}

export function advanceProjectProgress(state: GameState, minutes: number): GameState {
  const draft = cloneState(state)
  for (let minute = 0; minute < minutes; minute += 1) {
    for (const project of draft.projectContracts) {
      if (!['active', 'overdue'].includes(project.status)) {
        continue
      }
      updateCurrentPhase(project)
      for (const track of tracksForPhase(project.currentPhase)) {
        const role = track as SkillRole
        const employeeIds = [...(project.assignedEmployees[role] ?? [])]
        for (const employeeId of employeeIds) {
          const employee = draft.employees.find((item) => item.id === employeeId)
          if (!employee || employee.status === 'fired') {
            continue
          }
          const previousProgress = project.phaseProgress[track]
          project.phaseProgress[track] = Math.min(
            100,
            project.phaseProgress[track] + calculateEmployeeOutput(draft, employee, role) * clientProgressMultiplier(project),
          )
          if (previousProgress < 100 && project.phaseProgress[track] >= 100) {
            notifyCompletedTrack(draft, project, track)
          }
        }
        releaseCompletedProjectRoleAssignments(draft, project, role)
      }
      updateCurrentPhase(project)
      if (isProjectComplete(project)) {
        completeProject(draft, project)
      }
    }
  }
  return draft
}

export function settleProjectsEndOfDay(state: GameState, endedDay: number): GameState {
  const draft = cloneState(state)
  for (const project of draft.projectContracts) {
    if (project.status === 'completed' || project.status === 'available' || project.status === 'breached') {
      continue
    }
    if (isProjectComplete(project)) {
      completeProject(draft, project)
      continue
    }
    if (endedDay > project.deadlineDay) {
      project.status = 'overdue'
      project.overdueDays += 1
      updateClientTrust(draft, project, CLIENT_PROJECT_OVERDUE_TRUST_DELTA)
      const recordId = addFinanceRecord(draft, {
        type: 'project_penalty',
        amount: -project.dailyPenalty,
        reason: `${project.title} 延期违约金`,
        relatedEntityId: project.id,
      })
      sendMail(draft, {
        type: 'project_overdue',
        from: project.clientName,
        subject: `项目延期扣款：${project.title}`,
        body: `项目仍未完成，今日扣除延期违约金 ${project.dailyPenalty}。`,
        relatedEntityId: project.id,
        financeRecordId: recordId,
      })
      addEvent(draft, {
        type: 'project',
        title: '项目延期',
        message: `${project.title} 今日扣除延期违约金 ${project.dailyPenalty}。`,
        severity: 'danger',
        relatedEntityId: project.id,
      })
    }
  }
  return draft
}
