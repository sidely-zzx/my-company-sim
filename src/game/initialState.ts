import {
  DAILY_RESUME_REFRESH_LIMIT,
  DEFAULT_OFF_WORK_HOUR,
  DEFAULT_SEED,
  START_DAY,
  STARTING_MONEY,
  WORK_START_MINUTE,
} from './constants'
import { CLIENT_COMPANIES } from './data/clientCompanies'
import { generateLaborContracts } from './systems/contractSystem'
import { generateProjectContracts } from './systems/projectSystem'
import { refreshResumes } from './systems/recruitingSystem'
import { applyTutorialStarterMarket, createInitialTutorialState } from './systems/tutorialSystem'
import type { GameState } from './types'

interface CreateInitialGameStateOptions {
  /** 是否启用新手教程；会影响教学保底合同、保底候选人、教学邮件和 UI 高亮是否生成。 */
  tutorialEnabled?: boolean
}

export function createInitialGameState(seed = DEFAULT_SEED, options: CreateInitialGameStateOptions = {}): GameState {
  const tutorialEnabled = options.tutorialEnabled ?? true
  const state: GameState = {
    settings: {
      offWorkHour: DEFAULT_OFF_WORK_HOUR,
    },
    time: {
      day: START_DAY,
      minuteOfDay: WORK_START_MINUTE,
      totalMinutes: 0,
      realMsAccumulator: 0,
      speed: 1,
      paused: false,
    },
    money: STARTING_MONEY,
    employees: [],
    resumes: [],
    laborContracts: [],
    projectContracts: [],
    clientRelations: CLIENT_COMPANIES.map((client) => ({
      clientCompanyId: client.id,
      trust: client.trust,
    })),
    pendingProjectClientEvents: [],
    pendingLaborClientNotices: [],
    activeDailyBriefingDay: undefined,
    dailyBriefingReadDays: [],
    events: [],
    financeRecords: [],
    financeReports: [],
    mailbox: [],
    pendingArbitrations: [],
    market: {
      resumeRefreshesUsed: 0,
      resumeRefreshLimit: DAILY_RESUME_REFRESH_LIMIT,
      vip: false,
      recruitingPosts: [],
    },
    tutorial: createInitialTutorialState(tutorialEnabled),
    rngSeed: seed,
    nextId: 1,
  }
  const regularMarketState = refreshResumes(generateProjectContracts(generateLaborContracts(state)))

  // 新手教程开启时注入保底第一单和推荐候选人；跳过教程则保留纯普通市场开局。
  return tutorialEnabled ? applyTutorialStarterMarket(regularMarketState) : regularMarketState
}
