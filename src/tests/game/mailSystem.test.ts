import { describe, expect, it } from 'vitest'

import { markAllMailRead, markMailRead, sendMail } from '../../game/systems/mailSystem'
import { createTestState } from './testHelpers'

describe('mailSystem', () => {
  it('creates unread mail and can mark one as read', () => {
    const state = createTestState()
    const mailId = sendMail(state, {
      type: 'project_overdue',
      from: '测试甲方',
      subject: '延期',
      body: '扣款',
    })

    expect(state.mailbox.find((mail) => mail.id === mailId)?.read).toBe(false)
    expect(markMailRead(state, mailId).mailbox.find((mail) => mail.id === mailId)?.read).toBe(true)
  })

  it('can mark all mail as read', () => {
    const state = createTestState()
    sendMail(state, { type: 'project_completed', from: '甲方', subject: '完成', body: '收款' })
    sendMail(state, { type: 'daily_finance_report', from: '财务', subject: '报表', body: '日报' })

    expect(markAllMailRead(state).mailbox.every((mail) => mail.read)).toBe(true)
  })
})
