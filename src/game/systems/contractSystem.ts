import { cloneState, randomChoice, randomInt } from '../seed'
import type { AssignmentMode, GameState, LaborContract, SkillRole } from '../types'
import {
  assignEmployeeToTarget,
  cancelPendingAssignmentsForLaborContract,
  releaseLaborContractAssignment,
} from './assignmentSystem'
import { dynamicContractRefreshCount, randomClientByTrust } from './clientCompanySystem'
import { addEvent, createId } from './eventSystem'
import { addFinanceRecord } from './financeSystem'
import { sendMail } from './mailSystem'

const laborRoles: SkillRole[] = ['product', 'design', 'frontend', 'backend', 'testing']

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
  const dailyBudget = Math.round(260 + ability.value * 4 + (urgency === 'urgent' ? 180 : 0))
  return {
    id: createId(state, 'labor'),
    clientName: client.name,
    title: `${client.name}${urgency === 'urgent' ? '急召' : '驻场'}${role.value}`,
    requiredRole: role.value,
    requiredAbility: ability.value,
    dailyBudget,
    urgency,
    deadlineDay: state.time.day + (urgency === 'urgent' ? 1 : 2),
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
  sendMail(draft, {
    type: 'contract_signed',
    from: contract.clientName,
    subject: `已签署人力外包：${contract.title}`,
    body: `请在第 ${contract.deadlineDay} 天下班前安排 ${contract.requiredRole}，甲方日预算 ${contract.dailyBudget}。`,
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

export function settleLaborContractsEndOfDay(state: GameState, endedDay: number): GameState {
  const draft = cloneState(state)
  for (const contract of draft.laborContracts) {
    if (!['accepted', 'active', 'warning'].includes(contract.status)) {
      continue
    }

    if (!contract.assignedEmployeeId && endedDay > contract.deadlineDay) {
      const recordId = addFinanceRecord(draft, {
        type: 'labor_penalty',
        amount: -contract.dailyBudget,
        reason: `${contract.title} 未按期安排人员违约金`,
        relatedEntityId: contract.id,
      })
      sendMail(draft, {
        type: 'contract_breach',
        from: contract.clientName,
        subject: `人力外包违约：${contract.title}`,
        body: `未按期安排合适员工，今日扣除违约金 ${contract.dailyBudget}。`,
        relatedEntityId: contract.id,
        financeRecordId: recordId,
      })
      addEvent(draft, {
        type: 'contract',
        title: '人力外包违约',
        message: `${contract.title} 扣除 ${contract.dailyBudget}。`,
        severity: 'danger',
        relatedEntityId: contract.id,
      })
      continue
    }

    if (!contract.assignedEmployeeId) {
      continue
    }

    const employee = draft.employees.find((item) => item.id === contract.assignedEmployeeId)
    const ability = employee?.realSkillAbilities[contract.requiredRole] ?? 0
    if (ability < contract.requiredAbility) {
      contract.satisfaction = Math.max(0, contract.satisfaction - 25)
    } else {
      contract.satisfaction = Math.min(100, contract.satisfaction + 8)
    }

    if (contract.satisfaction < 50 && contract.status === 'active') {
      contract.status = 'warning'
      contract.warningDay = endedDay
      sendMail(draft, {
        type: 'contract_warning',
        from: contract.clientName,
        subject: `驻场满意度预警：${contract.title}`,
        body: '甲方认为当前员工产出不足，请在 1 个工作日内调整。',
        relatedEntityId: contract.id,
      })
    }

    if (contract.status === 'warning' && contract.warningDay && endedDay > contract.warningDay) {
      if (contract.satisfaction < 50) {
        contract.status = 'terminated'
        releaseLaborContractAssignment(draft, contract)
        cancelPendingAssignmentsForLaborContract(draft, contract)
        sendMail(draft, {
          type: 'contract_breach',
          from: contract.clientName,
          subject: `人力外包终止：${contract.title}`,
          body: '整改期后满意度仍不达标，甲方终止合作。',
          relatedEntityId: contract.id,
        })
      } else {
        contract.status = 'active'
        contract.warningDay = undefined
      }
    }

    if (contract.status === 'active') {
      addFinanceRecord(draft, {
        type: 'labor_income',
        amount: contract.dailyBudget,
        reason: `${contract.title} 每日收入`,
        relatedEntityId: contract.id,
      })
    }
  }
  return draft
}
