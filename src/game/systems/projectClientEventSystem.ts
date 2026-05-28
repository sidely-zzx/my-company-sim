import { PROJECT_WORK_TRACKS } from '../constants'
import { PROJECT_CLIENT_EVENT_DEFINITIONS, type ProjectClientEventDefinition } from '../data/projectClientEvents'
import { clamp, cloneState, nextRandom } from '../seed'
import type {
  GameState,
  PendingProjectClientEvent,
  ProjectClientEventEffect,
  ProjectClientEventOption,
  ProjectContract,
  ProjectWorkTrack,
  SkillRole,
} from '../types'
import { updateClientTrust } from './clientCompanySystem'
import { addEvent, createId } from './eventSystem'
import { shouldPauseOrdinaryProjectClientEvents, shouldSkipOrdinaryProjectClientEvent } from './tutorialSystem'

const PROJECT_CLIENT_EVENT_COOLDOWN_DAYS = 2
const MAX_PROJECT_CLIENT_EVENTS_PER_PROJECT = 3

const activeProjectStatuses = ['accepted', 'active', 'overdue'] as const

function projectProgress(project: ProjectContract): number {
  return PROJECT_WORK_TRACKS.reduce((total, track) => total + project.phaseProgress[track], 0) / PROJECT_WORK_TRACKS.length
}

function remainingDays(state: GameState, project: ProjectContract): number {
  return project.deadlineDay - state.time.day
}

function projectEventCandidateWeight(state: GameState, project: ProjectContract): number {
  const client = project.clientProfile
  const chaos = client?.requirementChaos ?? 50
  const temper = client?.temper ?? 50
  const progressRisk = projectProgress(project) < 45 && remainingDays(state, project) <= 2 ? 18 : 0
  const overdueRisk = project.status === 'overdue' ? 28 : 0

  // 项目事件权重受甲方混乱度、脾气、范围失控、临期和逾期共同影响；权重只影响触发概率，不直接修改项目。
  return clamp(
    10 + chaos * 0.18 + temper * 0.14 + (project.scopeChangeLevel ?? 0) * 7 + progressRisk + overdueRisk,
    1,
    88,
  )
}

function dailyTriggerChance(state: GameState, candidates: ProjectContract[]): number {
  const highestWeight = candidates.reduce(
    (highest, project) => Math.max(highest, projectEventCandidateWeight(state, project)),
    0,
  )

  // 首版保持低频：基础概率较低，高风险项目只把概率推到中等水平，避免每天都被随机事件打断。
  return clamp(0.14 + highestWeight / 260, 0.14, 0.46)
}

function selectWeighted<T>(state: GameState, items: T[], weightOf: (item: T) => number): T | undefined {
  const totalWeight = items.reduce((total, item) => total + Math.max(0, weightOf(item)), 0)
  if (items.length === 0 || totalWeight <= 0) {
    return undefined
  }

  const roll = nextRandom(state.rngSeed)
  state.rngSeed = roll.seed
  let cursor = roll.value * totalWeight
  for (const item of items) {
    cursor -= Math.max(0, weightOf(item))
    if (cursor <= 0) {
      return item
    }
  }

  return items[items.length - 1]
}

function candidateProjects(state: GameState, endedDay: number): ProjectContract[] {
  return state.projectContracts.filter((project) => {
    if (!activeProjectStatuses.includes(project.status as (typeof activeProjectStatuses)[number])) {
      return false
    }
    if ((project.clientEventCount ?? 0) >= MAX_PROJECT_CLIENT_EVENTS_PER_PROJECT) {
      return false
    }
    if (project.lastClientEventDay !== undefined && endedDay - project.lastClientEventDay < PROJECT_CLIENT_EVENT_COOLDOWN_DAYS) {
      return false
    }
    if (shouldSkipOrdinaryProjectClientEvent(state, project)) {
      return false
    }
    return true
  })
}

function availableDefinitions(state: GameState, project: ProjectContract): ProjectClientEventDefinition[] {
  return PROJECT_CLIENT_EVENT_DEFINITIONS.filter((definition) => definition.canTrigger(project, state))
}

function createPendingProjectClientEvent(
  state: GameState,
  project: ProjectContract,
  definition: ProjectClientEventDefinition,
  endedDay: number,
): PendingProjectClientEvent {
  return {
    id: createId(state, 'project-client-event'),
    kind: definition.kind,
    projectId: project.id,
    projectTitle: project.title,
    clientName: project.clientName,
    triggeredDay: endedDay,
    title: definition.title,
    description: definition.description(project),
    severity: definition.severity,
    options: definition.options(project),
  }
}

export function processDailyProjectClientEvents(state: GameState, endedDay: number): GameState {
  const draft = cloneState(state)
  if (draft.pendingProjectClientEvents.length > 0) {
    return draft
  }
  if (shouldPauseOrdinaryProjectClientEvents(draft)) {
    return draft
  }

  const candidates = candidateProjects(draft, endedDay)
  if (candidates.length === 0) {
    return draft
  }

  const triggerRoll = nextRandom(draft.rngSeed)
  draft.rngSeed = triggerRoll.seed
  if (triggerRoll.value > dailyTriggerChance(draft, candidates)) {
    return draft
  }

  const project = selectWeighted(draft, candidates, (item) => projectEventCandidateWeight(draft, item))
  if (!project) {
    return draft
  }

  const definitions = availableDefinitions(draft, project)
  const definition = selectWeighted(draft, definitions, (item) => item.weight(project, draft))
  if (!definition) {
    return draft
  }

  const pendingEvent = createPendingProjectClientEvent(draft, project, definition, endedDay)
  project.lastClientEventDay = endedDay
  project.clientEventCount = (project.clientEventCount ?? 0) + 1
  draft.pendingProjectClientEvents.push(pendingEvent)
  // 甲方事件需要玩家立刻做选择，所以只暂停时间推进；保留 speed 方便处理完后恢复触发前的播放/快进速度。
  draft.time.paused = true
  addEvent(draft, {
    type: 'project',
    title: '甲方项目事件待处理',
    message: `${project.title} 触发「${pendingEvent.title}」，需要选择应对方案。`,
    severity: pendingEvent.severity,
    relatedEntityId: project.id,
  })

  return draft
}

function clampProgress(value: number): number {
  return clamp(value, 0, 100)
}

function applyProgressDelta(project: ProjectContract, progressDelta: Partial<Record<ProjectWorkTrack, number>>): void {
  for (const [track, delta] of Object.entries(progressDelta) as [ProjectWorkTrack, number][]) {
    project.phaseProgress[track] = clampProgress(project.phaseProgress[track] + delta)
  }
}

function applyRequirementAbilityDelta(project: ProjectContract, abilityDelta: Partial<Record<SkillRole, number>>): void {
  for (const requirement of project.requirements) {
    const delta = abilityDelta[requirement.role]
    if (delta === undefined) {
      continue
    }
    requirement.minAbility = clamp(requirement.minAbility + delta, 20, 100)
  }
}

function applyRequirementHeadcountDelta(project: ProjectContract, headcountDelta: Partial<Record<SkillRole, number>>): void {
  for (const requirement of project.requirements) {
    const delta = headcountDelta[requirement.role]
    if (delta === undefined) {
      continue
    }
    requirement.headcount = Math.max(1, requirement.headcount + delta)
  }
}

function assignedProjectEmployeeIds(project: ProjectContract): string[] {
  return Array.from(new Set(Object.values(project.assignedEmployees).flatMap((employeeIds) => employeeIds ?? [])))
}

function applyEmployeePressure(state: GameState, project: ProjectContract, effect: ProjectClientEventEffect): void {
  const employeeIds = assignedProjectEmployeeIds(project)
  for (const employee of state.employees) {
    if (!employeeIds.includes(employee.id) || employee.status === 'fired') {
      continue
    }

    // 甲方事件只影响当前项目成员：压力、精力和满意度会继续影响员工行为、项目推进速度和劳动风险。
    employee.pressure = clamp(employee.pressure + (effect.employeePressureDelta ?? 0), 0, 100)
    employee.energy = clamp(employee.energy + (effect.employeeEnergyDelta ?? 0), 0, 100)
    employee.satisfaction = clamp(employee.satisfaction + (effect.employeeSatisfactionDelta ?? 0), 0, 100)
  }
}

function applyProjectClientEventEffect(state: GameState, project: ProjectContract, effect: ProjectClientEventEffect): void {
  if (effect.deadlineDayDelta !== undefined) {
    project.deadlineDay = Math.max(state.time.day, project.deadlineDay + effect.deadlineDayDelta)
  }
  if (effect.amountDelta !== undefined) {
    project.amount = Math.max(0, project.amount + effect.amountDelta)
  }
  if (effect.dailyPenaltyDelta !== undefined) {
    project.dailyPenalty = Math.max(0, project.dailyPenalty + effect.dailyPenaltyDelta)
  }
  if (effect.progressDelta) {
    applyProgressDelta(project, effect.progressDelta)
  }
  if (effect.requirementAbilityDelta) {
    applyRequirementAbilityDelta(project, effect.requirementAbilityDelta)
  }
  if (effect.requirementHeadcountDelta) {
    applyRequirementHeadcountDelta(project, effect.requirementHeadcountDelta)
  }
  if (effect.scopeChangeLevelDelta !== undefined) {
    project.scopeChangeLevel = clamp((project.scopeChangeLevel ?? 0) + effect.scopeChangeLevelDelta, 0, 5)
  }
  if (effect.clientTrustDelta !== undefined) {
    updateClientTrust(state, project.clientCompanyId, project.clientProfile?.trust, effect.clientTrustDelta)
  }

  applyEmployeePressure(state, project, effect)
}

function summarizeOption(option: ProjectClientEventOption): string {
  return `${option.label}：${option.description}`
}

export function resolveProjectClientEvent(state: GameState, eventId: string, optionId: string): GameState {
  const draft = cloneState(state)
  const event = draft.pendingProjectClientEvents.find((item) => item.id === eventId)
  if (!event) {
    addEvent(draft, {
      type: 'project',
      title: '甲方事件处理失败',
      message: '没有找到待处理的甲方项目事件。',
      severity: 'warning',
    })
    return draft
  }

  const option = event.options.find((item) => item.id === optionId)
  const project = draft.projectContracts.find((item) => item.id === event.projectId)
  if (!option || !project) {
    addEvent(draft, {
      type: 'project',
      title: '甲方事件处理失败',
      message: option ? '关联项目已经不存在。' : '没有找到对应的处理选项。',
      severity: 'warning',
      relatedEntityId: event.projectId,
    })
    return draft
  }

  applyProjectClientEventEffect(draft, project, option.effects)
  draft.pendingProjectClientEvents = draft.pendingProjectClientEvents.filter((item) => item.id !== eventId)
  if (draft.pendingProjectClientEvents.length === 0 && draft.pendingLaborClientNotices.length === 0 && draft.activeDailyBriefingDay === undefined) {
    // 最后一个待选甲方事件处理完后恢复时间；speed 在触发时被保留，所以会回到玩家原本的播放/快进速度。
    draft.time.paused = false
  }
  addEvent(draft, {
    type: 'project',
    title: `已处理：${event.title}`,
    message: `${project.title} 选择「${summarizeOption(option)}」。`,
    severity: event.severity,
    relatedEntityId: project.id,
  })

  return draft
}
