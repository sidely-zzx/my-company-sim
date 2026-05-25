import { describe, expect, it } from 'vitest'

import { createInitialGameState } from '../../game/initialState'
import {
  createGameSaveFileName,
  createGameSaveJson,
  parseGameSaveFileJson,
  parseGameSaveJson,
} from '../../game/save'

describe('saveSystem', () => {
  it('exports and imports the whole game state as a versioned JSON save', () => {
    const state = createInitialGameState(1)
    state.money = 12345
    state.mailbox.push({
      id: 'mail-test',
      day: 2,
      minute: 600,
      type: 'daily_finance_report',
      from: '财务',
      subject: '测试报表',
      body: '用于确认邮件历史会进入存档。',
      read: true,
    })

    const json = createGameSaveJson(state, new Date('2026-05-24T00:00:00.000Z'))

    expect(parseGameSaveJson(json)).toEqual(state)
  })

  it('creates a stable save file name with day and timestamp', () => {
    const state = createInitialGameState(1)
    state.time.day = 8

    expect(createGameSaveFileName(state, new Date('2026-05-24T00:00:00.000Z'))).toBe(
      'my-company-sim-day-8-2026-05-24T00-00-00-000Z.companysim.json',
    )
  })

  it('parses save metadata for the continue game list', () => {
    const state = createInitialGameState(1)
    state.time.day = 5
    state.money = 67890

    const saveFile = parseGameSaveFileJson(
      createGameSaveJson(state, new Date('2026-05-24T08:30:00.000Z')),
    )

    expect(saveFile.savedAt).toBe('2026-05-24T08:30:00.000Z')
    expect(saveFile.state.time.day).toBe(5)
    expect(saveFile.state.money).toBe(67890)
  })

  it('rejects JSON files that are not game saves', () => {
    expect(() => parseGameSaveJson('{"hello":"world"}')).toThrow('存档格式不匹配')
    expect(() => parseGameSaveFileJson('{"hello":"world"}')).toThrow('存档格式不匹配')
  })
})
