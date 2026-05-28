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
import { LaborClientNoticeDialog } from '../components/game/LaborClientNoticeDialog'
import { LaborPanel } from '../components/game/LaborPanel'
import { MailOverviewPanel } from '../components/game/MailOverviewPanel'
import { ProjectClientEventDialog } from '../components/game/ProjectClientEventDialog'
import { ProjectPanel } from '../components/game/ProjectPanel'
import { RecruitingPanel } from '../components/game/RecruitingPanel'
import { RunningProjectList } from '../components/game/RunningProjectList'
import { StatusBar } from '../components/game/StatusBar'
import { EventLogItem } from '../components/game/EventLogItem'
import { TutorialGuideOverlay } from '../components/game/tutorial/TutorialGuideOverlay'
import {
  average,
  formatTime,
  percent,
  signedMoney,
} from '../game/ui'
import { getTutorialCoach, getTutorialTodos } from '../game/systems/tutorialSystem'
import { useGameStore } from '../store/gameStore'
import {
  amountNegative,
  amountPositive,
  button,
  cn,
  emptyState,
  srOnly,
  surface,
  tutorialBadge,
  tutorialTarget,
} from '../styles/tw'
import type { VisualSettings } from '../type'
import { money } from '../utils'
import PixiContainer from '../components/PixiContainer'

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
  const pendingProjectClientEvents = useGameStore((state) => state.pendingProjectClientEvents)
  const pendingLaborClientNotices = useGameStore((state) => state.pendingLaborClientNotices)
  const events = useGameStore((state) => state.events)
  const financeRecords = useGameStore((state) => state.financeRecords)
  const mailbox = useGameStore((state) => state.mailbox)
  const tutorial = useGameStore((state) => state.tutorial)
  const setSpeed = useGameStore((state) => state.setSpeed)
  const tutorialCoach = getTutorialCoach({ tutorial })
  const timeAdvancing = time.speed > 0 && !time.paused
  const speedGuideSatisfied = tutorialCoach?.target === 'speed' && timeAdvancing
  const tutorialOverlayCoach = speedGuideSatisfied
    ? undefined
    : tutorialCoach
  const shouldHighlightSpeedControls = tutorialCoach?.target === 'speed' && !timeAdvancing

  const activeEmployees = employees.filter((employee) => employee.status !== 'fired')
  const workingEmployees = activeEmployees.filter((employee) =>
    employee.status === 'focused_work' || employee.status === 'working',
  ).length
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
  const todos = tutorial.enabled && !tutorial.completed ? getTutorialTodos({
    tutorial,
    mailbox,
    laborContracts,
    projectContracts,
    pendingProjectClientEvents,
    employees,
    financeRecords,
  }) : [
    { text: '处理未读邮件', meta: `${mailbox.filter((mail) => !mail.read).length} 封`, done: false },
    { text: '筛选候选人简历', meta: `${resumes.length} 份`, done: false },
    {
      text: '确认可签合同',
      meta: `${laborContracts.filter((contract) => contract.status === 'available').length} 人力`,
      done: false,
    },
  ]
  const tutorialTodoTotal = tutorial.enabled && !tutorial.completed ? todos.length : 0
  const tutorialTodoDone = tutorial.enabled && !tutorial.completed ? todos.filter((todo) => todo.done).length : 0
  const tutorialTodoCurrentIndex = tutorial.enabled && !tutorial.completed ? todos.findIndex((todo) => todo.current) : -1
  const tutorialTodoProgress = tutorialTodoCurrentIndex >= 0 ? tutorialTodoCurrentIndex + 1 : tutorialTodoDone
  const morale = Math.max(0, Math.min(100, satisfaction))
  const efficiency = Math.round(
    activeEmployees.length > 0 ? ((workingEmployees + idleEmployees * 0.45) / activeEmployees.length) * 100 : 68,
  )
  const overtime = Math.max(10, Math.min(95, 25 + (settings.offWorkHour - 18) * 14))
  const stability = Math.round(employees.length > 0 ? (activeEmployees.length / employees.length) * 100 : 72)
  const recentEvents = events.slice(-5).reverse()
  const pendingActionCount = pendingProjectClientEvents.length + pendingLaborClientNotices.length
  const hasPendingActions = pendingActionCount > 0
  const alertText = `待处理甲方通知 ${pendingActionCount} 个`
  const activeProjectCount = projectContracts.filter((project) =>
    ['accepted', 'active', 'overdue'].includes(project.status),
  ).length

  return (
    <main className="grid h-full w-full grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-2 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),#151918] bg-[length:24px_24px] p-2">
      <header className={cn(surface, 'fixed top-0 left-0 right-0 z-30 grid min-h-20 grid-cols-[minmax(210px,1fr)_minmax(360px,1.7fr)_auto] items-stretch gap-2 px-2.5 py-2')}>
        <div className="flex flex-nowrap items-center gap-2">
          <div className="grid h-12 w-12 place-items-center rounded-lg border border-[#7e735a] bg-[#2b2922] text-3xl font-black text-[#ead7aa] shadow-[inset_0_0_0_2px_#171a18]">M</div>
          <div>
            <h1 className="m-0 text-[23px] text-[#efe2c8]">小马科技</h1>
            <p className="m-0 text-xs font-extrabold text-[#aaa48f]">Day {time.day} · {formatTime(time.minuteOfDay)}</p>
          </div>
          <div className="ml-1.5 flex flex-wrap items-center gap-1.5 border-l border-[#333a37] pl-2" aria-label="时间速度">
            <button type="button" onClick={() => setSpeed(0)} className={cn(button, 'h-[34px] min-w-[38px] bg-[#1b201f] px-2.5 text-[#d8ccb2]', time.speed === 0 && 'border-[#b59d65] bg-[#373226] text-[#ffe0a3]')}>
              ||
            </button>
            <button
              type="button"
              data-tutorial-anchor="speed-normal"
              onClick={() => setSpeed(2)}
              className={cn(button, 'h-[34px] min-w-[38px] bg-[#1b201f] px-2.5 text-[#d8ccb2]', time.speed === 2 && 'border-[#b59d65] bg-[#373226] text-[#ffe0a3]', shouldHighlightSpeedControls && cn('animate-pulse', tutorialTarget))}
            >
              &gt;
            </button>
            <button
              type="button"
              data-tutorial-anchor="speed-fast"
              onClick={() => setSpeed(6)}
              className={cn(button, 'h-[34px] min-w-[38px] bg-[#1b201f] px-2.5 text-[#d8ccb2]', time.speed === 6 && 'border-[#b59d65] bg-[#373226] text-[#ffe0a3]', shouldHighlightSpeedControls && cn('animate-pulse', tutorialTarget))}
            >
              &gt;&gt;
            </button>
          </div>
        </div>
        <div className="flex flex-nowrap items-center justify-between gap-1.5" aria-label="经营指标">
          <div className="min-w-20 border-l border-[#343b38] px-2"><span className="block text-[12px] text-[#aea790]">现金流</span><strong className={cn('mt-1 block text-[17px]', amountPositive)}>{money(moneyValue)}</strong></div>
          <div className="min-w-20 border-l border-[#343b38] px-2"><span className="block text-[12px] text-[#aea790]">burn rate</span><strong className={cn('mt-1 block text-[17px]', amountNegative)}>-{money(burnRate)}/天</strong></div>
          <div className="min-w-16 border-l border-[#343b38] px-2"><span className="block text-[12px] text-[#aea790]">项目数</span><strong className="mt-1 block text-[17px] text-[#efe2c8]">{activeProjectCount}/{projectContracts.length}</strong></div>
          <div className="min-w-16 border-l border-[#343b38] px-2"><span className="block text-[12px] text-[#aea790]">员工数</span><strong className="mt-1 block text-[17px] text-[#efe2c8]">{activeEmployees.length}/15</strong></div>
          <div className="min-w-20 border-l border-[#343b38] px-2"><span className="block text-[12px] text-[#aea790]">满意度</span><strong className="mt-1 block text-[17px] text-[#efe2c8]">{percent(morale / 100)}</strong></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={cn(button, 'h-[34px] min-w-[38px] bg-[#1b201f] px-2.5 text-[#d8ccb2]')} aria-label="主菜单" onClick={onOpenHome}>MENU</button>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className={cn(button, 'h-[34px] min-w-[38px] bg-[#1b201f] px-2.5 text-[#d8ccb2]')} aria-label="财务报表">FIN</button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className={srOnly}>财务报表</DialogTitle>
              <DialogDescription className={srOnly}>查看昨日财务报表</DialogDescription>
              <FinanceReportPanel />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className={cn(button, 'h-[34px] min-w-[38px] bg-[#1b201f] px-2.5 text-[#d8ccb2]')} aria-label="设置">SET</button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className={srOnly}>设置</DialogTitle>
              <DialogDescription className={srOnly}>系统与视觉设置</DialogDescription>
              <DashboardSettingsPanel
                visualSettings={visualSettings}
                onOpenHome={onOpenHome}
                onUpdateVisualSettings={onUpdateVisualSettings}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <div className='h-full w-full'>
        <PixiContainer></PixiContainer>
      </div>
      <div className="fixed left-0 top-25 z-20">
        <aside className="grid w-[230px] min-w-0 content-start gap-2">
          {tutorialCoach ? (
            <section className="rounded-lg border-2 border-[#ffd46a] bg-[#17120a] p-3.5 shadow-[0_0_0_2px_rgba(255,212,106,0.22),0_18px_44px_rgba(0,0,0,0.46)]">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="m-0 text-xs font-black text-[#ffcf5a]">当前指引</p>
                {tutorialTodoTotal > 0 ? (
                  <span className={tutorialBadge}>{tutorialTodoProgress}/{tutorialTodoTotal}</span>
                ) : null}
              </div>
              <h2 className="mb-2 mt-1 text-xl font-black leading-6 text-[#fff8df]">{tutorialCoach.title}</h2>
              <p className="m-0 text-sm font-black leading-5 text-[#fff3cd]">{tutorialCoach.actionText}</p>
              <p className="mb-0 mt-2 text-xs font-extrabold leading-5 text-[#d8cfbb]">{tutorialCoach.reasonText}</p>
            </section>
          ) : null}
          <RunningProjectList />
          <section className={cn(surface, 'min-w-0 p-3.5')}>
            <h2 className="mb-3 mt-0 text-[17px] text-[#efe2c8]">待办事项</h2>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {todos.map((todo) => (
                <li
                  key={todo.text}
                  className={cn(
                    'flex justify-between gap-2.5 rounded-md px-2 py-1.5 text-sm text-[#d4cbb6]',
                    todo.current && 'border border-[#ffd46a] bg-[rgba(255,212,106,0.14)] text-[#fff3cd]',
                  )}
                >
                  <span className={cn(todo.done && 'text-[#7f8a81] line-through')}>
                    {todo.current ? '当前：' : todo.done ? '已完成：' : ''}
                    {todo.text}
                  </span>
                  <em className={cn('not-italic text-[#a9a18c]', todo.current && 'font-black text-[#ffcf5a]', todo.done && 'text-[#6f796f]')}>{todo.meta}</em>
                </li>
              ))}
            </ul>
          </section>
          <section className={cn(surface, 'min-w-0 p-3.5')}>
            <h2 className="mb-3 mt-0 text-[17px] text-[#efe2c8]">本月财务</h2>
            <dl className="m-0 grid">
              <div className="flex justify-between gap-3 border-b border-[#303834] py-2"><dt className="m-0">收入</dt><dd className={cn('m-0', amountPositive)}>{money(incomeTotal)}</dd></div>
              <div className="flex justify-between gap-3 border-b border-[#303834] py-2"><dt className="m-0">支出</dt><dd className={cn('m-0', amountNegative)}>-{money(expenseTotal)}</dd></div>
              <div className="flex justify-between gap-3 border-b border-[#303834] py-2"><dt className="m-0">净利润</dt><dd className={cn('m-0', netTotal >= 0 ? amountPositive : amountNegative)}>{signedMoney(netTotal)}</dd></div>
            </dl>
          </section>
          <section className={cn(surface, 'min-w-0 p-3.5')}>
            <h2 className="mb-3 mt-0 text-[17px] text-[#efe2c8]">公司状态</h2>
            <div className="grid gap-2.5">
              <StatusBar label="团队士气" value={morale} />
              <StatusBar label="工作效率" value={efficiency} />
              <StatusBar label="加班强度" value={overtime} inverse />
              <StatusBar label="人员稳定性" value={stability} />
            </div>
          </section>
        </aside>
      </div>

      <div className='fixed right-0 bottom-25 z-20'>
         <aside className="grid w-[260px] min-w-0 content-start gap-2">
          <MailOverviewPanel />
          {hasPendingActions && (
            <section
              className={cn(
                surface,
                'grid min-h-[58px] grid-cols-[28px_minmax(0,1fr)] items-center gap-2.5 border-[#59423c] bg-[linear-gradient(180deg,#302521,#171b1a)] p-3 text-left text-[#f1dfc1]',
                tutorialCoach?.target === 'event' && cn('animate-pulse', tutorialTarget),
              )}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#bb594b] font-black text-[#fff1df]">!</span>
              <span className="min-w-0">
                <strong className="block truncate">{alertText}</strong>
                <em className="mt-1 block not-italic text-[#d5c4a1]">请在弹窗中选择处理方案</em>
              </span>
            </section>
          )}
          <section className={cn(surface, 'min-w-0 p-3.5')}>
            <div className="flex items-center justify-between">
              <h2 className="mb-3 mt-0 text-[17px] text-[#efe2c8]">事件日志</h2>
              <span className="font-extrabold text-[#aeb5ac]">{events.length}</span>
            </div>
            {recentEvents.length === 0 ? (
              <p className={emptyState}>暂无事件。</p>
            ) : (
              <ol className="m-0 grid list-none gap-2.5 p-0">
                {recentEvents.slice(3).map((event) => (
                  <EventLogItem key={event.id} event={event} projectContracts={projectContracts} compact />
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
      <ProjectClientEventDialog />
      <LaborClientNoticeDialog />

      <nav className={cn(surface, 'fixed bottom-0 left-0 right-0 z-30 mx-auto grid w-[850px] grid-cols-7 gap-px')} aria-label="模块导航">
        <DockDialog icon="EMP" label="员工" badge={activeEmployees.length} highlighted={tutorialCoach?.target === 'employee'} hint="抓摸鱼" tutorialAnchor="dock-employee" title="员工列表" description="管理员工">
          <EmployeePanel />
        </DockDialog>
        <DockDialog icon="REC" label="招聘" badge={resumes.length} highlighted={tutorialCoach?.target === 'recruiting'} hint="下一步" tutorialAnchor="dock-recruiting" title="简历市场" description="招聘候选人">
          <RecruitingPanel />
        </DockDialog>
        <DockDialog icon="PRJ" label="项目" badge={activeProjectCount} highlighted={tutorialCoach?.target === 'project'} hint="下一步" tutorialAnchor="dock-project" title="项目合同" description="项目外包">
          <ProjectPanel />
        </DockDialog>
        <DockDialog icon="FIN" label="财务" title="昨日财报" description="财务报表">
          <FinanceReportPanel />
        </DockDialog>
        <DockDialog icon="EVT" label="事件" badge={pendingActionCount} highlighted={tutorialCoach?.target === 'event'} hint="处理事件" tutorialAnchor="dock-event" title="事件日志" description="查看事件">
          <EventPanel />
        </DockDialog>
        <DockDialog icon="CTR" label="合同" badge={laborContracts.length} highlighted={tutorialCoach?.target === 'labor'} hint="下一步" tutorialAnchor="dock-labor" title="驻场合同" description="人力外包合同">
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

      {/* <div className={cn(surface, 'flex flex-wrap justify-center gap-3 px-3 py-2 text-xs font-extrabold text-[#aeb5ac]')} aria-label="员工状态概览">
        <span>工作中 {workingEmployees}</span>
        <span>摸鱼中 {slackingEmployees}</span>
        <span>待分配 {idleEmployees}</span>
      </div> */}
      <TutorialGuideOverlay coach={tutorialOverlayCoach} />
    </main>
  )
}
