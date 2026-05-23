import { cloneState } from '../seed'
import type { FinanceReport, GameState } from '../types'
import { createId } from './eventSystem'
import { sendMail } from './mailSystem'

export function generateFinanceReport(state: GameState, reportDay: number): GameState {
  if (state.financeReports.some((report) => report.day === reportDay)) {
    return state
  }

  const draft = cloneState(state)
  const records = draft.financeRecords.filter((record) => record.day === reportDay)
  const incomeRecords = records.filter((record) => record.amount > 0)
  const expenseRecords = records.filter((record) => record.amount < 0)
  const incomeTotal = incomeRecords.reduce((sum, record) => sum + record.amount, 0)
  const expenseTotal = expenseRecords.reduce((sum, record) => sum + Math.abs(record.amount), 0)
  const report: FinanceReport = {
    id: createId(draft, 'report'),
    day: reportDay,
    incomeTotal,
    expenseTotal,
    net: incomeTotal - expenseTotal,
    incomeRecords,
    expenseRecords,
    generatedAtDay: draft.time.day,
  }
  const mailId = sendMail(draft, {
    type: 'daily_finance_report',
    from: '财务系统',
    subject: `第 ${reportDay} 天财务报表`,
    body: `昨日收入 ${incomeTotal}，支出 ${expenseTotal}，净利润 ${report.net}。`,
    relatedEntityId: report.id,
  })
  report.mailId = mailId
  draft.financeReports.push(report)
  return draft
}

export function getFinanceReport(state: GameState, day: number): FinanceReport | undefined {
  return state.financeReports.find((report) => report.day === day)
}

export function getYesterdayFinanceReport(state: GameState): FinanceReport | undefined {
  return getFinanceReport(state, state.time.day - 1)
}
