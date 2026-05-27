import { useMemo, useState, type ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { SelectField, type SelectFieldOption } from '../ui/select-field'
import { PROJECT_BREACH_PENALTY_RATE } from '../../game/constants'
import type { AssignmentMode, Employee, ProjectContract, SkillRole } from '../../game/types'
import {
  assignmentModeLabels,
  assignmentModes,
  assignmentText,
  pendingAssignmentText,
  phaseLabels,
  formatTime,
  projectProgress,
  projectStatusLabels,
  projectTracks,
  roleLabels,
  skillClaimsText,
  skillRoles,
  progressTone,
} from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import {
  button,
  cn,
  emptyState,
  eventBorderToneClass,
  progressFill,
  progressToneClass,
  progressTrack,
  riskToneClass,
} from '../../styles/tw'
import { money } from '../../utils'

type EmployeeAvailabilityFilter = 'all' | 'idle' | 'busy'
type RoleFilter = 'all' | SkillRole

const roleOptions = skillRoles.map((role) => ({
  value: role,
  label: roleLabels[role],
})) satisfies SelectFieldOption<SkillRole>[]

const assignmentModeOptions = assignmentModes.map((mode) => ({
  value: mode,
  label: assignmentModeLabels[mode],
})) satisfies SelectFieldOption<AssignmentMode>[]

const roleFilterOptions = [
  { value: 'all', label: '全部岗位' },
  ...skillRoles.map((role) => ({
    value: role,
    label: roleLabels[role],
  })),
] satisfies SelectFieldOption<RoleFilter>[]

const availabilityFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'idle', label: '仅空闲' },
  { value: 'busy', label: '仅忙碌' },
] satisfies SelectFieldOption<EmployeeAvailabilityFilter>[]

interface ProjectDetailDialogProps {
  project: ProjectContract
  trigger?: ReactNode
}

function defaultSelectedRole(project: ProjectContract): SkillRole {
  if (project.currentPhase === 'development') {
    return 'frontend'
  }
  return project.currentPhase
}

function canAssignProjectRole(project: ProjectContract, role: SkillRole): boolean {
  return ['accepted', 'active', 'overdue'].includes(project.status) && project.phaseProgress[role] < 100
}

function assignDisabledReason(project: ProjectContract, role: SkillRole): string {
  if (!['accepted', 'active', 'overdue'].includes(project.status)) {
    if (project.status === 'available') {
      return '项目未签约，不能安排员工。'
    }
    if (project.status === 'breached') {
      return '项目已毁约，不能继续安排员工。'
    }
    return '项目已完成，不能继续安排员工。'
  }
  if (project.phaseProgress[role] >= 100) {
    return `${roleLabels[role]} 已完成，不能继续安排员工。`
  }
  return ''
}

function canBreachProject(project: ProjectContract): boolean {
  return ['accepted', 'active', 'overdue'].includes(project.status)
}

function isEmployeeIdle(employee: Employee): boolean {
  return !employee.assignedTo
}

function roleAbility(employee: Employee, role: SkillRole): number {
  return employee.realSkillAbilities[role] ?? 0
}

function resumeRoleScore(employee: Employee, role: SkillRole): number {
  const levelScore = {
    junior: 8,
    mid: 14,
    senior: 20,
  }
  return employee.resumeSkills
    .filter((skill) => skill.role === role)
    .reduce((score, skill) => Math.max(score, levelScore[skill.level]), 0)
}

function employeeRoleScore(employee: Employee, role: SkillRole): number {
  return roleAbility(employee, role) + resumeRoleScore(employee, role)
}

function employeeMatchesRole(employee: Employee, role: RoleFilter): boolean {
  if (role === 'all') {
    return true
  }

  return employee.resumeSkills.some((skill) => skill.role === role) || roleAbility(employee, role) > 0
}

function employeeMatchesAvailability(employee: Employee, filter: EmployeeAvailabilityFilter): boolean {
  if (filter === 'all') {
    return true
  }
  return filter === 'idle' ? isEmployeeIdle(employee) : !isEmployeeIdle(employee)
}

function isCurrentPhaseRole(project: ProjectContract, role: SkillRole): boolean {
  if (project.currentPhase === 'development') {
    return role === 'frontend' || role === 'backend'
  }
  return project.currentPhase === role
}

export function ProjectDetailDialog({ project, trigger }: ProjectDetailDialogProps) {
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const events = useGameStore((state) => state.events)
  const pendingProjectClientEvents = useGameStore((state) => state.pendingProjectClientEvents)
  const acceptProjectContract = useGameStore((state) => state.acceptProjectContract)
  const assignEmployeeToProject = useGameStore((state) => state.assignEmployeeToProject)
  const breachProjectContract = useGameStore((state) => state.breachProjectContract)
  const resolveProjectClientEvent = useGameStore((state) => state.resolveProjectClientEvent)
  const [selectedRole, setSelectedRole] = useState<SkillRole>(() => defaultSelectedRole(project))
  const [selectedMode, setSelectedMode] = useState<AssignmentMode>('immediate')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<EmployeeAvailabilityFilter>('all')
  const [confirmingBreach, setConfirmingBreach] = useState(false)
  const totalProgress = projectProgress(project)
  const disabledReason = assignDisabledReason(project, selectedRole)
  const canAssignSelectedRole = canAssignProjectRole(project, selectedRole)
  const breachPenalty = Math.round(project.amount * PROJECT_BREACH_PENALTY_RATE)
  const breachPenaltyPercent = Math.round(PROJECT_BREACH_PENALTY_RATE * 100)
  const breachAvailable = canBreachProject(project)
  const clientProfile = project.clientProfile
  const clientStats = clientProfile
    ? [
        { label: '客情', value: clientProfile.relationship },
        { label: '预算', value: clientProfile.budgetLevel },
        { label: '需求', value: clientProfile.requirementChaos },
        { label: '脾气', value: clientProfile.temper },
        { label: '信任', value: clientProfile.trust },
      ]
    : []
  const projectPendingClientEvents = pendingProjectClientEvents.filter((event) => event.projectId === project.id)
  const recentProjectEvents = events
    .filter((event) => event.relatedEntityId === project.id)
    .slice(-6)
    .reverse()

  const filteredEmployees = useMemo(() => {
    // 员工筛选受离职状态、空闲状态和岗位能力影响；它只决定右侧列表展示，不直接改变员工、项目或合同数据。
    return employees
      .filter((employee) => employee.status !== 'fired')
      .filter((employee) => employeeMatchesAvailability(employee, availabilityFilter))
      .filter((employee) => employeeMatchesRole(employee, roleFilter))
      .sort((left, right) => {
        // 排序会把空闲员工放在上面，同组内优先展示当前选中岗位能力更高的人，帮助玩家更快做分配决策。
        const idleDiff = Number(isEmployeeIdle(right)) - Number(isEmployeeIdle(left))
        if (idleDiff !== 0) {
          return idleDiff
        }

        const roleScoreDiff = employeeRoleScore(right, selectedRole) - employeeRoleScore(left, selectedRole)
        if (roleScoreDiff !== 0) {
          return roleScoreDiff
        }

        return right.satisfaction - left.satisfaction
      })
  }, [availabilityFilter, employees, roleFilter, selectedRole])

  function assignEmployee(employeeId: string) {
    if (!canAssignSelectedRole) {
      return
    }

    // 点击员工会按当前岗位和投入方式写入项目分配；这会影响员工当前分配、后续安排，以及项目后续进度推进。
    assignEmployeeToProject(employeeId, project.id, selectedRole, selectedMode)
  }

  function confirmBreachProject() {
    if (!breachAvailable) {
      return
    }

    // 毁约会扣除项目金额 30% 的违约金，并释放当前项目员工、取消后续投入该项目的安排。
    breachProjectContract(project.id)
    setConfirmingBreach(false)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={button}>
            详情
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[min(calc(100vw-32px),1400px)]">
        <DialogTitle>{project.title}</DialogTitle>
        <DialogDescription>
          {project.clientName} · {projectStatusLabels[project.status]} · 当前阶段 {phaseLabels[project.currentPhase]}
        </DialogDescription>

        <div className="grid min-h-[640px] grid-cols-[minmax(320px,0.85fr)_minmax(520px,1.15fr)] gap-4 max-[980px]:grid-cols-1">
          <section className="min-w-0 rounded-md border border-[#303834] bg-[rgba(12,15,15,0.42)] p-4">
            <div className="grid gap-3">
              <dl className="m-0 grid grid-cols-2 gap-2 text-[13px] text-[#d8cfbb]">
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">项目金额</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{money(project.amount)}</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">延期违约金</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{money(project.dailyPenalty)}/天</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">截止日期</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">第 {project.deadlineDay} 天</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">延期天数</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{project.overdueDays} 天</dd>
                </div>
              </dl>

              {clientProfile && (
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <strong className="text-sm text-[#efe2c8]">甲方属性</strong>
                    <span className="text-xs text-[#9aa29a]">影响金额、周期、罚金、需求和推进效率</span>
                  </div>
                  <dl className="m-0 grid grid-cols-5 gap-2 text-center text-xs max-[560px]:grid-cols-3">
                    {clientStats.map((stat) => (
                      <div key={stat.label} className="rounded border border-[#303834] bg-[#101413] px-2 py-1.5">
                        <dt className="text-[#9aa29a]">{stat.label}</dt>
                        <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm text-[#efe2c8]">项目事件</strong>
                  <span className="text-xs font-extrabold text-[#aeb5ac]">
                    待处理 {projectPendingClientEvents.length} · 历史 {recentProjectEvents.length}
                  </span>
                </div>
                {projectPendingClientEvents.length === 0 && recentProjectEvents.length === 0 ? (
                  <p className={cn(emptyState, 'm-0 p-3 text-xs')}>暂无项目事件。</p>
                ) : (
                  <div className="grid gap-2.5">
                    {projectPendingClientEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn('rounded-md border-l-4 bg-[rgba(12,15,15,0.72)] px-3 py-3', eventBorderToneClass[event.severity])}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="m-0 text-xs font-extrabold text-[#d5c4a1]">第 {event.triggeredDay} 天 · 待处理</p>
                            <h3 className="m-0 mt-1 text-sm text-[#efe2c8]">{event.title}</h3>
                          </div>
                          <span className="rounded border border-[#4b514d] bg-[#202625] px-2 py-1 text-xs font-extrabold text-[#aeb5ac]">
                            甲方事件
                          </span>
                        </div>
                        <p className="mb-3 mt-2 text-xs leading-5 text-[#c9c1ad]">{event.description}</p>
                        <div className="grid gap-2">
                          {event.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className={cn(button, 'min-h-11 justify-start whitespace-normal bg-[#1b201f] px-3 py-2 text-left text-[#efe2c8]')}
                              onClick={() => {
                                // 在项目详情内处理事件，会立即结算该选项对项目、甲方信任和项目成员状态的影响。
                                resolveProjectClientEvent(event.id, option.id)
                              }}
                            >
                              <span className="grid gap-1">
                                <strong>{option.label}</strong>
                                <small className="font-medium leading-5 text-[#aeb5ac]">{option.description}</small>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {recentProjectEvents.length > 0 && (
                      <ol className="m-0 grid list-none gap-2 p-0">
                        {recentProjectEvents.map((event) => (
                          <li
                            key={event.id}
                            className={cn('rounded-md border-l-4 bg-[rgba(12,15,15,0.5)] px-3 py-2.5', eventBorderToneClass[event.severity])}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <strong className="text-sm text-[#efe2c8]">{event.title}</strong>
                              <span className="text-xs font-extrabold text-[#aeb5ac]">
                                第 {event.day} 天 {formatTime(event.minute)}
                              </span>
                            </div>
                            <p className="mb-0 mt-1 text-xs leading-5 text-[#aeb5ac]">{event.message}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>

              {project.status === 'available' && (
                <div className="rounded-md border border-[#4b514d] bg-[#171c1b] p-3 text-sm text-[#d8cfbb]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong className="block text-[#efe2c8]">签约后配置项目人员</strong>
                      <span className="text-xs text-[#aeb5ac]">
                        签约会把项目状态改为已签约，并允许在本详情页继续安排岗位人员。
                      </span>
                    </div>
                    <button type="button" className={button} onClick={() => acceptProjectContract(project.id)}>
                      签约
                    </button>
                  </div>
                </div>
              )}

              {breachAvailable && (
                <div className="rounded-md border border-[#5a352f] bg-[#241717] p-3 text-sm text-[#d8cfbb]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong className="block text-[#ffb0a3]">毁约赔偿</strong>
                      <span className="text-xs text-[#d8cfbb]">
                        项目金额 {breachPenaltyPercent}% · {money(breachPenalty)}
                      </span>
                    </div>
                    {!confirmingBreach ? (
                      <button
                        type="button"
                        className={cn(button, 'border-[#7c3a31] bg-[#4a201b] text-[#ffe5df] hover:bg-[#5a2a23]')}
                        onClick={() => setConfirmingBreach(true)}
                      >
                        毁约
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={cn(button, 'border-[#7c3a31] bg-[#4a201b] text-[#ffe5df] hover:bg-[#5a2a23]')}
                          onClick={confirmBreachProject}
                        >
                          确认毁约
                        </button>
                        <button type="button" className={button} onClick={() => setConfirmingBreach(false)}>
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong className="text-[#efe2c8]">总进度</strong>
                  <span className="font-extrabold text-[#d8cfbb]">{totalProgress}%</span>
                </div>
                <div className={progressTrack}>
                  <i
                    className={cn(progressFill, progressToneClass[progressTone(totalProgress)])}
                    style={{ width: `${totalProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                {projectTracks.map((track) => {
                  const assignedCount = project.assignedEmployees[track]?.length ?? 0
                  const pendingCount = employees.filter((employee) =>
                    employee.pendingAssignment?.type === 'project' &&
                    employee.pendingAssignment.id === project.id &&
                    employee.pendingAssignment.role === track,
                  ).length
                  const requirement = project.requirements.find((item) => item.role === track)
                  const progress = Math.round(project.phaseProgress[track])

                  return (
                    <button
                      key={track}
                      type="button"
                      className={cn(
                        'grid gap-2 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-left text-[#d8cfbb]',
                        selectedRole === track && 'border-[#b59d65] bg-[#2d2a22]',
                        isCurrentPhaseRole(project, track) && 'shadow-[inset_4px_0_0_#b59d65]',
                      )}
                      onClick={() => setSelectedRole(track)}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <strong className="text-[#efe2c8]">{roleLabels[track]}</strong>
                        <em className="not-italic">{progress}%</em>
                      </span>
                      <span className={progressTrack}>
                        <i
                          className={cn(progressFill, progressToneClass[progressTone(progress)])}
                          style={{ width: `${progress}%` }}
                        />
                      </span>
                      <span className="text-xs text-[#aeb5ac]">
                        当前 {assignedCount} 人 / 待投入 {pendingCount} 人 / 建议 {requirement?.headcount ?? 0} 人
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
            <div className="rounded-md border border-[#303834] bg-[rgba(12,15,15,0.42)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <SelectField
                  label="分配岗位"
                  value={selectedRole}
                  options={roleOptions}
                  onValueChange={setSelectedRole}
                />
                <SelectField
                  label="投入方式"
                  value={selectedMode}
                  options={assignmentModeOptions}
                  onValueChange={setSelectedMode}
                />
                <SelectField
                  label="岗位筛选"
                  value={roleFilter}
                  options={roleFilterOptions}
                  onValueChange={setRoleFilter}
                />
                <SelectField
                  label="空闲筛选"
                  value={availabilityFilter}
                  options={availabilityFilterOptions}
                  onValueChange={setAvailabilityFilter}
                />
              </div>
              {disabledReason && (
                <p className={cn('mb-0 mt-3 text-xs font-extrabold', riskToneClass.danger)}>
                  {disabledReason}
                </p>
              )}
            </div>

            <div className="min-h-0 overflow-auto rounded-md border border-[#303834] bg-[rgba(12,15,15,0.42)] p-3">
              {filteredEmployees.length === 0 ? (
                <p className={emptyState}>没有符合筛选条件的员工。</p>
              ) : (
                <div className="grid gap-2">
                  {filteredEmployees.map((employee) => {
                    const ability = roleAbility(employee, selectedRole)
                    const employeeIdle = isEmployeeIdle(employee)
                    const cannotAssign = !canAssignSelectedRole

                    return (
                      <button
                        key={employee.id}
                        type="button"
                        className={cn(
                          'grid gap-2 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-left text-[#d8cfbb]',
                          employeeIdle && 'border-[#56684d] bg-[#1d251d]',
                          cannotAssign
                            ? 'cursor-not-allowed opacity-60'
                            : 'cursor-pointer hover:border-[#b59d65] hover:bg-[#242a28] focus-visible:border-[#b59d65] focus-visible:outline-none',
                        )}
                        disabled={cannotAssign}
                        onClick={() => assignEmployee(employee.id)}
                      >
                        <span className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                          <strong className="truncate text-[#efe2c8]">{employee.nickname || employee.name}</strong>
                          <span className={cn('text-xs font-extrabold', employeeIdle ? 'text-[#92d16e]' : 'text-[#e4b45b]')}>
                            {employeeIdle ? '空闲' : '忙碌'}
                          </span>
                        </span>
                        <span className="grid gap-1 text-xs text-[#aeb5ac]">
                          <span>当前：{assignmentText(employee, laborContracts, projectContracts)}</span>
                          <span>后续：{pendingAssignmentText(employee, laborContracts, projectContracts)}</span>
                          <span>简历：{skillClaimsText(employee.resumeSkills)}</span>
                        </span>
                        <span className="flex flex-wrap gap-2 text-xs font-extrabold text-[#d8cfbb]">
                          <span>{roleLabels[selectedRole]}能力 {ability}</span>
                          <span>满意度 {employee.satisfaction}</span>
                          <span>日薪 {money(employee.salaryPerDay)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
