import { useState } from 'react'

import type { SkillRole } from '../../game/types'
import {
  phaseLabels,
  projectStatusLabels,
  projectTracks,
  roleLabels,
  skillRoles,
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

export function ProjectPanel() {
  const projectContracts = useGameStore((state) => state.projectContracts)
  const employees = useGameStore((state) => state.employees)
  const acceptProjectContract = useGameStore((state) => state.acceptProjectContract)
  const assignEmployeeToProject = useGameStore((state) => state.assignEmployeeToProject)
  const [assignments, setAssignments] = useState<Record<string, { employeeId: string; role: SkillRole }>>({})
  const availableEmployees = employees.filter((employee) => employee.status !== 'fired')

  function updateAssignment(projectId: string, patch: Partial<{ employeeId: string; role: SkillRole }>) {
    setAssignments((current) => ({
      ...current,
      [projectId]: {
        employeeId: current[projectId]?.employeeId ?? '',
        role: current[projectId]?.role ?? 'product',
        ...patch,
      },
    }))
  }

  return (
    <section className={`${panel} ${dialogPanel}`}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>项目外包</p>
          <h2 className={panelTitle}>项目合同</h2>
        </div>
      </div>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th>项目</th>
              <th>金额</th>
              <th>期限</th>
              <th>状态</th>
              <th>阶段</th>
              <th>进度</th>
              <th>分配</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {projectContracts.map((project) => {
              const assignment = assignments[project.id] ?? { employeeId: '', role: 'product' as SkillRole }
              return (
                <tr key={project.id}>
                  <td>
                    <strong>{project.title}</strong>
                    <small>{project.clientName}</small>
                  </td>
                  <td>
                    {money(project.amount)}
                    <small>延期 {money(project.dailyPenalty)}/天</small>
                  </td>
                  <td>第 {project.deadlineDay} 天 · 延期 {project.overdueDays} 天</td>
                  <td>{projectStatusLabels[project.status]}</td>
                  <td>{phaseLabels[project.currentPhase]}</td>
                  <td>
                    <div className="grid gap-1">
                      {projectTracks.map((track) => (
                        <span key={track}>
                          {roleLabels[track]} {Math.round(project.phaseProgress[track])}%
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="grid gap-1">
                      {skillRoles.map((role) => (
                        <span key={role}>
                          {roleLabels[role]} {(project.assignedEmployees[role] ?? []).length} 人
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {project.status === 'available' ? (
                      <button type="button" className={button} onClick={() => acceptProjectContract(project.id)}>签约</button>
                    ) : (
                      <div className={formGrid}>
                        <select
                          className={select}
                          name={`project-employee-${project.id}`}
                          value={assignment.employeeId}
                          onChange={(event) => updateAssignment(project.id, { employeeId: event.target.value })}
                        >
                          <option value="">选择员工</option>
                          {availableEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.nickname || employee.name}
                            </option>
                          ))}
                        </select>
                        <select
                          className={select}
                          name={`project-role-${project.id}`}
                          value={assignment.role}
                          onChange={(event) => updateAssignment(project.id, { role: event.target.value as SkillRole })}
                        >
                          {skillRoles.map((role) => (
                            <option key={role} value={role}>{roleLabels[role]}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={button}
                          disabled={!assignment.employeeId || project.status === 'completed'}
                          onClick={() => assignEmployeeToProject(assignment.employeeId, project.id, assignment.role)}
                        >
                          分配
                        </button>
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
