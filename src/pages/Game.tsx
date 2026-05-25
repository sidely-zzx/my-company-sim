import { useMemo } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { DashboardSettingsPanel } from '../components/setting'
import { DockDialog } from '../components/game/DockDialog'
import { EmployeePanel } from '../components/game/EmployeePanel'
import { EventPanel } from '../components/game/EventPanel'
import { FinanceReportPanel } from '../components/game/FinanceReportPanel'
import { LaborPanel } from '../components/game/LaborPanel'
import { MailPanel } from '../components/game/MailPanel'
import { ProjectPanel } from '../components/game/ProjectPanel'
import { RecruitingPanel } from '../components/game/RecruitingPanel'
import { StatusBar } from '../components/game/StatusBar'
import {
  average,
  eventIcon,
  formatTime,
  percent,
  progressTone,
  projectProgress,
  projectRisk,
  signedMoney,
} from '../game/ui'
import { useGameStore } from '../store/gameStore'
import type { VisualSettings } from '../type'
import { money } from '../utils'

interface GamePageProps {
  visualSettings: VisualSettings
  onOpenHome: () => void
  onUpdateVisualSettings: (patch: Partial<VisualSettings>) => void
}

export default function GamePage({ visualSettings, onOpenHome, onUpdateVisualSettings }: GamePageProps) {
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
  const stability = Math.round(employees.length > 0 ? (activeEmployees.length / employees.length) * 100 : 72)
  const recentEvents = events.slice(-5).reverse()
  const alertMail = [...mailbox].reverse().find((mail) => !mail.read)
  const alertEvent = [...events].reverse().find((event) =>
    event.severity === 'danger' || event.severity === 'warning',
  )
  const alertText = alertMail?.subject ?? alertEvent?.title ?? '今日暂无紧急风险'
  const activeProjectCount = projectContracts.filter((project) =>
    ['accepted', 'active', 'overdue'].includes(project.status),
  ).length
  const unreadMailCount = mailbox.filter((mail) => !mail.read).length

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
        <DockDialog icon="EVT" label="事件" badge={unreadMailCount} title="事件日志" description="查看事件">
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
