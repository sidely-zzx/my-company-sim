import { useMemo } from 'react'

import { useGameStore } from '../../store/gameStore'
import {
  button,
  cn,
  dialogPanel,
  emptyState,
  eyebrow,
  eventBorderToneClass,
  panel,
  panelHeader,
  panelTitle,
  tutorialTarget,
} from '../../styles/tw'
import { EventLogItem } from './EventLogItem'

export function EventPanel() {
  const events = useGameStore((state) => state.events)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const pendingProjectClientEvents = useGameStore((state) => state.pendingProjectClientEvents)
  const tutorial = useGameStore((state) => state.tutorial)
  const resolveProjectClientEvent = useGameStore((state) => state.resolveProjectClientEvent)
  const recentEvents = useMemo(() => events.slice(-16).reverse(), [events])

  return (
    <section className={cn(panel, dialogPanel)}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>事件</p>
          <h2 className={panelTitle}>最近事件</h2>
        </div>
      </div>
      {pendingProjectClientEvents.length > 0 && (
        <div className="mb-4 grid gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-[#efe2c8]">待处理甲方事件</strong>
            <span className="text-xs font-extrabold text-[#d5c4a1]">{pendingProjectClientEvents.length} 个</span>
          </div>
          <ol className="m-0 grid list-none gap-2.5 p-0">
            {pendingProjectClientEvents.map((event) => {
              const project = projectContracts.find((item) => item.id === event.projectId)
              const tutorialEvent = tutorial.enabled && !tutorial.completed && event.id === tutorial.projectClientEventId

              return (
                <li
                  key={event.id}
                  data-tutorial-anchor={tutorialEvent ? 'starter-event-card' : undefined}
                  className={cn(
                    'rounded-md border-l-4 bg-[rgba(12,15,15,0.72)] px-3 py-3',
                    eventBorderToneClass[event.severity],
                    tutorialEvent && 'shadow-[0_0_0_2px_rgba(181,157,101,0.22)]',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 text-xs font-extrabold text-[#d5c4a1]">
                        第 {event.triggeredDay} 天 · {event.clientName}
                      </p>
                      <h3 className="m-0 mt-1 text-base text-[#efe2c8]">{event.title}</h3>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {tutorialEvent ? (
                        <span className="rounded-md border border-[#b59d65] bg-[#302a1d] px-2 py-1 text-xs font-extrabold text-[#ffe0a3]">
                          教学事件
                        </span>
                      ) : null}
                      <span className="rounded-md border border-[#4b514d] bg-[#202625] px-2 py-1 text-xs font-extrabold text-[#aeb5ac]">
                        {project?.title ?? event.projectTitle}
                      </span>
                    </div>
                  </div>
                  <p className="mb-3 mt-2 text-sm leading-6 text-[#c9c1ad]">{event.description}</p>
                  <div className="grid gap-2">
                    {event.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        data-tutorial-anchor={tutorialEvent && option.id === 'compress_deadline' ? 'starter-event-recommended-option' : undefined}
                        className={cn(
                          button,
                          'min-h-12 justify-start whitespace-normal bg-[#1b201f] px-3 py-2 text-left text-[#efe2c8]',
                          tutorialEvent &&
                            option.id === 'compress_deadline' &&
                            cn('animate-pulse', tutorialTarget),
                        )}
                        onClick={() => {
                          // 选择会立即结算该选项对项目、甲方信任和项目成员状态的影响。
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
                </li>
              )
            })}
          </ol>
        </div>
      )}
      {recentEvents.length === 0 ? (
        <p className={emptyState}>暂无事件。</p>
      ) : (
        <ol className="m-0 grid list-none gap-2.5 p-0">
          {recentEvents.map((event) => (
            <EventLogItem key={event.id} event={event} projectContracts={projectContracts} />
          ))}
        </ol>
      )}
    </section>
  )
}
