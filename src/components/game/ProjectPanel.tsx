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
import { isStarterProjectContract } from '../../game/systems/tutorialSystem'
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
  tutorialBadge,
  tutorialRow,
  tutorialTarget,
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
  const tutorial = useGameStore((state) => state.tutorial)
  const acceptProjectContract = useGameStore((state) => state.acceptProjectContract)
  const showProjectGuide = tutorial.enabled && !tutorial.completed && [
    'review_project_contract',
    'assign_project_team',
    'finish_starter_project',
  ].includes(tutorial.currentStep)

  return (
    <section className={`${panel} ${dialogPanel}`}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>项目外包</p>
          <h2 className={panelTitle}>项目合同</h2>
        </div>
      </div>
      {showProjectGuide ? (
        <div className="mb-3 rounded-md border border-[#b59d65] bg-[#2d281f] p-3 text-sm text-[#ead7aa]">
          <strong className="block text-[#ffe0a3]">当前指引：完成推荐项目教学</strong>
          <span className="mt-1 block text-xs leading-5 text-[#d8cfbb]">
            推荐项目会带你跑通多岗位分配、甲方事件和完成收款；先处理带有「推荐项目教学」标记的合同。
          </span>
        </div>
      ) : null}
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
              const starterProject = isStarterProjectContract({ tutorial }, project.id) && !tutorial.completed
              return (
                <tr
                  key={project.id}
                  data-tutorial-anchor={starterProject ? 'starter-project-row' : undefined}
                  className={starterProject ? tutorialRow : undefined}
                >
                  <td>
                    <strong>{project.title}</strong>
                    <small>{project.clientName}</small>
                    {starterProject ? (
                      <small><span className={tutorialBadge}>推荐项目教学</span></small>
                    ) : null}
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
                      <ProjectDetailDialog
                        project={project}
                        trigger={(
                          <button
                            type="button"
                            data-tutorial-anchor={starterProject ? 'starter-project-detail-button' : undefined}
                            className={button}
                          >
                            详情
                          </button>
                        )}
                      />
                      {project.status === 'available' && (
                        <button
                          type="button"
                          data-tutorial-anchor={starterProject ? 'starter-project-sign-button' : undefined}
                          className={cn(button, starterProject && cn('animate-pulse', tutorialTarget))}
                          onClick={() => acceptProjectContract(project.id)}
                        >
                          签约
                        </button>
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
