import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'

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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog'
import { parseGameSaveFileJson } from './game/save'
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

type AppView = 'home' | 'game'

interface ImportedSave {
  id: string
  fileName: string
  json: string
  savedAt: string
  day: number
  money: number
}

interface VisualSettings {
  density: 'compact' | 'comfortable'
  theme: 'system' | 'light' | 'dark'
  motion: 'standard' | 'reduced'
  volume: number
}

function formatTime(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatSaveDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function money(value: number): string {
  return `￥${value.toLocaleString('zh-CN')}`
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${money(value)}`
}

function average(values: number[], fallback: number): number {
  if (values.length === 0) {
    return fallback
  }

  return values.reduce((total, value) => total + value, 0) / values.length
}

function projectProgress(project: ProjectContract): number {
  return Math.round(
    average(
      projectTracks.map((track) => project.phaseProgress[track] ?? 0),
      0,
    ),
  )
}

function projectRisk(project: ProjectContract, day: number): { label: string; tone: 'danger' | 'warning' | 'success' } {
  if (project.status === 'overdue' || project.deadlineDay <= day) {
    return { label: '延期风险：高', tone: 'danger' }
  }
  if (project.deadlineDay - day <= 1) {
    return { label: '延期风险：中', tone: 'warning' }
  }
  return { label: '延期风险：低', tone: 'success' }
}

function progressTone(value: number): 'danger' | 'warning' | 'success' {
  if (value >= 75) {
    return 'success'
  }
  if (value >= 45) {
    return 'warning'
  }
  return 'danger'
}

function eventIcon(type: string): string {
  const icons: Record<string, string> = {
    finance: '$',
    recruiting: '+',
    contract: '#',
    project: 'P',
    employee: '@',
    warning: '!',
  }

  return icons[type] ?? 'i'
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

interface DashboardSettingsPanelProps {
  visualSettings: VisualSettings
  onOpenHome: () => void
  onUpdateVisualSettings: (patch: Partial<VisualSettings>) => void
}

function DashboardSettingsPanel({
  visualSettings,
  onOpenHome,
  onUpdateVisualSettings,
}: DashboardSettingsPanelProps) {
  const offWorkHour = useGameStore((state) => state.settings.offWorkHour)
  const setOffWorkHour = useGameStore((state) => state.setOffWorkHour)
  const resetGame = useGameStore((state) => state.resetGame)
  const tick = useGameStore((state) => state.tick)
  const exportSaveJson = useGameStore((state) => state.exportSaveJson)
  const getSaveFileName = useGameStore((state) => state.getSaveFileName)
  const loadSaveJson = useGameStore((state) => state.loadSaveJson)
  const saveInputRef = useRef<HTMLInputElement>(null)
  const [saveStatus, setSaveStatus] = useState('')

  function downloadSave() {
    const saveJson = exportSaveJson()
    const fileName = getSaveFileName()
    const blob = new Blob([saveJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setSaveStatus(`已保存 ${fileName}`)
  }

  async function loadSave(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      loadSaveJson(await file.text())
      setSaveStatus(`已读取 ${file.name}`)
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : '读取存档失败')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <section className="panel dashboard-settings-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">系统</p>
          <h2>设置</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onOpenHome}>
          返回主菜单
        </button>
      </div>
      <div className="settings-grid">
        <label>
          下班时间
          <select
            name="dashboard-off-work-hour"
            value={offWorkHour}
            onChange={(event) => setOffWorkHour(Number(event.target.value) as WorkHour)}
          >
            {workHours.map((hour) => (
              <option key={hour} value={hour}>{hour}:00</option>
            ))}
          </select>
        </label>
        <label>
          界面密度
          <select
            name="dashboard-visual-density"
            value={visualSettings.density}
            onChange={(event) =>
              onUpdateVisualSettings({ density: event.target.value as VisualSettings['density'] })
            }
          >
            <option value="compact">紧凑</option>
            <option value="comfortable">舒展</option>
          </select>
        </label>
        <label>
          主题模式
          <select
            name="dashboard-visual-theme"
            value={visualSettings.theme}
            onChange={(event) =>
              onUpdateVisualSettings({ theme: event.target.value as VisualSettings['theme'] })
            }
          >
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>
        <label>
          音量 {visualSettings.volume}
          <input
            className="range-input"
            name="dashboard-visual-volume"
            type="range"
            min="0"
            max="100"
            value={visualSettings.volume}
            onChange={(event) => onUpdateVisualSettings({ volume: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="dashboard-settings-actions">
        <button type="button" onClick={() => tick(2000)}>推进 1 分钟</button>
        <button type="button" onClick={() => tick(60 * 2000)}>推进 60 分钟</button>
        <button type="button" onClick={downloadSave}>保存 JSON</button>
        <button type="button" onClick={() => saveInputRef.current?.click()}>读取 JSON</button>
        <button type="button" onClick={resetGame}>重开</button>
        <input
          ref={saveInputRef}
          aria-label="选择 JSON 存档"
          className="sr-only"
          type="file"
          accept=".json,.companysim,application/json"
          onChange={loadSave}
        />
      </div>
      {saveStatus ? <span className="save-status" role="status">{saveStatus}</span> : null}
    </section>
  )
}

interface DockDialogProps {
  icon: string
  label: string
  badge?: number
  title: string
  description: string
  children: ReactNode
}

function DockDialog({ icon, label, badge, title, description, children }: DockDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="dock-button">
          <span className="dock-icon">{icon}</span>
          <span>{label}</span>
          {badge ? <em>{badge}</em> : null}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}

interface GameDashboardProps {
  visualSettings: VisualSettings
  onOpenHome: () => void
  onUpdateVisualSettings: (patch: Partial<VisualSettings>) => void
}

function GameDashboard({ visualSettings, onOpenHome, onUpdateVisualSettings }: GameDashboardProps) {
  const time = useGameStore((state) => state.time)
  const settings = useGameStore((state) => state.settings)
  const moneyValue = useGameStore((state) => state.money)
  const employees = useGameStore((state) => state.employees)
  const resumes = useGameStore((state) => state.resumes)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const events = useGameStore((state) => state.events)
  const financeRecords = useGameStore((state) => state.financeRecords)
  const mailbox = useGameStore((state) => state.mailbox)
  const setSpeed = useGameStore((state) => state.setSpeed)

  const activeEmployees = employees.filter((employee) => employee.status !== 'fired')
  const workingEmployees = activeEmployees.filter((employee) => employee.status === 'working').length
  const slackingEmployees = activeEmployees.filter((employee) => employee.status === 'slacking').length
  const idleEmployees = activeEmployees.filter((employee) => employee.status === 'idle').length
  const satisfaction = Math.round(
    average(activeEmployees.map((employee) => employee.satisfaction), activeEmployees.length > 0 ? 0 : 72),
  )
  const incomeTotal = financeRecords
    .filter((record) => record.amount > 0)
    .reduce((total, record) => total + record.amount, 0)
  const expenseTotal = Math.abs(
    financeRecords
      .filter((record) => record.amount < 0)
      .reduce((total, record) => total + record.amount, 0),
  )
  const netTotal = incomeTotal - expenseTotal
  const burnRate = Math.round(expenseTotal / Math.max(1, time.day))
  const keyProjects = useMemo(
    () =>
      [...projectContracts]
        .sort((left, right) => {
          const leftActive = left.status === 'available' ? 1 : 0
          const rightActive = right.status === 'available' ? 1 : 0
          return leftActive - rightActive || left.deadlineDay - right.deadlineDay
        })
        .slice(0, 3),
    [projectContracts],
  )
  const todos = [
    { text: '处理未读邮件', meta: `${mailbox.filter((mail) => !mail.read).length} 封` },
    { text: '筛选候选人简历', meta: `${resumes.length} 份` },
    {
      text: '确认可签合同',
      meta: `${laborContracts.filter((contract) => contract.status === 'available').length} 人力`,
    },
  ]
  const morale = Math.max(0, Math.min(100, satisfaction))
  const efficiency = Math.round(
    activeEmployees.length > 0 ? ((workingEmployees + idleEmployees * 0.45) / activeEmployees.length) * 100 : 68,
  )
  const overtime = Math.max(10, Math.min(95, 25 + (settings.offWorkHour - 18) * 14))
  const stability = Math.round(
    employees.length > 0 ? (activeEmployees.length / employees.length) * 100 : 72,
  )
  const recentEvents = events.slice(-5).reverse()
  const alertMail = [...mailbox].reverse().find((mail) => !mail.read)
  const alertEvent = [...events].reverse().find((event) =>
    event.severity === 'danger' || event.severity === 'warning',
  )
  const alertText = alertMail?.subject ?? alertEvent?.title ?? '今日暂无紧急风险'
  const activeProjectCount = projectContracts.filter((project) =>
    ['accepted', 'active', 'overdue'].includes(project.status),
  ).length

  return (
    <main className="game-dashboard-shell">
      <header className="game-hud">
        <div className="company-plate">
          <div className="company-mark">M</div>
          <div>
            <h1>小马科技</h1>
            <p>Day {time.day} · {formatTime(time.minuteOfDay)}</p>
          </div>
          <div className="speed-controls" aria-label="时间速度">
            <button type="button" onClick={() => setSpeed(0)} className={time.speed === 0 ? 'is-active' : ''}>
              ||
            </button>
            <button type="button" onClick={() => setSpeed(1)} className={time.speed === 1 ? 'is-active' : ''}>
              &gt;
            </button>
            <button type="button" onClick={() => setSpeed(2)} className={time.speed === 2 ? 'is-active' : ''}>
              &gt;&gt;
            </button>
          </div>
        </div>
        <div className="hud-metrics" aria-label="经营指标">
          <div><span>现金流</span><strong className="amount-positive">{money(moneyValue)}</strong></div>
          <div><span>burn rate</span><strong className="amount-negative">-{money(burnRate)}/天</strong></div>
          <div><span>项目数</span><strong>{activeProjectCount}/{projectContracts.length}</strong></div>
          <div><span>员工数</span><strong>{activeEmployees.length}/15</strong></div>
          <div><span>公司满意度</span><strong>{percent(morale / 100)}</strong></div>
        </div>
        <div className="hud-shortcuts">
          <button type="button" aria-label="主菜单" onClick={onOpenHome}>MENU</button>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" aria-label="财务报表">FIN</button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="sr-only">财务报表</DialogTitle>
              <DialogDescription className="sr-only">查看昨日财务报表</DialogDescription>
              <FinanceReportPanel />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" aria-label="设置">SET</button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="sr-only">设置</DialogTitle>
              <DialogDescription className="sr-only">系统与视觉设置</DialogDescription>
              <DashboardSettingsPanel
                visualSettings={visualSettings}
                onOpenHome={onOpenHome}
                onUpdateVisualSettings={onUpdateVisualSettings}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="dashboard-grid">
        <aside className="dashboard-column left-column">
          <section className="hud-panel">
            <h2>项目</h2>
            <div className="project-stack">
              {keyProjects.map((project) => {
                const progress = projectProgress(project)
                const risk = projectRisk(project, time.day)
                return (
                  <article key={project.id} className="project-chip">
                    <div>
                      <strong>{project.title}</strong>
                      <span className={`risk-${risk.tone}`}>{risk.label}</span>
                    </div>
                    <div className="progress-track">
                      <i className={`progress-fill progress-${progressTone(progress)}`} style={{ width: `${progress}%` }} />
                    </div>
                    <small>{progress}%</small>
                  </article>
                )
              })}
            </div>
          </section>
          <section className="hud-panel">
            <h2>待办事项</h2>
            <ul className="todo-list">
              {todos.map((todo) => (
                <li key={todo.text}>
                  <span>{todo.text}</span>
                  <em>{todo.meta}</em>
                </li>
              ))}
            </ul>
          </section>
          <section className="hud-panel finance-panel">
            <h2>本月财务</h2>
            <dl>
              <div><dt>收入</dt><dd className="amount-positive">{money(incomeTotal)}</dd></div>
              <div><dt>支出</dt><dd className="amount-negative">-{money(expenseTotal)}</dd></div>
              <div><dt>净利润</dt><dd className={netTotal >= 0 ? 'amount-positive' : 'amount-negative'}>{signedMoney(netTotal)}</dd></div>
            </dl>
          </section>
          <section className="hud-panel">
            <h2>公司状态</h2>
            <div className="status-bars">
              <StatusBar label="团队士气" value={morale} />
              <StatusBar label="工作效率" value={efficiency} />
              <StatusBar label="加班强度" value={overtime} inverse />
              <StatusBar label="人员稳定性" value={stability} />
            </div>
          </section>
        </aside>

        <section className="office-scene-viewport" data-scene-root>
          <div className="scene-placeholder">
            <span>PixiJS Office Scene Placeholder</span>
            <strong>办公室舞台挂载点</strong>
            <small>后续 PixiJS 渲染层会接管该区域</small>
          </div>
        </section>

        <aside className="dashboard-column right-column">
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="alert-card">
                <span>!</span>
                <strong>{alertText}</strong>
                <em>查看</em>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="sr-only">提醒详情</DialogTitle>
              <DialogDescription className="sr-only">查看邮件和事件</DialogDescription>
              <MailPanel />
            </DialogContent>
          </Dialog>
          <section className="hud-panel event-panel">
            <div className="event-panel-header">
              <h2>事件日志</h2>
              <span>{events.length}</span>
            </div>
            {recentEvents.length === 0 ? (
              <p className="empty-state">暂无事件。</p>
            ) : (
              <ol className="dashboard-event-list">
                {recentEvents.map((event) => (
                  <li key={event.id}>
                    <span className={`event-token event-token-${event.severity}`}>{eventIcon(event.type)}</span>
                    <div>
                      <time>{formatTime(event.minute)}</time>
                      <strong>{event.title}</strong>
                      <p>{event.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      <nav className="bottom-dock" aria-label="模块导航">
        <DockDialog icon="EMP" label="员工" badge={activeEmployees.length} title="员工列表" description="管理员工">
          <EmployeePanel />
        </DockDialog>
        <DockDialog icon="REC" label="招聘" badge={resumes.length} title="简历市场" description="招聘候选人">
          <RecruitingPanel />
        </DockDialog>
        <DockDialog icon="PRJ" label="项目" badge={activeProjectCount} title="项目合同" description="项目外包">
          <ProjectPanel />
        </DockDialog>
        <DockDialog icon="FIN" label="财务" title="昨日财报" description="财务报表">
          <FinanceReportPanel />
        </DockDialog>
        <DockDialog icon="EVT" label="事件" badge={mailbox.filter((mail) => !mail.read).length} title="事件日志" description="查看事件">
          <EventPanel />
        </DockDialog>
        <DockDialog icon="CTR" label="合同" badge={laborContracts.length} title="驻场合同" description="人力外包合同">
          <LaborPanel />
        </DockDialog>
        <DockDialog icon="SET" label="设置" title="设置" description="系统与视觉设置">
          <DashboardSettingsPanel
            visualSettings={visualSettings}
            onOpenHome={onOpenHome}
            onUpdateVisualSettings={onUpdateVisualSettings}
          />
        </DockDialog>
      </nav>

      <div className="staff-status-strip" aria-label="员工状态概览">
        <span>工作中 {workingEmployees}</span>
        <span>摸鱼中 {slackingEmployees}</span>
        <span>待分配 {idleEmployees}</span>
      </div>
    </main>
  )
}

interface StatusBarProps {
  label: string
  value: number
  inverse?: boolean
}

function StatusBar({ label, value, inverse = false }: StatusBarProps) {
  const tone = inverse ? progressTone(100 - value) : progressTone(value)

  return (
    <div className="status-bar-row">
      <span>{label}</span>
      <div className="progress-track">
        <i className={`progress-fill progress-${tone}`} style={{ width: `${value}%` }} />
      </div>
      <em>{value}%</em>
    </div>
  )
}

interface HomePageProps {
  importedSaves: ImportedSave[]
  importStatus: string
  exitStatus: string
  visualSettings: VisualSettings
  onStartNewGame: () => void
  onImportSaves: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  onLoadImportedSave: (save: ImportedSave) => void
  onUpdateVisualSettings: (patch: Partial<VisualSettings>) => void
  onExit: () => void
}

function HomePage({
  importedSaves,
  importStatus,
  exitStatus,
  visualSettings,
  onStartNewGame,
  onImportSaves,
  onLoadImportedSave,
  onUpdateVisualSettings,
  onExit,
}: HomePageProps) {
  const day = useGameStore((state) => state.time.day)
  const moneyValue = useGameStore((state) => state.money)
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <section className="home-screen">
      <div className="home-panel home-menu-panel">
        <div className="home-brand">
          <p className="eyebrow">OA 运营工作台</p>
          <h1>外包公司模拟器</h1>
          <p className="home-subtitle">招聘 · 合同 · 财务 · 邮件</p>
        </div>
        <div className="home-actions" aria-label="主菜单">
          <button type="button" className="menu-action menu-action-primary" onClick={onStartNewGame}>
            开始新游戏
          </button>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="menu-action">
                继续游戏
              </button>
            </DialogTrigger>
            <DialogContent className="menu-dialog">
              <DialogTitle>继续游戏</DialogTitle>
              <DialogDescription className="dialog-description">
                已导入存档会显示在此列表中。
              </DialogDescription>
              <div className="save-import-row">
                <button type="button" onClick={() => fileInputRef.current?.click()}>
                  导入存档
                </button>
                <input
                  ref={fileInputRef}
                  aria-label="导入本地存档"
                  className="sr-only"
                  type="file"
                  multiple
                  accept=".json,.companysim,.companysim.json,application/json"
                  onChange={(event) => {
                    void onImportSaves(event)
                  }}
                />
                {importStatus ? <span className="save-status" role="status">{importStatus}</span> : null}
              </div>
              {importedSaves.length === 0 ? (
                <p className="empty-state">暂无已导入存档。</p>
              ) : (
                <div className="imported-save-list">
                  {importedSaves.map((save) => (
                    <button
                      key={save.id}
                      type="button"
                      className="imported-save-row"
                      onClick={() => onLoadImportedSave(save)}
                    >
                      <span>
                        <strong>{save.fileName}</strong>
                        <small>第 {save.day} 天 · {money(save.money)} · {formatSaveDate(save.savedAt)}</small>
                      </span>
                      <em>读取</em>
                    </button>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="menu-action">
                设置
              </button>
            </DialogTrigger>
            <DialogContent className="menu-dialog settings-dialog">
              <DialogTitle>设置</DialogTitle>
              <DialogDescription className="dialog-description">
                当前为视觉占位设置，不影响游戏结算。
              </DialogDescription>
              <div className="settings-grid">
                <label>
                  界面密度
                  <select
                    name="visual-density"
                    value={visualSettings.density}
                    onChange={(event) =>
                      onUpdateVisualSettings({
                        density: event.target.value as VisualSettings['density'],
                      })
                    }
                  >
                    <option value="compact">紧凑</option>
                    <option value="comfortable">舒展</option>
                  </select>
                </label>
                <label>
                  主题模式
                  <select
                    name="visual-theme"
                    value={visualSettings.theme}
                    onChange={(event) =>
                      onUpdateVisualSettings({
                        theme: event.target.value as VisualSettings['theme'],
                      })
                    }
                  >
                    <option value="system">跟随系统</option>
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                  </select>
                </label>
                <label>
                  动效
                  <select
                    name="visual-motion"
                    value={visualSettings.motion}
                    onChange={(event) =>
                      onUpdateVisualSettings({
                        motion: event.target.value as VisualSettings['motion'],
                      })
                    }
                  >
                    <option value="standard">标准</option>
                    <option value="reduced">减少</option>
                  </select>
                </label>
                <label>
                  音量 {visualSettings.volume}
                  <input
                    className="range-input"
                    name="visual-volume"
                    type="range"
                    min="0"
                    max="100"
                    value={visualSettings.volume}
                    onChange={(event) =>
                      onUpdateVisualSettings({
                        volume: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <div className="dialog-actions">
                <DialogClose asChild>
                  <button type="button">完成</button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          <button type="button" className="menu-action menu-action-danger" onClick={onExit}>
            退出
          </button>
        </div>
        {exitStatus ? <p className="menu-status" role="status">{exitStatus}</p> : null}
      </div>
      <aside className="home-panel home-overview-panel" aria-label="当前会话概览">
        <p className="eyebrow">当前会话</p>
        <h2>运营看板</h2>
        <dl className="home-status-list">
          <div>
            <dt>游戏日</dt>
            <dd>第 {day} 天</dd>
          </div>
          <div>
            <dt>现金</dt>
            <dd>{money(moneyValue)}</dd>
          </div>
          <div>
            <dt>员工</dt>
            <dd>{employees.length} 人</dd>
          </div>
          <div>
            <dt>合同</dt>
            <dd>{laborContracts.length + projectContracts.length} 个</dd>
          </div>
          <div>
            <dt>已导入存档</dt>
            <dd>{importedSaves.length} 个</dd>
          </div>
        </dl>
      </aside>
    </section>
  )
}

function App() {
  const [view, setView] = useState<AppView>('home')
  const [importedSaves, setImportedSaves] = useState<ImportedSave[]>([])
  const [importStatus, setImportStatus] = useState('')
  const [exitStatus, setExitStatus] = useState('')
  const [visualSettings, setVisualSettings] = useState<VisualSettings>({
    density: 'compact',
    theme: 'system',
    motion: 'standard',
    volume: 60,
  })
  const startGame = useGameStore((state) => state.startGame)
  const loadSaveJson = useGameStore((state) => state.loadSaveJson)

  function startNewGame() {
    startGame()
    setExitStatus('')
    setView('game')
  }

  async function importSaves(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const files = Array.from(input.files ?? [])
    if (files.length === 0) {
      return
    }

    const importedAt = Date.now()
    const loaded: ImportedSave[] = []
    const errors: string[] = []

    for (const [index, file] of files.entries()) {
      try {
        const json = await file.text()
        const saveFile = parseGameSaveFileJson(json)
        loaded.push({
          id: `${file.name}-${file.lastModified}-${importedAt}-${index}`,
          fileName: file.name,
          json,
          savedAt: saveFile.savedAt,
          day: saveFile.state.time.day,
          money: saveFile.state.money,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '读取失败'
        errors.push(`${file.name}: ${message}`)
      }
    }

    if (loaded.length > 0) {
      setImportedSaves((current) => [...loaded, ...current])
    }

    if (loaded.length > 0 && errors.length > 0) {
      setImportStatus(`已导入 ${loaded.length} 个存档，${errors.length} 个失败：${errors.join('；')}`)
    } else if (loaded.length > 0) {
      setImportStatus(`已导入 ${loaded.length} 个存档`)
    } else {
      setImportStatus(`未导入存档：${errors.join('；')}`)
    }

    input.value = ''
  }

  function loadImportedSave(save: ImportedSave) {
    try {
      loadSaveJson(save.json)
      setImportStatus(`已读取 ${save.fileName}`)
      setExitStatus('')
      setView('game')
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : '读取存档失败')
    }
  }

  function updateVisualSettings(patch: Partial<VisualSettings>) {
    setVisualSettings((current) => ({ ...current, ...patch }))
  }

  function exitApp() {
    setExitStatus('正在尝试关闭窗口')
    window.close()
    window.setTimeout(() => {
      if (!window.closed) {
        setExitStatus('当前环境无法自动关闭窗口，请手动关闭标签页/窗口')
      }
    }, 120)
  }

  if (view === 'home') {
    return (
      <main className="app-shell home-app-shell">
        <HomePage
          importedSaves={importedSaves}
          importStatus={importStatus}
          exitStatus={exitStatus}
          visualSettings={visualSettings}
          onStartNewGame={startNewGame}
          onImportSaves={importSaves}
          onLoadImportedSave={loadImportedSave}
          onUpdateVisualSettings={updateVisualSettings}
          onExit={exitApp}
        />
      </main>
    )
  }

  return (
    <main className="app-shell game-app-shell">
      <GameClock />
      <GameDashboard
        visualSettings={visualSettings}
        onOpenHome={() => setView('home')}
        onUpdateVisualSettings={updateVisualSettings}
      />
    </main>
  )
}

export default App
