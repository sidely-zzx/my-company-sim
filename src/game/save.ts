import { nextRandom } from './seed'
import type { Employee, GameState } from './types'

export const GAME_SAVE_FORMAT = 'my-company-sim-save'
export const GAME_SAVE_VERSION = 1

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

function hasGameStateShape(value: unknown): value is GameState {
  if (!isRecord(value) || !isRecord(value.settings) || !isRecord(value.time) || !isRecord(value.market)) {
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
    hasArrayField(value, 'employees') &&
    hasArrayField(value, 'resumes') &&
    hasArrayField(value, 'laborContracts') &&
    hasArrayField(value, 'projectContracts') &&
    hasArrayField(value, 'clientRelations') &&
    hasArrayField(value, 'events') &&
    hasArrayField(value, 'financeRecords') &&
    hasArrayField(value, 'financeReports') &&
    hasArrayField(value, 'mailbox') &&
    hasArrayField(value, 'pendingArbitrations') &&
    hasNumberField(value.market, 'resumeRefreshesUsed') &&
    hasNumberField(value.market, 'resumeRefreshLimit') &&
    typeof value.market.vip === 'boolean' &&
    hasArrayField(value.market, 'recruitingPosts') &&
    hasNumberField(value, 'rngSeed') &&
    hasNumberField(value, 'nextId')
  )
}

function normalizeGameState(state: GameState): GameState {
  for (const employee of state.employees as Array<Employee & { behaviorSeed?: number }>) {
    if (Number.isFinite(employee.behaviorSeed)) {
      continue
    }

    const behaviorSeed = nextRandom(state.rngSeed)
    state.rngSeed = behaviorSeed.seed
    employee.behaviorSeed = behaviorSeed.seed
  }

  return state
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
