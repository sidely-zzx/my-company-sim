import { useGameStore } from '../../store/gameStore'
import { money } from '../../utils'
import { FinanceRecordTable } from './FinanceRecordTable'

export function FinanceReportPanel() {
  const report = useGameStore((state) => state.getYesterdayFinanceReport())

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">财务</p>
          <h2>昨日财务报表</h2>
        </div>
      </div>
      {!report ? (
        <p className="empty-state">还没有昨日财务报表。推进到下班后会自动生成。</p>
      ) : (
        <div className="report-grid">
          <div className="metric"><span>收入</span><strong>{money(report.incomeTotal)}</strong></div>
          <div className="metric"><span>支出</span><strong>{money(report.expenseTotal)}</strong></div>
          <div className="metric"><span>净利润</span><strong>{money(report.net)}</strong></div>
          <div>
            <h3>收入明细</h3>
            <FinanceRecordTable records={report.incomeRecords} />
          </div>
          <div>
            <h3>支出明细</h3>
            <FinanceRecordTable records={report.expenseRecords} />
          </div>
        </div>
      )}
    </section>
  )
}
