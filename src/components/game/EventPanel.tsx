import { useMemo } from 'react'

import { useGameStore } from '../../store/gameStore'
import {
  cn,
  dialogPanel,
  emptyState,
  eyebrow,
  panel,
  panelHeader,
  panelTitle,
} from '../../styles/tw'
import { EventLogItem } from './EventLogItem'

export function EventPanel() {
  const events = useGameStore((state) => state.events)
  const projectContracts = useGameStore((state) => state.projectContracts)
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
            <EventLogItem key={event.id} event={event} projectContracts={projectContracts} />
          ))}
        </ol>
      )}
    </section>
  )
}
