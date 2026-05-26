import { describe, expect, it } from 'vitest'

import { refreshResumes, sendOffer } from '../../game/systems/recruitingSystem'
import { createTestState } from './testHelpers'

describe('recruitingSystem', () => {
  it('limits normal resume refreshes to three per day', () => {
    let state = createTestState()
    state.market.resumeRefreshesUsed = 0

    state = refreshResumes(state)
    state = refreshResumes(state)
    state = refreshResumes(state)
    const blocked = refreshResumes(state)

    expect(blocked.market.resumeRefreshesUsed).toBe(3)
    expect(blocked.events.at(-1)?.title).toBe('刷新简历失败')
  })

  it('hires a candidate when the offer is accepted', () => {
    const state = createTestState(10)
    const resume = state.resumes[0]
    if (!resume) {
      throw new Error('expected initial resume')
    }

    const result = sendOffer(state, resume.id, resume.expectedSalaryPerDay * 2, 1)

    expect(result.employees).toHaveLength(1)
    expect(result.resumes.some((item) => item.id === resume.id)).toBe(false)
  })

  it('keeps a rejected candidate visible and blocks another offer', () => {
    const state = createTestState(1)
    const resume = state.resumes[0]
    if (!resume) {
      throw new Error('expected initial resume')
    }

    const result = sendOffer(state, resume.id, 0, 0)
    const blocked = sendOffer(result, resume.id, resume.expectedSalaryPerDay * 2, 1)

    expect(result.employees).toHaveLength(0)
    expect(result.events.at(-1)?.title).toBe('Offer 被拒')
    expect(result.resumes.find((item) => item.id === resume.id)?.offerRejected).toBe(true)
    expect(blocked.employees).toHaveLength(0)
    expect(blocked.events.at(-1)?.message).toBe(`${resume.name} 已经拒绝过 offer。`)
  })
})
