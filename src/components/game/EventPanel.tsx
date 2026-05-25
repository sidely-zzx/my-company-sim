import { useMemo } from 'react'

import { formatTime } from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import {
  cn,
  dialogPanel,
  emptyState,
  eventBorderToneClass,
  eyebrow,
  panel,
  panelHeader,
  panelTitle,
} from '../../styles/tw'

export function EventPanel() {
  const events = useGameStore((state) => state.events)
  const recentEvents = useMemo(() => events.slice(-16).reverse(), [events])

  return (
    <section className={cn(panel, dialogPanel)}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>事件</p>
          <h2 className={panelTitle}>最近事件</h2>
        </div>
      </div>
      {recentEvents.length === 0 ? (
        <p className={emptyState}>暂无事件。</p>
      ) : (
        <ol className="m-0 grid list-none gap-2.5 p-0">
          {recentEvents.map((event) => (
            <li key={event.id} className={cn('rounded-md border-l-4 bg-[rgba(12,15,15,0.5)] px-3 py-2.5', eventBorderToneClass[event.severity])}>
              <span className="block text-xs text-[#9aa29a]">第 {event.day} 天 {formatTime(event.minute)}</span>
              <strong className="mt-0.5 block">{event.title}</strong>
              <p className="mt-1 text-[#b9c0b7]">{event.message}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
