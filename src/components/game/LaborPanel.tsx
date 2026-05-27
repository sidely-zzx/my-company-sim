import {
  laborStatusLabels,
  roleLabels,
  urgencyLabels,
} from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import { LaborDetailDialog } from './LaborDetailDialog'
import {
  button,
  dialogPanel,
  eyebrow,
  panel,
  panelHeader,
  panelTitle,
  table,
  tableWrap,
} from '../../styles/tw'
import { money } from '../../utils'

export function LaborPanel() {
  const laborContracts = useGameStore((state) => state.laborContracts)
  const employees = useGameStore((state) => state.employees)
  const acceptLaborContract = useGameStore((state) => state.acceptLaborContract)

  return (
    <section className={`${panel} ${dialogPanel}`}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>人力外包</p>
          <h2 className={panelTitle}>驻场合同</h2>
        </div>
      </div>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th>合同</th>
              <th>需求</th>
              <th>预算</th>
              <th>期限</th>
              <th>状态</th>
              <th>满意度</th>
              <th>分配员工</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {laborContracts.map((contract) => {
              const assigned = employees.find((employee) => employee.id === contract.assignedEmployeeId)
              return (
                <tr key={contract.id}>
                  <td>
                    <strong>{contract.title}</strong>
                    <small>{contract.clientName}</small>
                  </td>
                  <td>{roleLabels[contract.requiredRole]} · 能力 {contract.requiredAbility}</td>
                  <td>{money(contract.dailyBudget)}/天</td>
                  <td>{urgencyLabels[contract.urgency]} · 第 {contract.deadlineDay} 天</td>
                  <td>{laborStatusLabels[contract.status]}</td>
                  <td>{contract.satisfaction}</td>
                  <td>
                    {assigned ? (
                      <>
                        <strong>{assigned.nickname || assigned.name}</strong>
                        <small>
                          {roleLabels[contract.requiredRole]}能力 {assigned.realSkillAbilities[contract.requiredRole] ?? 0}
                          {' / '}
                          要求 {contract.requiredAbility}
                        </small>
                      </>
                    ) : '未分配'}
                  </td>
                  <td>
                    {contract.status === 'available' ? (
                      <button type="button" className={button} onClick={() => acceptLaborContract(contract.id)}>签约</button>
                    ) : (
                      <LaborDetailDialog contract={contract} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
