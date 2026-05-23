import { SOCIAL_INSURANCE_COMPANY_RATE } from '../constants'
import { clamp, cloneState, nextRandom } from '../seed'
import type { ArbitrationReason, GameState } from '../types'
import { addEvent, createId } from './eventSystem'
import { addFinanceRecord } from './financeSystem'
import { sendMail } from './mailSystem'

function calculateComplaintChance(socialInsuranceRatio: number, satisfaction: number): number {
  return clamp((1 - socialInsuranceRatio) * 0.25 + (50 - satisfaction) / 500, 0, 0.75)
}

function calculateArbitrationChance(
  arbitrationTendency: number,
  satisfaction: number,
  socialInsuranceRatio: number,
): number {
  const base = arbitrationTendency / 100
  const satisfactionPressure = Math.max(0, 40 - satisfaction) / 80
  const socialPressure = Math.max(0, 1 - socialInsuranceRatio) * 0.35
  return clamp(base * 0.25 + satisfactionPressure + socialPressure, 0, 0.9)
}

export function processSocialInsuranceComplaints(state: GameState): GameState {
  const draft = cloneState(state)
  for (const employee of draft.employees) {
    if (
      employee.status === 'fired' ||
      employee.socialInsuranceRatio >= 1 ||
      employee.satisfaction >= 50
    ) {
      continue
    }

    const roll = nextRandom(draft.rngSeed)
    draft.rngSeed = roll.seed
    if (roll.value > calculateComplaintChance(employee.socialInsuranceRatio, employee.satisfaction)) {
      continue
    }

    const missedAmount = Math.round(
      employee.salaryPerDay * (1 - employee.socialInsuranceRatio) * SOCIAL_INSURANCE_COMPANY_RATE,
    )
    const penalty = missedAmount * 2
    const recordId = addFinanceRecord(draft, {
      type: 'social_insurance_complaint',
      amount: -penalty,
      reason: `${employee.nickname ?? employee.name} 社保公积金投诉补缴双倍扣款`,
      relatedEntityId: employee.id,
    })
    sendMail(draft, {
      type: 'social_insurance_complaint',
      from: '社保公积金投诉平台',
      subject: `社保公积金投诉：${employee.nickname ?? employee.name}`,
      body: `员工投诉社保公积金未足额缴纳，欠缴 ${missedAmount}，已按双倍扣除 ${penalty}。`,
      relatedEntityId: employee.id,
      financeRecordId: recordId,
    })
    addEvent(draft, {
      type: 'warning',
      title: '社保公积金投诉',
      message: `${employee.nickname ?? employee.name} 投诉成功，扣除 ${penalty}。`,
      severity: 'danger',
      relatedEntityId: employee.id,
    })
  }
  return draft
}

export function processArbitrationFilings(state: GameState): GameState {
  const draft = cloneState(state)
  for (const employee of draft.employees) {
    if (
      employee.status === 'fired' ||
      employee.satisfaction >= 40 ||
      draft.pendingArbitrations.some(
        (item) => item.employeeId === employee.id && item.status === 'pending',
      )
    ) {
      continue
    }

    const roll = nextRandom(draft.rngSeed)
    draft.rngSeed = roll.seed
    if (
      roll.value >
      calculateArbitrationChance(
        employee.arbitrationTendency,
        employee.satisfaction,
        employee.socialInsuranceRatio,
      )
    ) {
      continue
    }

    const reason: ArbitrationReason =
      employee.socialInsuranceRatio < 1 ? 'underpaid_social_insurance' : 'low_satisfaction'
    const claimedAmount = Math.round(
      employee.salaryPerDay * 30 * Math.max(1, employee.workYears || 1),
    )
    const arbitrationCase = {
      id: createId(draft, 'arbitration'),
      employeeId: employee.id,
      employeeName: employee.nickname ?? employee.name,
      filedDay: draft.time.day,
      resultDay: draft.time.day + 3,
      reason,
      claimedAmount,
      status: 'pending' as const,
      mailSent: false,
    }
    draft.pendingArbitrations.push(arbitrationCase)
    sendMail(draft, {
      type: 'labor_dispute_filed',
      from: '劳动仲裁委员会',
      subject: `仲裁立案：${arbitrationCase.employeeName}`,
      body: `员工发起仲裁，诉求金额 ${claimedAmount}，预计第 ${arbitrationCase.resultDay} 天出结果。`,
      relatedEntityId: arbitrationCase.id,
    })
    addEvent(draft, {
      type: 'warning',
      title: '员工发起仲裁',
      message: `${arbitrationCase.employeeName} 发起仲裁，诉求 ${claimedAmount}。`,
      severity: 'danger',
      relatedEntityId: employee.id,
    })
  }
  return draft
}

export function processArbitrationResults(state: GameState, endedDay: number): GameState {
  const draft = cloneState(state)
  for (const arbitrationCase of draft.pendingArbitrations) {
    if (arbitrationCase.status !== 'pending' || endedDay < arbitrationCase.resultDay) {
      continue
    }

    const employee = draft.employees.find((item) => item.id === arbitrationCase.employeeId)
    const legalRisk = employee ? employee.socialInsuranceRatio < 1 || employee.satisfaction < 30 : true
    const roll = nextRandom(draft.rngSeed)
    draft.rngSeed = roll.seed
    const employeeWins = legalRisk || roll.value < 0.35
    arbitrationCase.status = employeeWins ? 'won_by_employee' : 'rejected'
    arbitrationCase.mailSent = true

    let financeRecordId: string | undefined
    if (employeeWins) {
      financeRecordId = addFinanceRecord(draft, {
        type: 'arbitration',
        amount: -arbitrationCase.claimedAmount,
        reason: `${arbitrationCase.employeeName} 仲裁赔偿`,
        relatedEntityId: arbitrationCase.id,
      })
    }

    sendMail(draft, {
      type: 'labor_dispute_result',
      from: '劳动仲裁委员会',
      subject: `仲裁结果：${arbitrationCase.employeeName}`,
      body: employeeWins
        ? `员工胜诉，公司需支付 ${arbitrationCase.claimedAmount}。`
        : '仲裁请求被驳回，本次不产生赔偿。',
      relatedEntityId: arbitrationCase.id,
      financeRecordId,
    })
    addEvent(draft, {
      type: 'warning',
      title: '仲裁结果已出',
      message: employeeWins
        ? `${arbitrationCase.employeeName} 胜诉，扣除 ${arbitrationCase.claimedAmount}。`
        : `${arbitrationCase.employeeName} 仲裁被驳回。`,
      severity: employeeWins ? 'danger' : 'info',
      relatedEntityId: arbitrationCase.employeeId,
    })
  }
  return draft
}
