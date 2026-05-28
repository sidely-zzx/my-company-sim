import { LABOR_OUTPUT_MISS_TRUST_DELTA } from '../constants'
import { cloneState, randomChoice, randomInt } from '../seed'
import type { AssignmentMode, GameState, LaborContract, SkillRole } from '../types'
import {
  assignEmployeeToTarget,
  cancelPendingAssignmentsForLaborContract,
  releaseLaborContractAssignment,
} from './assignmentSystem'
import { dynamicContractRefreshCount, randomClientByTrust, updateClientTrust } from './clientCompanySystem'
import { addEvent, createId } from './eventSystem'
import { addFinanceRecord } from './financeSystem'
import { calculateLaborRequiredOutput, ensureLaborOutputDay, resetLaborDailyOutput } from './laborOutputSystem'
import { sendMail } from './mailSystem'

const laborRoles: SkillRole[] = ['product', 'design', 'frontend', 'backend', 'testing']

function randomLaborDurationDays(state: GameState): number {
  const shortRoll = randomInt(state.rngSeed, 1, 100)
  state.rngSeed = shortRoll.seed
  const range = shortRoll.value <= 80 ? randomInt(state.rngSeed, 5, 15) : randomInt(state.rngSeed, 16, 30)
  state.rngSeed = range.seed
  return range.value
}

function createLaborContract(state: GameState): LaborContract | undefined {
  const client = randomClientByTrust(state)
  if (!client) {
    return undefined
  }

  const role = randomChoice(state.rngSeed, laborRoles)
  state.rngSeed = role.seed
  const urgentRoll = randomInt(state.rngSeed, 0, 100)
  state.rngSeed = urgentRoll.seed
  const ability = randomInt(state.rngSeed, 45, 85)
  state.rngSeed = ability.seed
  const urgency = urgentRoll.value > 55 ? 'urgent' : 'normal'
  const durationDays = randomLaborDurationDays(state)
  const dailyBudget = Math.round(260 + ability.value * 4 + (urgency === 'urgent' ? 180 : 0))
  const endDay = state.time.day + durationDays - 1
  return {
    id: createId(state, 'labor'),
    clientCompanyId: client.id,
    clientName: client.name,
    clientProfile: client,
    title: `${client.name}${urgency === 'urgent' ? '急召' : '驻场'}${role.value}`,
    requiredRole: role.value,
    requiredAbility: ability.value,
    dailyBudget,
    urgency,
    durationDays,
    endDay,
    deadlineDay: endDay,
    todayOutput: 0,
    todayRequiredOutput: 0,
    todayOutputDay: state.time.day,
    satisfaction: 100,
    status: 'available',
  }
}

export function generateLaborContracts(state: GameState): GameState {
  const draft = cloneState(state)
  const activeContracts = draft.laborContracts.filter((contract) => contract.status !== 'available')
  const availableContracts = Array.from({ length: dynamicContractRefreshCount(draft) }, () => createLaborContract(draft)).filter(
    (contract): contract is LaborContract => Boolean(contract),
  )
  draft.laborContracts = [...activeContracts, ...availableContracts]
  return draft
}

export function acceptLaborContract(state: GameState, contractId: string): GameState {
  const draft = cloneState(state)
  const contract = draft.laborContracts.find((item) => item.id === contractId)
  if (!contract || contract.status !== 'available') {
    addEvent(draft, {
      type: 'contract',
      title: '签约失败',
      message: '没有找到可签约的人力外包合同。',
      severity: 'warning',
    })
    return draft
  }
  contract.status = 'accepted'
  contract.acceptedDay = draft.time.day
  resetLaborDailyOutput(contract, draft.time.day)
  sendMail(draft, {
    type: 'contract_signed',
    from: contract.clientName,
    subject: `已签署人力外包：${contract.title}`,
    body: `合同服务期 ${contract.durationDays} 天，到第 ${contract.endDay} 天结束。可随时安排驻场人员，只有当天产出达标才会结算日预算 ${contract.dailyBudget}。`,
    relatedEntityId: contract.id,
  })
  addEvent(draft, {
    type: 'contract',
    title: '人力外包已签约',
    message: contract.title,
    severity: 'success',
    relatedEntityId: contract.id,
  })
  return draft
}

export function assignEmployeeToLabor(
  state: GameState,
  employeeId: string,
  contractId: string,
  mode: AssignmentMode = 'immediate',
): GameState {
  const draft = cloneState(state)
  assignEmployeeToTarget(draft, employeeId, { type: 'labor', id: contractId }, mode)
  return draft
}

export function resolveLaborClientNotice(
  state: GameState,
  noticeId: string,
  replacementEmployeeId?: string,
  mode: AssignmentMode = 'immediate',
): GameState {
  const draft = cloneState(state)
  const notice = draft.pendingLaborClientNotices.find((item) => item.id === noticeId)
  if (!notice) {
    addEvent(draft, {
      type: 'contract',
      title: '人力通知处理失败',
      message: '没有找到待处理的人力外包甲方通知。',
      severity: 'warning',
    })
    return draft
  }

  if (replacementEmployeeId) {
    assignEmployeeToTarget(draft, replacementEmployeeId, { type: 'labor', id: notice.contractId }, mode)
    const contract = draft.laborContracts.find((item) => item.id === notice.contractId)
    if (contract?.assignedEmployeeId !== replacementEmployeeId && mode === 'immediate') {
      return draft
    }
  }

  draft.pendingLaborClientNotices = draft.pendingLaborClientNotices.filter((item) => item.id !== noticeId)
  if (
    draft.pendingLaborClientNotices.length === 0 &&
    draft.pendingProjectClientEvents.length === 0 &&
    draft.activeDailyBriefingDay === undefined
  ) {
    draft.time.paused = false
  }
  addEvent(draft, {
    type: 'contract',
    title: '人力外包通知已处理',
    message: replacementEmployeeId
      ? `${notice.contractTitle} 已按甲方反馈换人。`
      : `${notice.contractTitle} 的产出反馈已确认。`,
    severity: replacementEmployeeId ? 'success' : 'info',
    relatedEntityId: notice.contractId,
  })
  return draft
}

export function settleLaborContractsEndOfDay(state: GameState, endedDay: number): GameState {
  const draft = cloneState(state)
  for (const contract of draft.laborContracts) {
    if (!['accepted', 'active', 'warning'].includes(contract.status)) {
      continue
    }

    ensureLaborOutputDay(contract, endedDay)

    if (contract.assignedEmployeeId) {
      const employee = draft.employees.find((item) => item.id === contract.assignedEmployeeId)
      const actualOutput = Math.round(contract.todayOutput)
      const requiredOutput = Math.round(calculateLaborRequiredOutput(contract, endedDay))
      contract.todayRequiredOutput = requiredOutput
      contract.lastOutputCheckDay = endedDay
      contract.lastOutputActual = actualOutput
      contract.lastOutputRequired = requiredOutput

      if (requiredOutput > 0 && actualOutput >= requiredOutput) {
        contract.satisfaction = Math.min(100, contract.satisfaction + 8)
        addFinanceRecord(draft, {
          type: 'labor_income',
          amount: contract.dailyBudget,
          reason: `${contract.title} 每日收入`,
          relatedEntityId: contract.id,
        })
      }

      if (requiredOutput > 0 && actualOutput < requiredOutput) {
        contract.satisfaction = Math.max(0, contract.satisfaction - 20)
        updateClientTrust(draft, contract.clientCompanyId, contract.clientProfile?.trust, LABOR_OUTPUT_MISS_TRUST_DELTA)
        draft.pendingLaborClientNotices.push({
          id: createId(draft, 'labor-notice'),
          contractId: contract.id,
          contractTitle: contract.title,
          clientName: contract.clientName,
          employeeId: employee?.id,
          employeeName: employee ? employee.nickname ?? employee.name : undefined,
          triggeredDay: endedDay + 1,
          checkedDay: endedDay,
          actualOutput,
          requiredOutput,
        })
        draft.time.paused = true
        addEvent(draft, {
          type: 'contract',
          title: '人力外包产出未达标',
          message: `${contract.title} 昨日产出 ${actualOutput}/${requiredOutput}，当天不结算，${contract.clientName} trust ${LABOR_OUTPUT_MISS_TRUST_DELTA}。`,
          severity: 'warning',
          relatedEntityId: contract.id,
        })
      }
    }

    if (endedDay >= contract.endDay) {
      contract.status = 'completed'
      releaseLaborContractAssignment(draft, contract)
      cancelPendingAssignmentsForLaborContract(draft, contract)
      sendMail(draft, {
        type: 'contract_completed',
        from: contract.clientName,
        subject: `人力外包到期：${contract.title}`,
        body: `这份 ${contract.durationDays} 天的人力外包合同已到期，驻场人员已自动释放。`,
        relatedEntityId: contract.id,
      })
      addEvent(draft, {
        type: 'contract',
        title: '人力外包合同到期',
        message: `${contract.title} 服务期结束，人员已释放。`,
        severity: 'success',
        relatedEntityId: contract.id,
      })
    } else {
      resetLaborDailyOutput(contract, endedDay + 1)
    }
  }
  return draft
}
