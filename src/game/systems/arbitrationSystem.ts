import { clamp, cloneState, nextRandom } from '../seed'
import type { ArbitrationReason, GameState } from '../types'
import { addEvent, createId } from './eventSystem'
import { addFinanceRecord } from './financeSystem'
import { sendMail } from './mailSystem'
import { adjustCompanyReputation } from './reputationSystem'

function calculateArbitrationChance(satisfaction: number): number {
  // 仲裁只由满意度驱动：35 以下才会进入判定，34 点约 50%，0 点约 95%。
  const dissatisfactionRatio = (35 - satisfaction) / 35
  return clamp(0.5 + dissatisfactionRatio * 0.45, 0.5, 0.95)
}

export function processArbitrationFilings(state: GameState): GameState {
  const draft = cloneState(state)
  for (const employee of draft.employees) {
    if (
      employee.status === 'fired' ||
      employee.satisfaction >= 35 ||
      employee.unpaidSocialInsuranceGap <= 0 ||
      draft.pendingArbitrations.some(
        (item) => item.employeeId === employee.id && item.status === 'pending',
      )
    ) {
      continue
    }

    const roll = nextRandom(draft.rngSeed)
    draft.rngSeed = roll.seed
    if (roll.value > calculateArbitrationChance(employee.satisfaction)) {
      continue
    }

    const reason: ArbitrationReason = 'underpaid_social_insurance'
    const claimedAmount = Math.round(
      employee.salaryPerDay * Math.max(1, Math.ceil(employee.workDays / 30)),
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
      body: `员工满意度过低并存在累计社保公积金差额 ${employee.unpaidSocialInsuranceGap}，因此发起仲裁。诉求金额 ${claimedAmount}，预计第 ${arbitrationCase.resultDay} 天出结果。`,
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
    const legalRisk = employee ? employee.unpaidSocialInsuranceGap > 0 && employee.satisfaction < 35 : true
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
      adjustCompanyReputation(draft, -12, `${arbitrationCase.employeeName} 仲裁胜诉并获得赔偿`, arbitrationCase.employeeId)
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
