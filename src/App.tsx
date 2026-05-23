import { useEffect, useMemo, useState, type ReactNode } from 'react'

import type {
  Employee,
  FinanceRecord,
  LaborContract,
  ProjectContract,
  ProjectPhase,
  ProjectStatus,
  ProjectWorkTrack,
  SkillRole,
  WorkHour,
} from './game/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog'
import { useGameStore } from './store/gameStore'
import './App.css'

const workHours: WorkHour[] = [18, 19, 20, 21, 22, 23, 24]
const skillRoles: SkillRole[] = ['product', 'design', 'frontend', 'backend', 'testing']
const projectTracks: ProjectWorkTrack[] = ['product', 'design', 'frontend', 'backend', 'testing']

const roleLabels: Record<SkillRole, string> = {
  product: '产品',
  design: '设计',
  frontend: '前端',
  backend: '后端',
  testing: '测试',
}

const phaseLabels: Record<ProjectPhase, string> = {
  product: '产品',
  design: '设计',
  development: '开发',
  testing: '测试',
}

const projectStatusLabels: Record<ProjectStatus, string> = {
  available: '可签约',
  accepted: '已签约',
  active: '进行中',
  overdue: '延期中',
  completed: '已完成',
}

const schoolLabels = {
  normal: '普本',
  '211': '211',
  '985': '985',
  qs100: 'QS100',
}

const employeeStatusLabels = {
  idle: '空闲',
  working: '工作中',
  slacking: '摸鱼',
  fired: '已离职',
}

const laborStatusLabels = {
  available: '可签约',
  accepted: '已签约',
  active: '驻场中',
  warning: '预警',
  completed: '已完成',
  terminated: '已终止',
}

const urgencyLabels = {
  urgent: '急召',
  normal: '普通',
}

function formatTime(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function money(value: number): string {
  return `￥${value.toLocaleString('zh-CN')}`
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function clampNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function skillClaimsText(skills: { role: SkillRole; level: string }[]): string {
  return skills.map((skill) => `${roleLabels[skill.role]} ${skill.level}`).join('、')
}

function abilitiesText(employee: Employee): string {
  return skillRoles
    .map((role) => `${roleLabels[role]} ${employee.realSkillAbilities[role] ?? 0}`)
    .join(' / ')
}

function assignmentText(
  employee: Employee,
  laborContracts: LaborContract[],
  projectContracts: ProjectContract[],
): string {
  if (!employee.assignedTo) {
    return '未分配'
  }
  if (employee.assignedTo.type === 'labor') {
    const contract = laborContracts.find((item) => item.id === employee.assignedTo?.id)
    return contract ? `人力：${contract.title}` : '人力：未知合同'
  }
  const project = projectContracts.find((item) => item.id === employee.assignedTo?.id)
  return project
    ? `项目：${project.title}（${roleLabels[employee.assignedTo.role ?? 'product']}）`
    : '项目：未知项目'
}

function recordRows(records: FinanceRecord[]) {
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

function GameClock() {
  useEffect(() => {
    let lastTickAt = performance.now()
    const intervalId = window.setInterval(() => {
      const now = performance.now()
      const realDeltaMs = Math.min(now - lastTickAt, 1000)
      lastTickAt = now
      const state = useGameStore.getState()
      if (state.time.speed === 0 || state.time.paused) {
        return
      }
      state.tick(realDeltaMs)
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [])

  return null
}

function TopBar() {
  const day = useGameStore((state) => state.time.day)
  const minuteOfDay = useGameStore((state) => state.time.minuteOfDay)
  const speed = useGameStore((state) => state.time.speed)
  const moneyValue = useGameStore((state) => state.money)
  const offWorkHour = useGameStore((state) => state.settings.offWorkHour)
  const mailbox = useGameStore((state) => state.mailbox)
  const resetGame = useGameStore((state) => state.resetGame)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const setOffWorkHour = useGameStore((state) => state.setOffWorkHour)
  const tick = useGameStore((state) => state.tick)

  const unreadCount = mailbox.filter((mail) => !mail.read).length
  const remainingMinutes = Math.max(0, offWorkHour * 60 - minuteOfDay)

  function advanceToOffWork() {
    for (let index = 0; index < remainingMinutes; index += 1) {
      tick(2000)
    }
  }

  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">外包公司模拟器 · 内核测试面板</p>
        <h1>第 {day} 天 {formatTime(minuteOfDay)}</h1>
      </div>
      <div className="stats-row">
        <span>现金 {money(moneyValue)}</span>
        <span>速度 {speed === 0 ? '暂停' : `${speed}x`}</span>
        <span>下班 {offWorkHour}:00</span>
        <span>未读邮件 {unreadCount}</span>
      </div>
      <div className="toolbar">
        <button type="button" onClick={resetGame}>重开</button>
        <button type="button" onClick={() => setSpeed(0)}>暂停</button>
        <button type="button" onClick={() => setSpeed(1)}>1x</button>
        <button type="button" onClick={() => setSpeed(2)}>2x</button>
        <label>
          下班
          <select
            name="offWorkHour"
            value={offWorkHour}
            onChange={(event) => setOffWorkHour(Number(event.target.value) as WorkHour)}
          >
            {workHours.map((hour) => (
              <option key={hour} value={hour}>{hour}:00</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => tick(2000)}>推进 1 分钟</button>
        <button type="button" onClick={() => tick(60 * 2000)}>推进 60 分钟</button>
        <button type="button" onClick={advanceToOffWork} disabled={remainingMinutes === 0}>
          推进到下班
        </button>
      </div>
    </header>
  )
}

function RecruitingPanel() {
  const resumes = useGameStore((state) => state.resumes)
  const market = useGameStore((state) => state.market)
  const refreshResumes = useGameStore((state) => state.refreshResumes)
  const sendOffer = useGameStore((state) => state.sendOffer)
  const [forms, setForms] = useState<Record<string, { salary: string; social: string }>>({})

  function updateForm(resumeId: string, patch: Partial<{ salary: string; social: string }>) {
    setForms((current) => ({
      ...current,
      [resumeId]: {
        salary: current[resumeId]?.salary ?? '',
        social: current[resumeId]?.social ?? '100',
        ...patch,
      },
    }))
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">招聘</p>
          <h2>简历市场</h2>
        </div>
        <div className="inline-actions">
          <span>{market.resumeRefreshesUsed}/{market.resumeRefreshLimit} 次</span>
          <button type="button" onClick={refreshResumes}>刷新简历</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>候选人</th>
              <th>背景</th>
              <th>技能</th>
              <th>期望日薪</th>
              <th>简介</th>
              <th>Offer</th>
            </tr>
          </thead>
          <tbody>
            {resumes.map((resume) => {
              const form = forms[resume.id]
              const salary = form?.salary || String(resume.expectedSalaryPerDay)
              const social = form?.social || '100'
              return (
                <tr key={resume.id}>
                  <td>{resume.name}</td>
                  <td>{schoolLabels[resume.school]} · {resume.workYears} 年</td>
                  <td>{skillClaimsText(resume.resumeSkills)}</td>
                  <td>{money(resume.expectedSalaryPerDay)}</td>
                  <td>{resume.introduction}</td>
                  <td>
                    <div className="form-grid">
                      <input
                        aria-label={`${resume.name} offer 日薪`}
                        name={`offer-salary-${resume.id}`}
                        type="number"
                        value={salary}
                        min={0}
                        onChange={(event) => updateForm(resume.id, { salary: event.target.value })}
                      />
                      <input
                        aria-label={`${resume.name} 社保比例`}
                        name={`offer-social-${resume.id}`}
                        type="number"
                        value={social}
                        min={0}
                        max={100}
                        onChange={(event) => updateForm(resume.id, { social: event.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          sendOffer(
                            resume.id,
                            clampNumber(salary, resume.expectedSalaryPerDay),
                            clampNumber(social, 100) / 100,
                          )
                        }
                      >
                        发 Offer
                      </button>
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

function EmployeePanel() {
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const renameEmployee = useGameStore((state) => state.renameEmployee)
  const fireEmployee = useGameStore((state) => state.fireEmployee)
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [compensations, setCompensations] = useState<Record<string, string>>({})

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">员工</p>
          <h2>员工列表</h2>
        </div>
        <span>{employees.length} 人</span>
      </div>
      {employees.length === 0 ? (
        <p className="empty-state">暂无员工，先从简历市场发 offer。</p>
      ) : (
        <div className="table-wrap">
          <table>
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
                    <div className="form-grid">
                      <input
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
                        onClick={() => renameEmployee(employee.id, nicknames[employee.id] || employee.name)}
                      >
                        改名
                      </button>
                      <input
                        aria-label={`${employee.name} 赔偿系数`}
                        name={`employee-compensation-${employee.id}`}
                        type="number"
                        value={compensations[employee.id] ?? '1'}
                        step="0.1"
                        min="0"
                        max="2"
                        onChange={(event) =>
                          setCompensations((current) => ({
                            ...current,
                            [employee.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
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

function LaborPanel() {
  const laborContracts = useGameStore((state) => state.laborContracts)
  const employees = useGameStore((state) => state.employees)
  const acceptLaborContract = useGameStore((state) => state.acceptLaborContract)
  const assignEmployeeToLabor = useGameStore((state) => state.assignEmployeeToLabor)
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const availableEmployees = employees.filter((employee) => employee.status !== 'fired' && !employee.assignedTo)

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">人力外包</p>
          <h2>驻场合同</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
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
                  <td>{assigned?.nickname || assigned?.name || '未分配'}</td>
                  <td>
                    {contract.status === 'available' ? (
                      <button type="button" onClick={() => acceptLaborContract(contract.id)}>签约</button>
                    ) : (
                      <div className="form-grid">
                        <select
                          name={`labor-assignment-${contract.id}`}
                          value={assignments[contract.id] ?? ''}
                          onChange={(event) =>
                            setAssignments((current) => ({
                              ...current,
                              [contract.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">选择员工</option>
                          {availableEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.nickname || employee.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!assignments[contract.id]}
                          onClick={() => assignEmployeeToLabor(assignments[contract.id] ?? '', contract.id)}
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

function ProjectPanel() {
  const projectContracts = useGameStore((state) => state.projectContracts)
  const employees = useGameStore((state) => state.employees)
  const acceptProjectContract = useGameStore((state) => state.acceptProjectContract)
  const assignEmployeeToProject = useGameStore((state) => state.assignEmployeeToProject)
  const [assignments, setAssignments] = useState<
    Record<string, { employeeId: string; role: SkillRole }>
  >({})
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
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">项目外包</p>
          <h2>项目合同</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
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
                    <div className="progress-list">
                      {projectTracks.map((track) => (
                        <span key={track}>
                          {roleLabels[track]} {Math.round(project.phaseProgress[track])}%
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="progress-list">
                      {skillRoles.map((role) => (
                        <span key={role}>
                          {roleLabels[role]} {(project.assignedEmployees[role] ?? []).length} 人
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {project.status === 'available' ? (
                      <button type="button" onClick={() => acceptProjectContract(project.id)}>签约</button>
                    ) : (
                      <div className="form-grid">
                        <select
                          name={`project-employee-${project.id}`}
                          value={assignment.employeeId}
                          onChange={(event) =>
                            updateAssignment(project.id, { employeeId: event.target.value })
                          }
                        >
                          <option value="">选择员工</option>
                          {availableEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.nickname || employee.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name={`project-role-${project.id}`}
                          value={assignment.role}
                          onChange={(event) =>
                            updateAssignment(project.id, { role: event.target.value as SkillRole })
                          }
                        >
                          {skillRoles.map((role) => (
                            <option key={role} value={role}>{roleLabels[role]}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!assignment.employeeId || project.status === 'completed'}
                          onClick={() =>
                            assignEmployeeToProject(assignment.employeeId, project.id, assignment.role)
                          }
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

function MailPanel() {
  const mailbox = useGameStore((state) => state.mailbox)
  const markMailRead = useGameStore((state) => state.markMailRead)
  const markAllMailRead = useGameStore((state) => state.markAllMailRead)
  const recentMail = useMemo(() => mailbox.slice(-12).reverse(), [mailbox])

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">邮件</p>
          <h2>邮箱通知</h2>
        </div>
        <button type="button" onClick={markAllMailRead}>全部已读</button>
      </div>
      {recentMail.length === 0 ? (
        <p className="empty-state">暂无邮件。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>发件方</th>
                <th>主题</th>
                <th>类型</th>
                <th>状态</th>
                <th>正文</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {recentMail.map((mail) => (
                <tr key={mail.id} className={mail.read ? undefined : 'unread-row'}>
                  <td>第 {mail.day} 天 {formatTime(mail.minute)}</td>
                  <td>{mail.from}</td>
                  <td>{mail.subject}</td>
                  <td>{mail.type}</td>
                  <td>{mail.read ? '已读' : '未读'}</td>
                  <td>{mail.body}</td>
                  <td>
                    <button type="button" disabled={mail.read} onClick={() => markMailRead(mail.id)}>
                      已读
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

function FinanceReportPanel() {
  const report = useGameStore((state) => state.getYesterdayFinanceReport())

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">财务</p>
          <h2>昨日财务报表</h2>
        </div>
      </div>
      {!report ? (
        <p className="empty-state">还没有昨日财务报表。推进到下班后会自动生成。</p>
      ) : (
        <div className="report-grid">
          <div className="metric"><span>收入</span><strong>{money(report.incomeTotal)}</strong></div>
          <div className="metric"><span>支出</span><strong>{money(report.expenseTotal)}</strong></div>
          <div className="metric"><span>净利润</span><strong>{money(report.net)}</strong></div>
          <div>
            <h3>收入明细</h3>
            {recordRows(report.incomeRecords)}
          </div>
          <div>
            <h3>支出明细</h3>
            {recordRows(report.expenseRecords)}
          </div>
        </div>
      )}
    </section>
  )
}

function EventPanel() {
  const events = useGameStore((state) => state.events)
  const recentEvents = useMemo(() => events.slice(-16).reverse(), [events])

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">事件</p>
          <h2>最近事件</h2>
        </div>
      </div>
      {recentEvents.length === 0 ? (
        <p className="empty-state">暂无事件。</p>
      ) : (
        <ol className="event-list">
          {recentEvents.map((event) => (
            <li key={event.id} className={`event-${event.severity}`}>
              <span>第 {event.day} 天 {formatTime(event.minute)}</span>
              <strong>{event.title}</strong>
              <p>{event.message}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

interface SystemDialogProps {
  title: string
  eyebrow: string
  metric: string
  status: string
  children: ReactNode
}

function SystemDialog({ title, eyebrow, metric, status, children }: SystemDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="system-card">
          <span>{eyebrow}</span>
          <strong>{title}</strong>
          <small>{metric}</small>
          <em>{status}</em>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{status}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function SystemLauncherGrid() {
  const resumes = useGameStore((state) => state.resumes)
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const mailbox = useGameStore((state) => state.mailbox)
  const events = useGameStore((state) => state.events)
  const report = useGameStore((state) => state.getYesterdayFinanceReport())
  const availableLabor = laborContracts.filter((contract) => contract.status === 'available').length
  const activeLabor = laborContracts.filter((contract) =>
    ['accepted', 'active', 'warning'].includes(contract.status),
  ).length
  const availableProjects = projectContracts.filter((project) => project.status === 'available').length
  const activeProjects = projectContracts.filter((project) =>
    ['accepted', 'active', 'overdue'].includes(project.status),
  ).length
  const unreadMail = mailbox.filter((mail) => !mail.read).length

  return (
    <section className="systems-board">
      <div className="systems-header">
        <p className="eyebrow">系统</p>
        <h2>测试入口</h2>
      </div>
      <div className="systems-grid">
        <SystemDialog
          eyebrow="招聘"
          title="简历市场"
          metric={`${resumes.length} 份简历`}
          status="刷新简历、发 offer"
        >
          <RecruitingPanel />
        </SystemDialog>
        <SystemDialog
          eyebrow="员工"
          title="员工列表"
          metric={`${employees.length} 人`}
          status="改花名、辞退、看隐藏能力"
        >
          <EmployeePanel />
        </SystemDialog>
        <SystemDialog
          eyebrow="人力"
          title="驻场合同"
          metric={`${availableLabor} 可签 / ${activeLabor} 已签`}
          status="签约、分配驻场员工"
        >
          <LaborPanel />
        </SystemDialog>
        <SystemDialog
          eyebrow="项目"
          title="项目合同"
          metric={`${availableProjects} 可签 / ${activeProjects} 进行中`}
          status="签项目、分配岗位"
        >
          <ProjectPanel />
        </SystemDialog>
        <SystemDialog
          eyebrow="财务"
          title="昨日财报"
          metric={report ? money(report.net) : '未生成'}
          status="收入、支出、净利润"
        >
          <FinanceReportPanel />
        </SystemDialog>
        <SystemDialog
          eyebrow="邮件"
          title="邮箱通知"
          metric={`${unreadMail} 未读`}
          status="合同、违约、仲裁、财报"
        >
          <MailPanel />
        </SystemDialog>
        <SystemDialog
          eyebrow="事件"
          title="最近事件"
          metric={`${events.length} 条`}
          status="查看系统触发结果"
        >
          <EventPanel />
        </SystemDialog>
      </div>
    </section>
  )
}

function App() {
  return (
    <main className="app-shell">
      <GameClock />
      <TopBar />
      <SystemLauncherGrid />
    </main>
  )
}

export default App
