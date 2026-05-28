import { describe, expect, it } from 'vitest'

import { WORK_START_MINUTE } from '../../game/constants'
import { createInitialGameState } from '../../game/initialState'
import { acceptLaborContract, assignEmployeeToLabor, settleLaborContractsEndOfDay } from '../../game/systems/contractSystem'
import { applyEmployeeDiscipline } from '../../game/systems/employeeSystem'
import { resolveProjectClientEvent } from '../../game/systems/projectClientEventSystem'
import { acceptProjectContract, advanceProjectProgress, assignEmployeeToProject } from '../../game/systems/projectSystem'
import { sendOffer } from '../../game/systems/recruitingSystem'
import { getTutorialMinimumOffer, markTutorialEmployeeStatusHandled, syncTutorialProgress } from '../../game/systems/tutorialSystem'
import type { GameState, SkillRole } from '../../game/types'

function completeStarterLaborTutorial(state: GameState): GameState {
  const welcomeMailId = state.tutorial.welcomeMailId
  const starterContractId = state.tutorial.starterLaborContractId
  const starterResumeId = state.tutorial.starterResumeIds[0]
  if (!welcomeMailId || !starterContractId || !starterResumeId) {
    throw new Error('expected starter tutorial ids')
  }

  state.mailbox = state.mailbox.map((mail) => (mail.id === welcomeMailId ? { ...mail, read: true } : mail))
  state = syncTutorialProgress(state)
  state = syncTutorialProgress(acceptLaborContract(state, starterContractId))
  state = syncTutorialProgress(sendOffer(state, starterResumeId, 999, 1))

  const employeeId = state.employees[0]?.id
  if (!employeeId) {
    throw new Error('expected employee')
  }
  state = syncTutorialProgress(assignEmployeeToLabor(state, employeeId, starterContractId))
  state = syncTutorialProgress(settleLaborContractsEndOfDay(state, state.time.day))
  state.time.day = 2
  return syncTutorialProgress(state)
}

describe('tutorialSystem', () => {
  it('creates starter tutorial state, labor contract, resumes, and welcome mail', () => {
    const state = createInitialGameState(1)
    const starterContract = state.laborContracts.find((contract) => contract.id === state.tutorial.starterLaborContractId)
    const starterResumes = state.resumes.filter((resume) => state.tutorial.starterResumeIds.includes(resume.id))

    expect(state.tutorial.enabled).toBe(true)
    expect(state.tutorial.completed).toBe(false)
    expect(state.tutorial.currentNodeId).toBe('read_welcome_mail')
    expect(state.tutorial.nodes.read_welcome_mail.nextId).toBe('review_labor_contract')
    expect(state.tutorial.nodes.read_welcome_mail.completed).toBe(false)
    expect(starterContract?.requiredRole).toBe('frontend')
    expect(starterContract?.requiredAbility).toBe(50)
    expect(starterContract?.dailyBudget).toBe(560)
    expect(state.tutorial.starterResumeIds).toHaveLength(1)
    expect(starterResumes).toHaveLength(1)
    expect(starterResumes[0]?.name).toBe('林子轩')
    expect(state.mailbox.some((mail) => mail.id === state.tutorial.welcomeMailId && !mail.read)).toBe(true)
  })

  it('guarantees starter candidate offer acceptance and clamps tutorial compensation', () => {
    const state = createInitialGameState(1)
    const starterResume = state.resumes.find((resume) => state.tutorial.starterResumeIds.includes(resume.id))
    if (!starterResume) {
      throw new Error('expected starter resume')
    }

    const result = sendOffer(state, starterResume.id, 0, 0)
    const employee = result.employees[0]
    const minimumOffer = getTutorialMinimumOffer(starterResume)

    expect(result.employees).toHaveLength(1)
    expect(employee?.sourceResumeId).toBe(starterResume.id)
    expect(employee?.salaryPerDay).toBe(minimumOffer.salaryPerDay)
    expect(employee?.socialInsuranceRatio).toBe(minimumOffer.socialInsuranceRatio)
    expect(result.resumes.some((resume) => resume.id === starterResume.id)).toBe(false)
  })

  it('opens project tutorial after signing, hiring, assigning, and first labor settlement', () => {
    let state = createInitialGameState(1)
    const welcomeMailId = state.tutorial.welcomeMailId
    const starterContractId = state.tutorial.starterLaborContractId
    const starterResumeId = state.tutorial.starterResumeIds[0]
    if (!welcomeMailId || !starterContractId || !starterResumeId) {
      throw new Error('expected starter tutorial ids')
    }

    state.mailbox = state.mailbox.map((mail) => (mail.id === welcomeMailId ? { ...mail, read: true } : mail))
    state = syncTutorialProgress(state)
    expect(state.tutorial.currentNodeId).toBe('review_labor_contract')
    expect(state.tutorial.nodes.read_welcome_mail.completed).toBe(true)

    state = syncTutorialProgress(acceptLaborContract(state, starterContractId))
    expect(state.tutorial.currentNodeId).toBe('send_offer')

    state = syncTutorialProgress(sendOffer(state, starterResumeId, 999, 1))
    expect(state.tutorial.currentNodeId).toBe('assign_employee')

    const employeeId = state.employees[0]?.id
    if (!employeeId) {
      throw new Error('expected employee')
    }
    state = syncTutorialProgress(assignEmployeeToLabor(state, employeeId, starterContractId))
    expect(state.tutorial.currentNodeId).toBe('start_first_day_time')

    state = syncTutorialProgress(settleLaborContractsEndOfDay(state, state.time.day))
    expect(state.tutorial.completed).toBe(false)

    state.time.day = 2
    state = syncTutorialProgress(state)
    expect(state.tutorial.currentNodeId).toBe('read_project_mail')
    expect(state.tutorial.starterProjectContractId).toBeTruthy()
    expect(state.tutorial.starterProjectResumeIds).toHaveLength(5)
  })

  it('triggers first day employee status lesson after speeding up and completes after discipline', () => {
    let state = createInitialGameState(1)
    const welcomeMailId = state.tutorial.welcomeMailId
    const starterContractId = state.tutorial.starterLaborContractId
    const starterResumeId = state.tutorial.starterResumeIds[0]
    if (!welcomeMailId || !starterContractId || !starterResumeId) {
      throw new Error('expected starter tutorial ids')
    }

    state.mailbox = state.mailbox.map((mail) => (mail.id === welcomeMailId ? { ...mail, read: true } : mail))
    state = syncTutorialProgress(acceptLaborContract(syncTutorialProgress(state), starterContractId))
    state = syncTutorialProgress(sendOffer(state, starterResumeId, 999, 1))
    const employeeId = state.employees[0]?.id
    if (!employeeId) {
      throw new Error('expected employee')
    }
    state = syncTutorialProgress(assignEmployeeToLabor(state, employeeId, starterContractId))
    expect(state.tutorial.currentNodeId).toBe('start_first_day_time')

    const eventCountBeforeStatusLesson = state.events.length
    state.time.speed = 2
    state.time.paused = false
    state.time.minuteOfDay += 1
    state = syncTutorialProgress(state)

    expect(state.tutorial.currentNodeId).toBe('catch_slacking_employee')
    expect(state.tutorial.starterStatusTriggered).toBe(true)
    expect(state.tutorial.starterStatusEmployeeId).toBe(employeeId)
    expect(state.employees.find((employee) => employee.id === employeeId)?.status).toBe('slacking')
    expect(state.time.paused).toBe(true)
    expect(state.events).toHaveLength(eventCountBeforeStatusLesson)

    state = markTutorialEmployeeStatusHandled(applyEmployeeDiscipline(state, employeeId, 'verbal_warn'), employeeId)
    expect(state.tutorial.starterStatusHandled).toBe(true)
    expect(state.tutorial.currentNodeId).toBe('settle_first_day')
    expect(state.employees.find((employee) => employee.id === employeeId)?.status).toBe('working')
    expect(state.events.some((event) => event.type === 'employee' && event.title === '员工处理完成')).toBe(true)
  })

  it('guarantees project tutorial offers and creates controlled deadline event', () => {
    let state = completeStarterLaborTutorial(createInitialGameState(1))
    const projectMailId = state.tutorial.projectMailId
    const projectId = state.tutorial.starterProjectContractId
    if (!projectMailId || !projectId) {
      throw new Error('expected starter project tutorial ids')
    }

    state.mailbox = state.mailbox.map((mail) => (mail.id === projectMailId ? { ...mail, read: true } : mail))
    state = syncTutorialProgress(state)
    expect(state.tutorial.currentNodeId).toBe('review_project_contract')

    state = syncTutorialProgress(acceptProjectContract(state, projectId))
    expect(state.tutorial.currentNodeId).toBe('hire_project_team')

    for (const resumeId of [...state.tutorial.starterProjectResumeIds]) {
      const resume = state.resumes.find((item) => item.id === resumeId)
      if (!resume) {
        throw new Error('expected project resume')
      }
      state = syncTutorialProgress(sendOffer(state, resume.id, 0, 0))
    }
    expect(state.tutorial.currentNodeId).toBe('assign_project_team')

    const roleByResume = new Map(
      state.tutorial.starterProjectResumeIds.map((resumeId) => {
        const employee = state.employees.find((item) => item.sourceResumeId === resumeId)
        const role = employee?.resumeSkills[0]?.role
        if (!employee || !role) {
          throw new Error('expected project employee')
        }
        return [employee.id, role] as [string, SkillRole]
      }),
    )
    for (const [employeeId, role] of roleByResume.entries()) {
      state = syncTutorialProgress(assignEmployeeToProject(state, employeeId, projectId, role))
    }

    expect(state.tutorial.currentNodeId).toBe('resolve_deadline_cut_event')
    expect(state.pendingProjectClientEvents.some((event) => event.id === state.tutorial.projectClientEventId)).toBe(true)
    expect(state.pendingProjectClientEvents.find((event) => event.id === state.tutorial.projectClientEventId)?.options.map((option) => option.id)).toEqual([
      'compress_deadline',
      'ignore_request',
    ])
    expect(state.time.paused).toBe(true)
  })

  it('waits until next morning when starter project team is assigned after noon', () => {
    let state = completeStarterLaborTutorial(createInitialGameState(1))
    const projectMailId = state.tutorial.projectMailId
    const projectId = state.tutorial.starterProjectContractId
    if (!projectMailId || !projectId) {
      throw new Error('expected starter project tutorial ids')
    }

    state.mailbox = state.mailbox.map((mail) => (mail.id === projectMailId ? { ...mail, read: true } : mail))
    state = syncTutorialProgress(acceptProjectContract(syncTutorialProgress(state), projectId))
    for (const resumeId of [...state.tutorial.starterProjectResumeIds]) {
      state = syncTutorialProgress(sendOffer(state, resumeId, 999, 1))
    }

    state.time.minuteOfDay = 13 * 60
    for (const resumeId of state.tutorial.starterProjectResumeIds) {
      const employee = state.employees.find((item) => item.sourceResumeId === resumeId)
      const role = employee?.resumeSkills[0]?.role
      if (!employee || !role) {
        throw new Error('expected project employee')
      }
      state = syncTutorialProgress(assignEmployeeToProject(state, employee.id, projectId, role))
    }

    expect(state.tutorial.currentNodeId).toBe('wait_project_deadline_cut_event')
    expect(state.tutorial.projectClientEventId).toBeUndefined()
    expect(state.pendingProjectClientEvents).toHaveLength(0)

    state.time.day += 1
    state.time.minuteOfDay = WORK_START_MINUTE
    state = syncTutorialProgress(state)

    expect(state.tutorial.currentNodeId).toBe('resolve_deadline_cut_event')
    expect(state.pendingProjectClientEvents.some((event) => event.id === state.tutorial.projectClientEventId)).toBe(true)
    expect(state.time.paused).toBe(true)
  })

  it('completes project tutorial after resolving deadline cut and collecting income', () => {
    let state = completeStarterLaborTutorial(createInitialGameState(1))
    const projectMailId = state.tutorial.projectMailId
    const projectId = state.tutorial.starterProjectContractId
    if (!projectMailId || !projectId) {
      throw new Error('expected starter project tutorial ids')
    }

    state.mailbox = state.mailbox.map((mail) => (mail.id === projectMailId ? { ...mail, read: true } : mail))
    state = syncTutorialProgress(acceptProjectContract(syncTutorialProgress(state), projectId))
    for (const resumeId of [...state.tutorial.starterProjectResumeIds]) {
      state = syncTutorialProgress(sendOffer(state, resumeId, 999, 1))
    }
    for (const resumeId of state.tutorial.starterProjectResumeIds) {
      const employee = state.employees.find((item) => item.sourceResumeId === resumeId)
      const role = employee?.resumeSkills[0]?.role
      if (!employee || !role) {
        throw new Error('expected project employee')
      }
      state = syncTutorialProgress(assignEmployeeToProject(state, employee.id, projectId, role))
    }

    const eventId = state.tutorial.projectClientEventId
    if (!eventId) {
      throw new Error('expected tutorial event')
    }
    state = syncTutorialProgress(resolveProjectClientEvent(state, eventId, 'compress_deadline'))
    expect(state.projectContracts.find((project) => project.id === projectId)?.deadlineDay).toBe(state.time.day)
    expect(state.tutorial.currentNodeId).toBe('finish_starter_project')

    state = syncTutorialProgress(advanceProjectProgress(state, 480))
    expect(state.financeRecords.some((record) => record.type === 'project_income' && record.relatedEntityId === projectId)).toBe(true)
    expect(state.tutorial.completed).toBe(true)
    expect(state.tutorial.currentNodeId).toBe('completed')
  })
})
