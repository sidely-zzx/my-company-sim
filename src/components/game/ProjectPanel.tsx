import type { ProjectContract, SkillRole } from '../../game/types'
import { ProjectDetailDialog } from './ProjectDetailDialog'
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
  cn,
  dialogPanel,
  eyebrow,
  formGrid,
  panel,
  panelHeader,
  panelTitle,
  table,
  tableWrap,
} from '../../styles/tw'
import { money } from '../../utils'

function isCurrentPhaseRole(project: ProjectContract, role: SkillRole): boolean {
  if (project.currentPhase === 'development') {
    return role === 'frontend' || role === 'backend'
  }
  return project.currentPhase === role
}

export function ProjectPanel() {
  const projectContracts = useGameStore((state) => state.projectContracts)
  const employees = useGameStore((state) => state.employees)
  const acceptProjectContract = useGameStore((state) => state.acceptProjectContract)

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
                    <div className={formGrid}>
                      <ProjectDetailDialog project={project} />
                      {project.status === 'available' && (
                        <button type="button" className={button} onClick={() => acceptProjectContract(project.id)}>签约</button>
                      )}
                    </div>
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
