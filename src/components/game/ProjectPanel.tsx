import { useState } from 'react'

import type { AssignmentMode, ProjectContract, SkillRole } from '../../game/types'
import {
  assignmentModeLabels,
  assignmentModes,
  assignmentText,
  phaseLabels,
  pendingAssignmentText,
  projectStatusLabels,
  projectTracks,
  roleLabels,
  skillRoles,
} from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import {
  button,
  cn,
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

type ProjectAssignmentDraft = {
  employeeId: string
  role: SkillRole
  mode: AssignmentMode
}

function defaultAssignment(): ProjectAssignmentDraft {
  return {
    employeeId: '',
    role: 'product',
    mode: 'immediate',
  }
}

function isCurrentPhaseRole(project: ProjectContract, role: SkillRole): boolean {
  if (project.currentPhase === 'development') {
    return role === 'frontend' || role === 'backend'
  }
  return project.currentPhase === role
}

function canAssignProjectRole(project: ProjectContract, role: SkillRole): boolean {
  return ['accepted', 'active', 'overdue'].includes(project.status) && project.phaseProgress[role] < 100
}

export function ProjectPanel() {
  const projectContracts = useGameStore((state) => state.projectContracts)
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const acceptProjectContract = useGameStore((state) => state.acceptProjectContract)
  const assignEmployeeToProject = useGameStore((state) => state.assignEmployeeToProject)
  const [assignments, setAssignments] = useState<Record<string, ProjectAssignmentDraft>>({})
  const assignableEmployees = employees.filter((employee) => employee.status !== 'fired')

  function updateAssignment(projectId: string, patch: Partial<ProjectAssignmentDraft>) {
    setAssignments((current) => ({
      ...current,
      [projectId]: {
        ...defaultAssignment(),
        ...current[projectId],
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
              const assignment = assignments[project.id] ?? defaultAssignment()
              const selectedEmployee = employees.find((employee) => employee.id === assignment.employeeId)
              const showLaborPendingHint =
                selectedEmployee?.assignedTo?.type === 'labor' && assignment.mode === 'after_current'
              const canAssignSelectedRole = canAssignProjectRole(project, assignment.role)
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
                        <span
                          key={role}
                          className={cn(isCurrentPhaseRole(project, role) && 'font-extrabold text-[#efe2c8]')}
                        >
                          {roleLabels[role]} 当前 {(project.assignedEmployees[role] ?? []).length} 人
                          {' / '}
                          待投入 {
                            employees.filter((employee) =>
                              employee.pendingAssignment?.type === 'project' &&
                              employee.pendingAssignment.id === project.id &&
                              employee.pendingAssignment.role === role,
                            ).length
                          } 人
                          {' / '}
                          建议 {project.requirements.find((item) => item.role === role)?.headcount ?? 0} 人
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
                          name={`project-role-${project.id}`}
                          value={assignment.role}
                          onChange={(event) => updateAssignment(project.id, { role: event.target.value as SkillRole })}
                        >
                          {skillRoles.map((role) => (
                            <option key={role} value={role}>{roleLabels[role]}</option>
                          ))}
                        </select>
                        <select
                          className={select}
                          name={`project-mode-${project.id}`}
                          value={assignment.mode}
                          onChange={(event) => updateAssignment(project.id, { mode: event.target.value as AssignmentMode })}
                        >
                          {assignmentModes.map((mode) => (
                            <option key={mode} value={mode}>{assignmentModeLabels[mode]}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={button}
                          disabled={!assignment.employeeId || !canAssignSelectedRole}
                          onClick={() =>
                            assignEmployeeToProject(assignment.employeeId, project.id, assignment.role, assignment.mode)
                          }
                        >
                          安排
                        </button>
                        {showLaborPendingHint && (
                          <small className="basis-full text-[#e4b45b]">
                            驻场合同通常不会自动完成，后续安排要等合同结束、被替换或立即调走后才会执行。
                          </small>
                        )}
                        {assignment.employeeId && !canAssignSelectedRole && (
                          <small className="basis-full text-[#ff7968]">
                            该项目状态或岗位进度不允许继续安排员工。
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
