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
import {
  amountNegative,
  amountPositive,
  button,
  cn,
  emptyState,
  eventTokenToneClass,
  progressFill,
  progressToneClass,
  progressTrack,
  riskToneClass,
  srOnly,
  surface,
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
    <main className="grid min-h-screen grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-2 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),#151918] bg-[length:24px_24px] p-2">
      <header className={cn(surface, 'grid min-h-20 grid-cols-[minmax(260px,1.1fr)_minmax(420px,2fr)_auto] items-stretch gap-3 px-3.5 py-2.5 max-[1180px]:grid-cols-1')}>
        <div className="flex flex-nowrap items-center gap-2 max-[900px]:flex-col max-[900px]:items-start">
          <div className="grid h-12 w-12 place-items-center rounded-lg border border-[#7e735a] bg-[#2b2922] text-3xl font-black text-[#ead7aa] shadow-[inset_0_0_0_2px_#171a18]">M</div>
          <div>
            <h1 className="m-0 text-[23px] text-[#efe2c8]">小马科技</h1>
            <p className="m-0 text-xs font-extrabold text-[#aaa48f]">Day {time.day} · {formatTime(time.minuteOfDay)}</p>
          </div>
          <div className="ml-2.5 flex flex-wrap items-center gap-2 border-l border-[#333a37] pl-2.5" aria-label="时间速度">
            <button type="button" onClick={() => setSpeed(0)} className={cn(button, 'h-[34px] min-w-[38px] bg-[#1b201f] px-2.5 text-[#d8ccb2]', time.speed === 0 && 'border-[#b59d65] bg-[#373226] text-[#ffe0a3]')}>
              ||
            </button>
            <button type="button" onClick={() => setSpeed(1)} className={cn(button, 'h-[34px] min-w-[38px] bg-[#1b201f] px-2.5 text-[#d8ccb2]', time.speed === 1 && 'border-[#b59d65] bg-[#373226] text-[#ffe0a3]')}>
              &gt;
            </button>
            <button type="button" onClick={() => setSpeed(2)} className={cn(button, 'h-[34px] min-w-[38px] bg-[#1b201f] px-2.5 text-[#d8ccb2]', time.speed === 2 && 'border-[#b59d65] bg-[#373226] text-[#ffe0a3]')}>
              &gt;&gt;
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 max-[1180px]:justify-start" aria-label="经营指标">
          <div className="min-w-28 border-l border-[#343b38] px-3.5 max-[560px]:min-w-[46%] max-[560px]:px-2"><span className="block text-[13px] text-[#aea790]">现金流</span><strong className={cn('mt-1 block text-[21px]', amountPositive)}>{money(moneyValue)}</strong></div>
          <div className="min-w-28 border-l border-[#343b38] px-3.5 max-[560px]:min-w-[46%] max-[560px]:px-2"><span className="block text-[13px] text-[#aea790]">burn rate</span><strong className={cn('mt-1 block text-[21px]', amountNegative)}>-{money(burnRate)}/天</strong></div>
          <div className="min-w-28 border-l border-[#343b38] px-3.5 max-[560px]:min-w-[46%] max-[560px]:px-2"><span className="block text-[13px] text-[#aea790]">项目数</span><strong className="mt-1 block text-[21px] text-[#efe2c8]">{activeProjectCount}/{projectContracts.length}</strong></div>
          <div className="min-w-28 border-l border-[#343b38] px-3.5 max-[560px]:min-w-[46%] max-[560px]:px-2"><span className="block text-[13px] text-[#aea790]">员工数</span><strong className="mt-1 block text-[21px] text-[#efe2c8]">{activeEmployees.length}/15</strong></div>
          <div className="min-w-28 border-l border-[#343b38] px-3.5 max-[560px]:min-w-[46%] max-[560px]:px-2"><span className="block text-[13px] text-[#aea790]">公司满意度</span><strong className="mt-1 block text-[21px] text-[#efe2c8]">{percent(morale / 100)}</strong></div>
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

      <div className="grid min-h-0 grid-cols-[282px_minmax(420px,1fr)_292px] gap-2 max-[1180px]:grid-cols-1">
        <aside className="grid min-w-0 content-start gap-2 max-[1180px]:grid-cols-2 max-[900px]:grid-cols-1">
          <section className={cn(surface, 'min-w-0 p-3.5')}>
            <h2 className="mb-3 mt-0 text-[17px] text-[#efe2c8]">项目</h2>
            <div className="grid gap-2.5">
              {keyProjects.map((project) => {
                const progress = projectProgress(project)
                const risk = projectRisk(project, time.day)
                return (
                  <article key={project.id} className="grid gap-2 rounded-md border border-[#303834] bg-[rgba(12,15,15,0.5)] p-2.5">
                    <div className="flex justify-between gap-2">
                      <strong className="text-[13px] text-[#e7dcc3]">{project.title}</strong>
                      <span className={cn('text-xs font-extrabold', riskToneClass[risk.tone])}>{risk.label}</span>
                    </div>
                    <div className={progressTrack}>
                      <i className={cn(progressFill, progressToneClass[progressTone(progress)])} style={{ width: `${progress}%` }} />
                    </div>
                    <small className="text-xs font-extrabold text-[#aeb5ac]">{progress}%</small>
                  </article>
                )
              })}
            </div>
          </section>
          <section className={cn(surface, 'min-w-0 p-3.5')}>
            <h2 className="mb-3 mt-0 text-[17px] text-[#efe2c8]">待办事项</h2>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {todos.map((todo) => (
                <li key={todo.text} className="flex justify-between gap-2.5 text-sm text-[#d4cbb6]">
                  <span>{todo.text}</span>
                  <em className="not-italic text-[#a9a18c]">{todo.meta}</em>
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

        <section className="relative grid min-h-[610px] place-items-center overflow-hidden rounded-lg border border-[#38413d] bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(180deg,#38413f_0%,#222a28_42%,#303432_42%,#202625_100%)] bg-[length:48px_48px,48px_48px,auto] shadow-[inset_0_0_80px_rgba(0,0,0,0.46),0_12px_30px_rgba(0,0,0,0.28)] before:absolute before:inset-[18px] before:rounded-lg before:border-2 before:border-dashed before:border-[rgba(234,215,170,0.18)] before:content-[''] max-[1180px]:min-h-[520px] max-[560px]:min-h-[360px]" data-scene-root>
          <div className="relative grid w-[min(420px,calc(100%-48px))] gap-2 rounded-lg border border-[rgba(234,215,170,0.3)] bg-[rgba(13,16,16,0.62)] p-6 text-center text-[#d7caaa]">
            <PixiContainer></PixiContainer>
          </div>
        </section>

        <aside className="grid min-w-0 content-start gap-2 max-[1180px]:grid-cols-1 max-[900px]:grid-cols-1">
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className={cn(button, 'grid min-h-[58px] w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 border-[#59423c] bg-[linear-gradient(180deg,#302521,#171b1a)] p-3 text-left text-[#f1dfc1]')}>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#bb594b] font-black text-[#fff1df]">!</span>
                <strong className="overflow-hidden text-ellipsis whitespace-nowrap">{alertText}</strong>
                <em className="not-italic text-[#d5c4a1]">查看</em>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className={srOnly}>提醒详情</DialogTitle>
              <DialogDescription className={srOnly}>查看邮件和事件</DialogDescription>
              <MailPanel />
            </DialogContent>
          </Dialog>
          <section className={cn(surface, 'min-w-0 p-3.5')}>
            <div className="flex items-center justify-between">
              <h2 className="mb-3 mt-0 text-[17px] text-[#efe2c8]">事件日志</h2>
              <span className="font-extrabold text-[#aeb5ac]">{events.length}</span>
            </div>
            {recentEvents.length === 0 ? (
              <p className={emptyState}>暂无事件。</p>
            ) : (
              <ol className="m-0 grid list-none gap-2.5 p-0">
                {recentEvents.map((event) => (
                  <li key={event.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 border-b border-[#303834] py-[9px]">
                    <span className={cn('grid h-6 w-6 place-items-center rounded-md text-xs font-black text-[#111514]', eventTokenToneClass[event.severity])}>{eventIcon(event.type)}</span>
                    <div>
                      <time className="text-xs text-[#9aa29a]">{formatTime(event.minute)}</time>
                      <strong className="mt-0.5 block text-[13px] text-[#eadfc7]">{event.title}</strong>
                      <p className="mt-[3px] text-xs text-[#aeb5ac]">{event.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      <nav className={cn(surface, 'mx-auto grid w-[min(850px,100%)] grid-cols-7 gap-px p-1.5 max-[900px]:grid-cols-4 max-[560px]:grid-cols-2')} aria-label="模块导航">
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

      <div className={cn(surface, 'flex flex-wrap justify-center gap-3 px-3 py-2 text-xs font-extrabold text-[#aeb5ac]')} aria-label="员工状态概览">
        <span>工作中 {workingEmployees}</span>
        <span>摸鱼中 {slackingEmployees}</span>
        <span>待分配 {idleEmployees}</span>
      </div>
    </main>
  )
}
