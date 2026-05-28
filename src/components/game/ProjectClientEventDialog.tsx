import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog'
import { isStarterProjectClientEvent } from '../../game/systems/tutorialSystem'
import { useGameStore } from '../../store/gameStore'
import { button, cn, eventBorderToneClass, srOnly, tutorialTarget } from '../../styles/tw'

export function ProjectClientEventDialog() {
  const projectContracts = useGameStore((state) => state.projectContracts)
  const pendingProjectClientEvents = useGameStore((state) => state.pendingProjectClientEvents)
  const tutorial = useGameStore((state) => state.tutorial)
  const resolveProjectClientEvent = useGameStore((state) => state.resolveProjectClientEvent)
  const event = pendingProjectClientEvents[0]
  const project = event ? projectContracts.find((item) => item.id === event.projectId) : undefined
  const tutorialEvent = event ? isStarterProjectClientEvent(tutorial, event.id) : false

  return (
    <Dialog open={Boolean(event)}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(calc(100vw-32px),760px)]"
        onEscapeKeyDown={(inputEvent) => inputEvent.preventDefault()}
        onPointerDownOutside={(inputEvent) => inputEvent.preventDefault()}
        onInteractOutside={(inputEvent) => inputEvent.preventDefault()}
      >
        <DialogTitle className={srOnly}>待处理甲方项目事件</DialogTitle>
        <DialogDescription className={srOnly}>必须选择应对方案后才能继续游戏时间</DialogDescription>
        {event ? (
          <section
            data-tutorial-anchor={tutorialEvent ? 'starter-event-card' : undefined}
            className={cn(
              'rounded-md border-l-4 bg-[rgba(12,15,15,0.72)] px-4 py-4',
              eventBorderToneClass[event.severity],
            )}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 text-xs font-extrabold text-[#d5c4a1]">
                  第 {event.triggeredDay} 天 · {event.clientName}
                </p>
                <h2 className="m-0 mt-1 text-xl text-[#efe2c8]">{event.title}</h2>
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
            <p className="mb-4 mt-0 text-sm leading-6 text-[#c9c1ad]">{event.description}</p>
            <div className="mb-3 rounded-md border border-[#59423c] bg-[#211a18] px-3 py-2 text-xs font-extrabold leading-5 text-[#f1dfc1]">
              甲方事件会暂停时间推进；你的选择会立即影响项目进度、合同金额、团队压力/精力/满意度和甲方信任。
            </div>
            <div className="grid gap-2">
              {event.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-tutorial-anchor={tutorialEvent && option.id === 'compress_deadline' ? 'starter-event-recommended-option' : undefined}
                  className={cn(
                    button,
                    'min-h-14 justify-start whitespace-normal bg-[#1b201f] px-3 py-2 text-left text-[#efe2c8]',
                    tutorialEvent &&
                      option.id === 'compress_deadline' &&
                      cn('animate-pulse', tutorialTarget),
                  )}
                  onClick={() => {
                    // 玩家选择后会结算选项效果；如果这是最后一个待处理事件，系统会解除暂停并恢复触发前速度。
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
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
