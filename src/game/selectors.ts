import type { FinanceReport, GameState } from './types'

export function selectUnreadMailCount(state: GameState): number {
  return state.mailbox.filter((mail) => !mail.read).length
}

export function selectFinanceReport(state: GameState, day: number): FinanceReport | undefined {
  return state.financeReports.find((report) => report.day === day)
}

export function selectYesterdayFinanceReport(state: GameState): FinanceReport | undefined {
  return selectFinanceReport(state, state.time.day - 1)
}
