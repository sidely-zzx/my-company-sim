import { MAX_RECENT_EVENTS } from '../constants'
import type { EventSeverity, GameEventType, GameState } from '../types'

export interface EventInput {
  type: GameEventType
  title: string
  message: string
  severity?: EventSeverity
  relatedEntityId?: string
}

export function createId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextId}`
  state.nextId += 1
  return id
}

export function addEvent(state: GameState, input: EventInput): string {
  const id = createId(state, 'event')
  state.events.push({
    id,
    day: state.time.day,
    minute: state.time.minuteOfDay,
    type: input.type,
    title: input.title,
    message: input.message,
    severity: input.severity ?? 'info',
    relatedEntityId: input.relatedEntityId,
  })
  if (state.events.length > MAX_RECENT_EVENTS) {
    state.events = state.events.slice(-MAX_RECENT_EVENTS)
  }
  return id
}
