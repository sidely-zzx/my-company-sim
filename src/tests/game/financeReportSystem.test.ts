import { describe, expect, it } from 'vitest'

import { generateFinanceReport, getYesterdayFinanceReport } from '../../game/systems/financeReportSystem'
import { addFinanceRecord } from '../../game/systems/financeSystem'
import { createTestState } from './testHelpers'

describe('financeReportSystem', () => {
  it('generates an aggregated report for the ended day', () => {
    const state = createTestState()
    addFinanceRecord(state, { type: 'project_income', amount: 1000, reason: '收入' })
    addFinanceRecord(state, { type: 'salary', amount: -300, reason: '支出' })

    const result = generateFinanceReport(state, 1)
    const report = result.financeReports[0]

    expect(report?.incomeTotal).toBe(1000)
    expect(report?.expenseTotal).toBe(300)
    expect(report?.net).toBe(700)
    expect(result.mailbox.some((mail) => mail.type === 'daily_finance_report')).toBe(true)
  })

  it('does not generate duplicated reports for the same day', () => {
    const state = createTestState()
    const once = generateFinanceReport(state, 1)
    const twice = generateFinanceReport(once, 1)

    expect(twice.financeReports).toHaveLength(1)
  })

  it('returns yesterday report', () => {
    const state = createTestState()
    const reported = generateFinanceReport(state, 1)
    reported.time.day = 2

    expect(getYesterdayFinanceReport(reported)?.day).toBe(1)
  })
})
