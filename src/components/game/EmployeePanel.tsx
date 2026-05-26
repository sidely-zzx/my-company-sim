import { useState } from 'react'

import {
  abilitiesText,
  assignmentText,
  clampNumber,
  employeeStatusLabels,
  percent,
  schoolLabels,
  skillClaimsText,
} from '../../game/ui'
import { Input } from '../ui/input'
import { useGameStore } from '../../store/gameStore'
import {
  button,
  dialogPanel,
  emptyState,
  eyebrow,
  formGrid,
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
  const fireEmployee = useGameStore((state) => state.fireEmployee)
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [compensations, setCompensations] = useState<Record<string, string>>({})

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
                <th>分配</th>
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
                  <td>
                    <div className={formGrid}>
                      <Input
                        aria-label={`${employee.name} 花名`}
                        name={`employee-nickname-${employee.id}`}
                        value={nicknames[employee.id] ?? ''}
                        placeholder="花名"
                        onChange={(event) =>
                          setNicknames((current) => ({ ...current, [employee.id]: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className={button}
                        onClick={() => renameEmployee(employee.id, nicknames[employee.id] || employee.name)}
                      >
                        改名
                      </button>
                      <Input
                        aria-label={`${employee.name} 赔偿系数`}
                        name={`employee-compensation-${employee.id}`}
                        type="number"
                        value={compensations[employee.id] ?? '1'}
                        step="0.1"
                        min="0"
                        max="2"
                        onChange={(event) =>
                          setCompensations((current) => ({ ...current, [employee.id]: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className={button}
                        disabled={employee.status === 'fired'}
                        onClick={() => fireEmployee(employee.id, clampNumber(compensations[employee.id] ?? '1', 1))}
                      >
                        辞退
                      </button>
                    </div>
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
