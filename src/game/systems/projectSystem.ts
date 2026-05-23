import { PROJECT_WORK_TRACKS } from '../constants'
import { CLIENT_COMPANIES } from '../data/clientCompanies'
import { PROJECT_TEMPLATES } from '../data/projectTemplates'
import { cloneState, randomChoice } from '../seed'
import type { GameState, ProjectContract, ProjectPhase, ProjectWorkTrack, SkillRole } from '../types'
import { calculateEmployeeOutput } from './employeeSystem'
import { addEvent, createId } from './eventSystem'
import { addFinanceRecord } from './financeSystem'
import { sendMail } from './mailSystem'

function createProjectContract(state: GameState): ProjectContract {
  const client = randomChoice(state.rngSeed, CLIENT_COMPANIES)
  state.rngSeed = client.seed
  const template = randomChoice(state.rngSeed, PROJECT_TEMPLATES)
  state.rngSeed = template.seed
  return {
    id: createId(state, 'project'),
    clientName: client.value,
    title: `${client.value}${template.value.title}`,
    amount: template.value.amount,
    deadlineDay: state.time.day + template.value.durationDays,
    dailyPenalty: template.value.dailyPenalty,
    overdueDays: 0,
    status: 'available',
    currentPhase: 'product',
    requirements: template.value.requirements,
    phaseProgress: {
      product: 0,
      design: 0,
      frontend: 0,
      backend: 0,
      testing: 0,
    },
    assignedEmployees: {},
  }
}

export function generateProjectContracts(state: GameState): GameState {
  const draft = cloneState(state)
  const activeContracts = draft.projectContracts.filter((contract) => contract.status !== 'available')
  const availableContracts = Array.from({ length: 3 }, () => createProjectContract(draft))
  draft.projectContracts = [...activeContracts, ...availableContracts]
  return draft
}

export function acceptProjectContract(state: GameState, projectId: string): GameState {
  const draft = cloneState(state)
  const project = draft.projectContracts.find((item) => item.id === projectId)
  if (!project || project.status !== 'available') {
    addEvent(draft, {
      type: 'project',
      title: '项目签约失败',
      message: '没有找到可签约的项目外包。',
      severity: 'warning',
    })
    return draft
  }
  project.status = 'accepted'
  project.acceptedDay = draft.time.day
  sendMail(draft, {
    type: 'contract_signed',
    from: project.clientName,
    subject: `已签署项目外包：${project.title}`,
    body: `项目金额 ${project.amount}，截止第 ${project.deadlineDay} 天，延期每日违约金 ${project.dailyPenalty}。`,
    relatedEntityId: project.id,
  })
  addEvent(draft, {
    type: 'project',
    title: '项目外包已签约',
    message: project.title,
    severity: 'success',
    relatedEntityId: project.id,
  })
  return draft
}

export function assignEmployeeToProject(
  state: GameState,
  employeeId: string,
  projectId: string,
  role: SkillRole,
): GameState {
  const draft = cloneState(state)
  const project = draft.projectContracts.find((item) => item.id === projectId)
  const employee = draft.employees.find((item) => item.id === employeeId)
  if (!project || !employee || employee.status === 'fired') {
    addEvent(draft, {
      type: 'project',
      title: '项目分配失败',
      message: '项目或员工不存在。',
      severity: 'warning',
    })
    return draft
  }
  if (!['accepted', 'active', 'overdue'].includes(project.status)) {
    addEvent(draft, {
      type: 'project',
      title: '项目分配失败',
      message: '该项目当前不能分配员工。',
      severity: 'warning',
    })
    return draft
  }
  if (employee.assignedTo && employee.assignedTo.id !== project.id) {
    addEvent(draft, {
      type: 'project',
      title: '项目分配失败',
      message: '该员工已经被分配到其他工作。',
      severity: 'warning',
    })
    return draft
  }
  project.assignedEmployees[role] = Array.from(
    new Set([...(project.assignedEmployees[role] ?? []), employee.id]),
  )
  project.status = project.status === 'overdue' ? 'overdue' : 'active'
  employee.assignedTo = { type: 'project', id: project.id, role }
  addEvent(draft, {
    type: 'project',
    title: '项目成员已分配',
    message: `${employee.nickname ?? employee.name} 负责 ${role}。`,
    severity: 'success',
    relatedEntityId: project.id,
  })
  return draft
}

function tracksForPhase(phase: ProjectPhase): ProjectWorkTrack[] {
  if (phase === 'development') {
    return ['frontend', 'backend']
  }
  return [phase]
}

function updateCurrentPhase(project: ProjectContract): void {
  if (project.phaseProgress.product < 100) {
    project.currentPhase = 'product'
    return
  }
  if (project.phaseProgress.design < 100) {
    project.currentPhase = 'design'
    return
  }
  if (project.phaseProgress.frontend < 100 || project.phaseProgress.backend < 100) {
    project.currentPhase = 'development'
    return
  }
  project.currentPhase = 'testing'
}

function isProjectComplete(project: ProjectContract): boolean {
  return PROJECT_WORK_TRACKS.every((track) => project.phaseProgress[track] >= 100)
}

function completeProject(state: GameState, project: ProjectContract): void {
  if (project.status === 'completed') {
    return
  }
  project.status = 'completed'
  project.completedDay = state.time.day
  const recordId = addFinanceRecord(state, {
    type: 'project_income',
    amount: project.amount,
    reason: `${project.title} 项目完成款`,
    relatedEntityId: project.id,
  })
  project.settlementFinanceRecordId = recordId
  sendMail(state, {
    type: 'project_completed',
    from: project.clientName,
    subject: `项目验收通过：${project.title}`,
    body: `项目已完成，甲方支付全款 ${project.amount}。延期 ${project.overdueDays} 天的违约金不退还。`,
    relatedEntityId: project.id,
    financeRecordId: recordId,
  })
  addEvent(state, {
    type: 'project',
    title: '项目完成',
    message: `${project.title} 完成并收款 ${project.amount}。`,
    severity: 'success',
    relatedEntityId: project.id,
  })
}

export function advanceProjectProgress(state: GameState, minutes: number): GameState {
  const draft = cloneState(state)
  for (let minute = 0; minute < minutes; minute += 1) {
    for (const project of draft.projectContracts) {
      if (!['active', 'overdue'].includes(project.status)) {
        continue
      }
      updateCurrentPhase(project)
      for (const track of tracksForPhase(project.currentPhase)) {
        const role = track as SkillRole
        const employeeIds = project.assignedEmployees[role] ?? []
        for (const employeeId of employeeIds) {
          const employee = draft.employees.find((item) => item.id === employeeId)
          if (!employee || employee.status === 'fired') {
            continue
          }
          project.phaseProgress[track] = Math.min(
            100,
            project.phaseProgress[track] + calculateEmployeeOutput(draft, employee, role),
          )
        }
      }
      updateCurrentPhase(project)
      if (isProjectComplete(project)) {
        completeProject(draft, project)
      }
    }
  }
  return draft
}

export function settleProjectsEndOfDay(state: GameState, endedDay: number): GameState {
  const draft = cloneState(state)
  for (const project of draft.projectContracts) {
    if (project.status === 'completed' || project.status === 'available') {
      continue
    }
    if (isProjectComplete(project)) {
      completeProject(draft, project)
      continue
    }
    if (endedDay > project.deadlineDay) {
      project.status = 'overdue'
      project.overdueDays += 1
      const recordId = addFinanceRecord(draft, {
        type: 'project_penalty',
        amount: -project.dailyPenalty,
        reason: `${project.title} 延期违约金`,
        relatedEntityId: project.id,
      })
      sendMail(draft, {
        type: 'project_overdue',
        from: project.clientName,
        subject: `项目延期扣款：${project.title}`,
        body: `项目仍未完成，今日扣除延期违约金 ${project.dailyPenalty}。`,
        relatedEntityId: project.id,
        financeRecordId: recordId,
      })
      addEvent(draft, {
        type: 'project',
        title: '项目延期',
        message: `${project.title} 今日扣除延期违约金 ${project.dailyPenalty}。`,
        severity: 'danger',
        relatedEntityId: project.id,
      })
    }
  }
  return draft
}
