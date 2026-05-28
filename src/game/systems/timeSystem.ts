import {
  DAILY_RESUME_REFRESH_LIMIT,
  MS_PER_GAME_MINUTE,
  VIP_DAILY_RESUME_REFRESH_LIMIT,
  WORK_START_MINUTE,
} from '../constants'
import { cloneState } from '../seed'
import type { GameSpeed, GameState, WorkHour } from '../types'
import {
  processArbitrationFilings,
  processArbitrationResults,
  processSocialInsuranceComplaints,
} from './arbitrationSystem'
import { settleLaborContractsEndOfDay } from './contractSystem'
import { updateEmployeeSatisfaction } from './employeeSystem'
import { addEvent } from './eventSystem'
import { settleDailyFinance } from './financeSystem'
import { generateFinanceReport } from './financeReportSystem'
import { processDailyProjectClientEvents } from './projectClientEventSystem'
import { advanceProjectProgress, generateProjectContracts, settleProjectsEndOfDay } from './projectSystem'
import { refreshResumes, resetDailyRecruiting } from './recruitingSystem'

function offWorkMinute(state: GameState): number {
  return state.settings.offWorkHour * 60
}

function settleEndOfDay(state: GameState): GameState {
  const endedDay = state.time.day
  let nextState = settleProjectsEndOfDay(state, endedDay)
  nextState = settleLaborContractsEndOfDay(nextState, endedDay)
  nextState = settleDailyFinance(nextState)
  nextState = updateEmployeeSatisfaction(nextState)
  nextState = processSocialInsuranceComplaints(nextState)
  nextState = processArbitrationFilings(nextState)
  nextState = processArbitrationResults(nextState, endedDay)
  nextState = generateFinanceReport(nextState, endedDay)
  nextState = processDailyProjectClientEvents(nextState, endedDay)
  if (nextState.pendingLaborClientNotices.length > 0 || nextState.pendingProjectClientEvents.length > 0) {
    nextState.activeDailyBriefingDay = endedDay
    nextState.time.paused = true
  }
  nextState.time.day += 1
  nextState.time.minuteOfDay = WORK_START_MINUTE
  nextState = resetDailyRecruiting(nextState)
  nextState = generateProjectContracts(nextState)
  nextState = refreshResumes(nextState, false)
  addEvent(nextState, {
    type: 'finance',
    title: '新的一天开始',
    message: `第 ${nextState.time.day} 天 09:00，市场和财务报表已更新。`,
    severity: 'info',
  })
  return nextState
}

export function advanceGameTime(state: GameState, realDeltaMs: number): GameState {
  if (state.time.paused || state.time.speed === 0 || realDeltaMs <= 0) {
    return state
  }

  let draft = cloneState(state)
  draft.time.realMsAccumulator += realDeltaMs * draft.time.speed
  let minutesToAdvance = Math.floor(draft.time.realMsAccumulator / MS_PER_GAME_MINUTE)
  draft.time.realMsAccumulator %= MS_PER_GAME_MINUTE

  while (minutesToAdvance > 0) {
    const remainingToday = offWorkMinute(draft) - draft.time.minuteOfDay
    const chunk = Math.min(minutesToAdvance, Math.max(0, remainingToday))
    if (chunk > 0) {
      draft = advanceProjectProgress(draft, chunk)
      draft.time.minuteOfDay += chunk
      draft.time.totalMinutes += chunk
      minutesToAdvance -= chunk
    }
    if (draft.time.minuteOfDay >= offWorkMinute(draft)) {
      draft = settleEndOfDay(draft)
    }
  }

  return draft
}

export function setSpeed(state: GameState, speed: GameSpeed): GameState {
  return {
    ...state,
    time: {
      ...state.time,
      speed,
      paused: speed === 0,
    },
  }
}

export function setOffWorkHour(state: GameState, hour: WorkHour): GameState {
  let draft = cloneState(state)
  draft.settings.offWorkHour = hour
  if (draft.time.minuteOfDay >= offWorkMinute(draft)) {
    draft = settleEndOfDay(draft)
  }
  return draft
}

export function resetDailyMarketLimits(state: GameState): GameState {
  return {
    ...state,
    market: {
      ...state.market,
      resumeRefreshesUsed: 0,
      resumeRefreshLimit: state.market.vip
        ? VIP_DAILY_RESUME_REFRESH_LIMIT
        : DAILY_RESUME_REFRESH_LIMIT,
    },
  }
}
