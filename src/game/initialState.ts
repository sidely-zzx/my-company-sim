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

export function createInitialGameState(seed = DEFAULT_SEED): GameState {
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
    tutorial: createInitialTutorialState(),
    rngSeed: seed,
    nextId: 1,
  }
  return applyTutorialStarterMarket(refreshResumes(generateProjectContracts(generateLaborContracts(state))))
}
