import { useMemo } from 'react'

import { formatTime } from '../../game/ui'
import { useGameStore } from '../../store/gameStore'

export function EventPanel() {
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
