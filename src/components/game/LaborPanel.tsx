import { useState } from 'react'

import type { AssignmentMode, LaborContract } from '../../game/types'
import {
  assignmentModeLabels,
  assignmentModes,
  assignmentText,
  laborStatusLabels,
  pendingAssignmentText,
  roleLabels,
  urgencyLabels,
} from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import {
  button,
  dialogPanel,
  eyebrow,
  formGrid,
  panel,
  panelHeader,
  panelTitle,
  select,
  table,
  tableWrap,
} from '../../styles/tw'
import { money } from '../../utils'

type LaborAssignmentDraft = {
  employeeId: string
  mode: AssignmentMode
}

function defaultAssignment(): LaborAssignmentDraft {
  return {
    employeeId: '',
    mode: 'immediate',
  }
}

function canAssignLaborContract(contract: LaborContract): boolean {
  return ['accepted', 'active', 'warning'].includes(contract.status)
}

export function LaborPanel() {
  const laborContracts = useGameStore((state) => state.laborContracts)
  const employees = useGameStore((state) => state.employees)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const acceptLaborContract = useGameStore((state) => state.acceptLaborContract)
  const assignEmployeeToLabor = useGameStore((state) => state.assignEmployeeToLabor)
  const [assignments, setAssignments] = useState<Record<string, LaborAssignmentDraft>>({})
  const assignableEmployees = employees.filter((employee) => employee.status !== 'fired')

  function updateAssignment(contractId: string, patch: Partial<LaborAssignmentDraft>) {
    setAssignments((current) => ({
      ...current,
      [contractId]: {
        ...defaultAssignment(),
        ...current[contractId],
        ...patch,
      },
    }))
  }

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
              const assignment = assignments[contract.id] ?? defaultAssignment()
              const selectedEmployee = employees.find((employee) => employee.id === assignment.employeeId)
              const showLaborPendingHint =
                selectedEmployee?.assignedTo?.type === 'labor' && assignment.mode === 'after_current'
              const canAssignContract = canAssignLaborContract(contract)
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
                  <td>{assigned?.nickname || assigned?.name || '未分配'}</td>
                  <td>
                    {contract.status === 'available' ? (
                      <button type="button" className={button} onClick={() => acceptLaborContract(contract.id)}>签约</button>
                    ) : (
                      <div className={formGrid}>
                        <select
                          className={select}
                          name={`labor-assignment-${contract.id}`}
                          value={assignment.employeeId}
                          onChange={(event) => updateAssignment(contract.id, { employeeId: event.target.value })}
                        >
                          <option value="">选择员工</option>
                          {assignableEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.nickname || employee.name} · {assignmentText(employee, laborContracts, projectContracts)}
                              {' · 后续 '}
                              {pendingAssignmentText(employee, laborContracts, projectContracts)}
                            </option>
                          ))}
                        </select>
                        <select
                          className={select}
                          name={`labor-mode-${contract.id}`}
                          value={assignment.mode}
                          onChange={(event) => updateAssignment(contract.id, { mode: event.target.value as AssignmentMode })}
                        >
                          {assignmentModes.map((mode) => (
                            <option key={mode} value={mode}>{assignmentModeLabels[mode]}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={button}
                          disabled={!assignment.employeeId || !canAssignContract}
                          onClick={() => assignEmployeeToLabor(assignment.employeeId, contract.id, assignment.mode)}
                        >
                          安排
                        </button>
                        {showLaborPendingHint && (
                          <small className="basis-full text-[#e4b45b]">
                            驻场合同通常不会自动完成，后续安排要等合同结束、被替换或立即调走后才会执行。
                          </small>
                        )}
                        {assignment.employeeId && !canAssignContract && (
                          <small className="basis-full text-[#ff7968]">
                            该人力合同状态不允许继续安排员工。
                          </small>
                        )}
                      </div>
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
