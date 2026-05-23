import type { GameState, MailType } from '../types'
import { createId } from './eventSystem'

export interface MailInput {
  type: MailType
  from: string
  subject: string
  body: string
  relatedEntityId?: string
  financeRecordId?: string
}

export function sendMail(state: GameState, input: MailInput): string {
  const id = createId(state, 'mail')
  state.mailbox.push({
    id,
    day: state.time.day,
    minute: state.time.minuteOfDay,
    type: input.type,
    from: input.from,
    subject: input.subject,
    body: input.body,
    read: false,
    relatedEntityId: input.relatedEntityId,
    financeRecordId: input.financeRecordId,
  })
  return id
}

export function markMailRead(state: GameState, mailId: string): GameState {
  return {
    ...state,
    mailbox: state.mailbox.map((mail) => (mail.id === mailId ? { ...mail, read: true } : mail)),
  }
}

export function markAllMailRead(state: GameState): GameState {
  return {
    ...state,
    mailbox: state.mailbox.map((mail) => ({ ...mail, read: true })),
  }
}
