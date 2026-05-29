import type { GameState } from './types'
import { INITIAL_COMPANY_REPUTATION } from './systems/reputationSystem'

export const GAME_SAVE_FORMAT = 'my-company-sim-save'
export const GAME_SAVE_VERSION = 9
const TUTORIAL_SAVE_NODE_IDS = [
  'read_welcome_mail',
  'review_labor_contract',
  'send_offer',
  'assign_employee',
  'start_first_day_time',
  'catch_slacking_employee',
  'settle_first_day',
  'read_project_mail',
  'review_project_contract',
  'hire_project_team',
  'assign_project_team',
  'wait_project_deadline_cut_event',
  'resolve_deadline_cut_event',
  'finish_starter_project',
  'completed',
]

export interface GameSaveFile {
  /** 存档格式标识；用于避免把其他 JSON 文件误当成游戏存档读取。 */
  format: typeof GAME_SAVE_FORMAT
  /** 存档结构版本；未来 GameState 字段变化时可按版本做迁移。 */
  version: typeof GAME_SAVE_VERSION
  /** 导出时间，只用于 UI 展示和排查问题，不参与游戏结算。 */
  savedAt: string
  /** 完整游戏状态；包含事件、邮件、财务流水和当前随机数种子。 */
  state: GameState
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasNumberField(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'number' && Number.isFinite(record[key])
}

function hasArrayField(record: Record<string, unknown>, key: string): boolean {
  return Array.isArray(record[key])
}

function hasTutorialNodeShape(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    (value.nextId === undefined || typeof value.nextId === 'string') &&
    typeof value.completed === 'boolean' &&
    typeof value.todoText === 'string' &&
    isRecord(value.coach) &&
    typeof value.coach.title === 'string' &&
    typeof value.coach.description === 'string' &&
    typeof value.coach.actionText === 'string' &&
    typeof value.coach.reasonText === 'string' &&
    hasArrayField(value.coach, 'anchorIds') &&
    typeof value.coach.target === 'string'
  )
}

function hasEmployeeShape(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    hasArrayField(value, 'resumeSkills') &&
    isRecord(value.realSkillAbilities) &&
    hasNumberField(value, 'salaryPerDay') &&
    hasNumberField(value, 'socialInsuranceRatio') &&
    hasNumberField(value, 'satisfaction') &&
    hasNumberField(value, 'arbitrationTendency') &&
    hasNumberField(value, 'slackingTendency') &&
    hasNumberField(value, 'behaviorSeed') &&
    hasNumberField(value, 'energy') &&
    hasNumberField(value, 'loyalty') &&
    hasNumberField(value, 'pressure') &&
    hasNumberField(value, 'discipline') &&
    hasNumberField(value, 'ambition') &&
    hasNumberField(value, 'workDays') &&
    typeof value.status === 'string'
  )
}

function hasLaborContractShape(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.clientName === 'string' &&
    typeof value.title === 'string' &&
    typeof value.requiredRole === 'string' &&
    hasNumberField(value, 'requiredAbility') &&
    hasNumberField(value, 'dailyBudget') &&
    typeof value.urgency === 'string' &&
    hasNumberField(value, 'durationDays') &&
    hasNumberField(value, 'endDay') &&
    hasNumberField(value, 'deadlineDay') &&
    hasNumberField(value, 'todayOutput') &&
    hasNumberField(value, 'todayRequiredOutput') &&
    hasNumberField(value, 'todayOutputDay') &&
    hasNumberField(value, 'satisfaction') &&
    typeof value.status === 'string'
  )
}

function hasLaborClientNoticeShape(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.contractId === 'string' &&
    typeof value.contractTitle === 'string' &&
    typeof value.clientName === 'string' &&
    hasNumberField(value, 'triggeredDay') &&
    hasNumberField(value, 'checkedDay') &&
    hasNumberField(value, 'actualOutput') &&
    hasNumberField(value, 'requiredOutput')
  )
}

function hasGameStateShape(value: unknown): value is GameState {
  if (
    !isRecord(value) ||
    !isRecord(value.settings) ||
    !isRecord(value.time) ||
    !isRecord(value.market) ||
    !isRecord(value.tutorial)
  ) {
    return false
  }

  return (
    hasNumberField(value.settings, 'offWorkHour') &&
    hasNumberField(value.time, 'day') &&
    hasNumberField(value.time, 'minuteOfDay') &&
    hasNumberField(value.time, 'totalMinutes') &&
    hasNumberField(value.time, 'realMsAccumulator') &&
    hasNumberField(value.time, 'speed') &&
    typeof value.time.paused === 'boolean' &&
    hasNumberField(value, 'money') &&
    (value.companyReputation === undefined || hasNumberField(value, 'companyReputation')) &&
    hasArrayField(value, 'employees') &&
    (value.employees as unknown[]).every(hasEmployeeShape) &&
    hasArrayField(value, 'resumes') &&
    hasArrayField(value, 'laborContracts') &&
    (value.laborContracts as unknown[]).every(hasLaborContractShape) &&
    hasArrayField(value, 'projectContracts') &&
    hasArrayField(value, 'clientRelations') &&
    hasArrayField(value, 'pendingProjectClientEvents') &&
    hasArrayField(value, 'pendingLaborClientNotices') &&
    (value.pendingLaborClientNotices as unknown[]).every(hasLaborClientNoticeShape) &&
    (value.activeDailyBriefingDay === undefined || hasNumberField(value, 'activeDailyBriefingDay')) &&
    hasArrayField(value, 'dailyBriefingReadDays') &&
    (value.dailyBriefingReadDays as unknown[]).every((day) => typeof day === 'number' && Number.isFinite(day)) &&
    hasArrayField(value, 'events') &&
    hasArrayField(value, 'financeRecords') &&
    hasArrayField(value, 'financeReports') &&
    hasArrayField(value, 'mailbox') &&
    hasArrayField(value, 'pendingArbitrations') &&
    hasNumberField(value.market, 'resumeRefreshesUsed') &&
    hasNumberField(value.market, 'resumeRefreshLimit') &&
    typeof value.market.vip === 'boolean' &&
    hasArrayField(value.market, 'recruitingPosts') &&
    typeof value.tutorial.enabled === 'boolean' &&
    typeof value.tutorial.completed === 'boolean' &&
    typeof value.tutorial.currentNodeId === 'string' &&
    isRecord(value.tutorial.nodes) &&
    TUTORIAL_SAVE_NODE_IDS.every((nodeId) => hasTutorialNodeShape((value.tutorial.nodes as Record<string, unknown>)[nodeId])) &&
    hasArrayField(value.tutorial, 'starterResumeIds') &&
    hasArrayField(value.tutorial, 'starterProjectResumeIds') &&
    hasNumberField(value, 'rngSeed') &&
    hasNumberField(value, 'nextId')
  )
}

function normalizeGameState(state: GameState): GameState {
  return {
    ...state,
    // 早期版本存档没有公司声誉字段；读取时补默认值，避免旧局面因为新增玩家数据无法进入游戏。
    companyReputation: Number.isFinite(state.companyReputation)
      ? state.companyReputation
      : INITIAL_COMPANY_REPUTATION,
  }
}

export function createGameSaveJson(state: GameState, savedAt = new Date()): string {
  const saveFile: GameSaveFile = {
    format: GAME_SAVE_FORMAT,
    version: GAME_SAVE_VERSION,
    savedAt: savedAt.toISOString(),
    state,
  }

  return JSON.stringify(saveFile, null, 2)
}

export function createGameSaveFileName(state: GameState, savedAt = new Date()): string {
  const timestamp = savedAt.toISOString().replace(/[:.]/g, '-')
  return `my-company-sim-day-${state.time.day}-${timestamp}.companysim.json`
}

/**
 * 解析完整存档文件。首页继续游戏列表依赖外层 savedAt 和 state 摘要展示存档，
 * 加载游戏时再把 state 写回 store；因此这里同时校验元信息和游戏状态。
 */
export function parseGameSaveFileJson(json: string): GameSaveFile {
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('存档不是有效的 JSON 文件')
  }

  if (!isRecord(parsed)) {
    throw new Error('存档内容格式不正确')
  }

  if (parsed.format !== GAME_SAVE_FORMAT) {
    throw new Error('存档格式不匹配')
  }

  if (parsed.version !== GAME_SAVE_VERSION) {
    throw new Error('暂不支持这个版本的存档')
  }

  if (typeof parsed.savedAt !== 'string') {
    throw new Error('存档缺少保存时间')
  }

  if (!hasGameStateShape(parsed.state)) {
    throw new Error('存档缺少有效的游戏状态')
  }

  return {
    format: GAME_SAVE_FORMAT,
    version: GAME_SAVE_VERSION,
    savedAt: parsed.savedAt,
    state: normalizeGameState(parsed.state),
  }
}

export function parseGameSaveJson(json: string): GameState {
  return parseGameSaveFileJson(json).state
}
