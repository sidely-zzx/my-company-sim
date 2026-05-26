import { useState } from 'react'

import {
  abilitiesText,
  assignmentText,
  clampNumber,
  employeeStatusLabels,
  pendingAssignmentText,
  percent,
  schoolLabels,
  skillClaimsText,
} from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import { EmployeeDetailPanel, type EmployeeCompensationFormState } from './EmployeeDetailPanel'
import {
  button,
  dialogPanel,
  emptyState,
  eyebrow,
  panel,
  panelHeader,
  panelTitle,
  table,
  tableWrap,
} from '../../styles/tw'
import { money } from '../../utils'

export function EmployeePanel() {
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const renameEmployee = useGameStore((state) => state.renameEmployee)
  const updateEmployeeCompensation = useGameStore((state) => state.updateEmployeeCompensation)
  const fireEmployee = useGameStore((state) => state.fireEmployee)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>()
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [compensations, setCompensations] = useState<Record<string, string>>({})
  const [compensationForms, setCompensationForms] = useState<Record<string, EmployeeCompensationFormState>>({})
  const selectedEmployee = selectedEmployeeId
    ? employees.find((employee) => employee.id === selectedEmployeeId)
    : undefined

  function getCompensationForm(employeeId: string): EmployeeCompensationFormState {
    const employee = employees.find((item) => item.id === employeeId)
    return compensationForms[employeeId] ?? {
      salary: employee ? String(employee.salaryPerDay) : '0',
      socialPercent: employee ? Math.round(employee.socialInsuranceRatio * 100) : 100,
    }
  }

  function updateCompensationForm(employeeId: string, patch: Partial<EmployeeCompensationFormState>) {
    setCompensationForms((current) => ({
      ...current,
      [employeeId]: {
        ...getCompensationForm(employeeId),
        ...current[employeeId],
        ...patch,
      },
    }))
  }

  if (selectedEmployee) {
    return (
      <section className={`${panel} ${dialogPanel}`}>
        <EmployeeDetailPanel
          employee={selectedEmployee}
          laborContracts={laborContracts}
          projectContracts={projectContracts}
          nickname={nicknames[selectedEmployee.id] ?? selectedEmployee.nickname ?? ''}
          fireCompensationRatio={compensations[selectedEmployee.id] ?? '1'}
          compensationForm={getCompensationForm(selectedEmployee.id)}
          onBack={() => setSelectedEmployeeId(undefined)}
          onNicknameChange={(value) =>
            setNicknames((current) => ({ ...current, [selectedEmployee.id]: value }))
          }
          onRename={() => renameEmployee(
            selectedEmployee.id,
            (nicknames[selectedEmployee.id] ?? selectedEmployee.nickname ?? selectedEmployee.name) || selectedEmployee.name,
          )}
          onFireCompensationRatioChange={(value) =>
            setCompensations((current) => ({ ...current, [selectedEmployee.id]: value }))
          }
          onFire={() =>
            fireEmployee(selectedEmployee.id, clampNumber(compensations[selectedEmployee.id] ?? '1', 1))
          }
          onCompensationFormChange={(patch) => updateCompensationForm(selectedEmployee.id, patch)}
          onSaveCompensation={(salaryPerDay, socialInsuranceRatio) => {
            updateEmployeeCompensation(selectedEmployee.id, salaryPerDay, socialInsuranceRatio)
            setCompensationForms((current) => ({
              ...current,
              [selectedEmployee.id]: {
                salary: String(salaryPerDay),
                socialPercent: Math.round(socialInsuranceRatio * 100),
              },
            }))
          }}
        />
      </section>
    )
  }

  return (
    <section className={`${panel} ${dialogPanel}`}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>员工</p>
          <h2 className={panelTitle}>员工列表</h2>
        </div>
        <span>{employees.length} 人</span>
      </div>
      {employees.length === 0 ? (
        <p className={emptyState}>暂无员工，先从简历市场发 offer。</p>
      ) : (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th>员工</th>
                <th>状态</th>
                <th>薪资/社保</th>
                <th>满意度</th>
                <th>简历技能</th>
                <th>真实能力</th>
                <th>当前分配</th>
                <th>后续安排</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <strong>{employee.nickname || employee.name}</strong>
                    <small>{employee.name} · {schoolLabels[employee.school]}</small>
                  </td>
                  <td>{employeeStatusLabels[employee.status]}</td>
                  <td>{money(employee.salaryPerDay)} / {percent(employee.socialInsuranceRatio)}</td>
                  <td>{employee.satisfaction}</td>
                  <td>{skillClaimsText(employee.resumeSkills)}</td>
                  <td>{abilitiesText(employee)}</td>
                  <td>{assignmentText(employee, laborContracts, projectContracts)}</td>
                  <td>{pendingAssignmentText(employee, laborContracts, projectContracts)}</td>
                  <td>
                    <button
                      type="button"
                      className={button}
                      onClick={() => setSelectedEmployeeId(employee.id)}
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
