import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog'
import type { ReactNode } from 'react'
import type { DailyBriefingItem } from '../../game/systems/dailyBriefingSystem'
import { selectDailyBriefingSummary } from '../../game/systems/dailyBriefingSystem'
import { isStarterProjectClientEvent } from '../../game/systems/tutorialSystem'
import { useGameStore } from '../../store/gameStore'
import { amountNegative, amountPositive, button, cn, emptyState, eventBorderToneClass, srOnly, tutorialTarget } from '../../styles/tw'
import { money } from '../../utils'
import { LaborEmployeePicker } from './LaborEmployeePicker'

function canAssignLaborContract(status?: string): boolean {
  return status === 'accepted' || status === 'active' || status === 'warning'
}

function ItemShell({ item, children }: { item: DailyBriefingItem; children?: ReactNode }) {
  return (
    <li className={cn('rounded-md border-l-4 bg-[rgba(12,15,15,0.72)] px-3 py-3', eventBorderToneClass[item.severity])}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-base text-[#efe2c8]">{item.title}</h3>
          <p className="mb-0 mt-2 text-sm leading-6 text-[#c9c1ad]">{item.description}</p>
        </div>
        {item.amountDelta !== undefined ? (
          <span className={cn('shrink-0 text-sm font-black', item.amountDelta >= 0 ? amountPositive : amountNegative)}>
            {item.amountDelta >= 0 ? '+' : '-'}{money(Math.abs(item.amountDelta))}
          </span>
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </li>
  )
}

function BriefingSection({
  title,
  items,
  children,
}: {
  title: string
  items: DailyBriefingItem[]
  children?: (item: DailyBriefingItem) => React.ReactNode
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="grid gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-base text-[#efe2c8]">{title}</h2>
        <span className="text-xs font-extrabold text-[#d5c4a1]">{items.length} 项</span>
      </div>
      <ol className="m-0 grid list-none gap-2.5 p-0">
        {items.map((item) => (
          <ItemShell key={item.id} item={item}>
            {children?.(item)}
          </ItemShell>
        ))}
      </ol>
    </section>
  )
}

export function DailyOperationsBriefingDialog() {
  const state = useGameStore()
  const employees = state.employees
  const laborContracts = state.laborContracts
  const projectContracts = state.projectContracts
  const pendingProjectClientEvents = state.pendingProjectClientEvents
  const pendingLaborClientNotices = state.pendingLaborClientNotices
  const activeDailyBriefingDay = state.activeDailyBriefingDay
  const dismissDailyBriefing = state.dismissDailyBriefing
  const resolveProjectClientEvent = state.resolveProjectClientEvent
  const resolveLaborClientNotice = state.resolveLaborClientNotice
  const summary = activeDailyBriefingDay ? selectDailyBriefingSummary(state, activeDailyBriefingDay) : undefined
  const requiredActionCount = pendingProjectClientEvents.length + pendingLaborClientNotices.length
  const blockingBriefing = Boolean(activeDailyBriefingDay !== undefined && state.time.paused)

  return (
    <Dialog open={activeDailyBriefingDay !== undefined}>
      <DialogContent
        showCloseButton={!blockingBriefing}
        className="w-[min(calc(100vw-32px),1180px)]"
        onEscapeKeyDown={(inputEvent) => {
          if (blockingBriefing) {
            inputEvent.preventDefault()
          }
        }}
        onPointerDownOutside={(inputEvent) => {
          if (blockingBriefing) {
            inputEvent.preventDefault()
          }
        }}
        onInteractOutside={(inputEvent) => {
          if (blockingBriefing) {
            inputEvent.preventDefault()
          }
        }}
      >
        <DialogTitle>昨日经营日报</DialogTitle>
        <DialogDescription className={srOnly}>查看昨日经营汇总并处理必须完成的甲方事项</DialogDescription>
        {summary ? (
          <section className="grid max-h-[min(78vh,760px)] gap-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
              <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
                <span className="block text-xs text-[#9aa29a]">昨日收入</span>
                <strong className={cn('mt-1 block text-xl', amountPositive)}>{money(summary.incomeTotal)}</strong>
              </div>
              <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
                <span className="block text-xs text-[#9aa29a]">昨日支出</span>
                <strong className={cn('mt-1 block text-xl', amountNegative)}>{money(summary.expenseTotal)}</strong>
              </div>
              <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3">
                <span className="block text-xs text-[#9aa29a]">净利润</span>
                <strong className={cn('mt-1 block text-xl', summary.net >= 0 ? amountPositive : amountNegative)}>{money(summary.net)}</strong>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-extrabold text-[#d8cfbb]">
              <span className="rounded-md border border-[#303834] bg-[#171c1b] px-2 py-1">人力异常 {summary.laborIssueCount}</span>
              <span className="rounded-md border border-[#303834] bg-[#171c1b] px-2 py-1">项目事件 {summary.projectEventCount}</span>
              <span className="rounded-md border border-[#303834] bg-[#171c1b] px-2 py-1">必须处理 {requiredActionCount}</span>
            </div>
            {summary.requiredItems.length > 0 ? (
              <BriefingSection title="必须处理" items={summary.requiredItems}>
                {(item) => {
                  if (item.action === 'resolve_project_event') {
                    const event = pendingProjectClientEvents.find((candidate) => `project-event-${candidate.id}` === item.id)
                    const project = event ? projectContracts.find((candidate) => candidate.id === event.projectId) : undefined
                    const tutorialEvent = event ? isStarterProjectClientEvent(state.tutorial, event.id) : false
                    return event ? (
                      <div className="grid gap-2">
                        <span className="text-xs font-extrabold text-[#aeb5ac]">{project?.title ?? event.projectTitle}</span>
                        {event.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            data-tutorial-anchor={tutorialEvent && option.id === 'compress_deadline' ? 'starter-event-recommended-option' : undefined}
                            className={cn(
                              button,
                              'min-h-12 justify-start whitespace-normal bg-[#1b201f] px-3 py-2 text-left text-[#efe2c8]',
                              tutorialEvent && option.id === 'compress_deadline' && cn('animate-pulse', tutorialTarget),
                            )}
                            onClick={() => resolveProjectClientEvent(event.id, option.id)}
                          >
                            <span className="grid gap-1">
                              <strong>{option.label}</strong>
                              <small className="font-medium leading-5 text-[#aeb5ac]">{option.description}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null
                  }

                  if (item.action === 'replace_labor_employee') {
                    const notice = pendingLaborClientNotices.find((candidate) => `labor-notice-${candidate.id}` === item.id)
                    const contract = notice ? laborContracts.find((candidate) => candidate.id === notice.contractId) : undefined
                    return notice ? (
                      <div className="grid gap-3">
                        <button type="button" className={cn(button, 'justify-self-start')} onClick={() => resolveLaborClientNotice(notice.id)}>
                          确认不换人
                        </button>
                        {contract ? (
                          <LaborEmployeePicker
                            contract={contract}
                            employees={employees}
                            laborContracts={laborContracts}
                            projectContracts={projectContracts}
                            canAssign={canAssignLaborContract(contract.status)}
                            onAssignEmployee={(employeeId) => resolveLaborClientNotice(notice.id, employeeId, 'immediate')}
                          />
                        ) : null}
                      </div>
                    ) : null
                  }

                  return null
                }}
              </BriefingSection>
            ) : null}
            <BriefingSection title="人力外包" items={summary.laborItems.filter((item) => !summary.requiredItems.some((required) => required.id === item.id))} />
            <BriefingSection title="项目外包" items={summary.projectItems.filter((item) => !summary.requiredItems.some((required) => required.id === item.id))} />
            <BriefingSection title="财务" items={summary.financeItems} />
            {summary.requiredItems.length === 0 && summary.laborItems.length === 0 && summary.projectItems.length === 0 && summary.financeItems.length === 0 ? (
              <p className={emptyState}>昨日没有需要汇总的经营事项。</p>
            ) : null}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[#303834] bg-[#151918] py-3">
              <span className="text-xs font-extrabold text-[#aeb5ac]">
                {requiredActionCount > 0 ? `还有 ${requiredActionCount} 项待处理` : '所有事项已处理'}
              </span>
              <button type="button" className={button} disabled={requiredActionCount > 0} onClick={dismissDailyBriefing}>
                {blockingBriefing ? '开始今天' : '关闭日报'}
              </button>
            </div>
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
