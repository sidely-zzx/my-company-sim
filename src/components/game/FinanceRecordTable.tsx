import type { FinanceRecord } from '../../game/types'
import { money } from '../../utils'

interface FinanceRecordTableProps {
  records: FinanceRecord[]
}

export function FinanceRecordTable({ records }: FinanceRecordTableProps) {
  if (records.length === 0) {
    return <p className="empty-state">暂无明细</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>类型</th>
          <th>金额</th>
          <th>原因</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id}>
            <td>{record.type}</td>
            <td className={record.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
              {money(record.amount)}
            </td>
            <td>{record.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
