import { useGameStore } from '../../store/gameStore'
import { dialogPanel, emptyState, eyebrow, panel, panelHeader, panelTitle } from '../../styles/tw'
import { money } from '../../utils'
import { FinanceRecordTable } from './FinanceRecordTable'

export function FinanceReportPanel() {
  const report = useGameStore((state) => state.getYesterdayFinanceReport())

  return (
    <section className={`${panel} ${dialogPanel}`}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>财务</p>
          <h2 className={panelTitle}>昨日财务报表</h2>
        </div>
      </div>
      {!report ? (
        <p className={emptyState}>还没有昨日财务报表。推进到下班后会自动生成。</p>
      ) : (
        <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
          <div className="rounded-lg border border-[#303834] bg-[rgba(12,15,15,0.5)] p-3.5"><span className="block text-xs text-[#9aa29a]">收入</span><strong className="mt-1.5 block text-[22px]">{money(report.incomeTotal)}</strong></div>
          <div className="rounded-lg border border-[#303834] bg-[rgba(12,15,15,0.5)] p-3.5"><span className="block text-xs text-[#9aa29a]">支出</span><strong className="mt-1.5 block text-[22px]">{money(report.expenseTotal)}</strong></div>
          <div className="rounded-lg border border-[#303834] bg-[rgba(12,15,15,0.5)] p-3.5"><span className="block text-xs text-[#9aa29a]">净利润</span><strong className="mt-1.5 block text-[22px]">{money(report.net)}</strong></div>
          <div className="col-span-3 max-[900px]:col-auto">
            <h3>收入明细</h3>
            <FinanceRecordTable records={report.incomeRecords} />
          </div>
          <div className="col-span-3 max-[900px]:col-auto">
            <h3>支出明细</h3>
            <FinanceRecordTable records={report.expenseRecords} />
          </div>
        </div>
      )}
    </section>
  )
}
