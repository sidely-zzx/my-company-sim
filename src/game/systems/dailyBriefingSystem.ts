import { cloneState } from '../seed'
import type { EventSeverity, FinanceRecord, GameEvent, GameState } from '../types'

export type DailyBriefingCategory = 'labor' | 'project' | 'finance'
export type DailyBriefingAction = 'view' | 'replace_labor_employee' | 'resolve_project_event'

export interface DailyBriefingItem {
  id: string
  category: DailyBriefingCategory
  severity: EventSeverity
  title: string
  description: string
  amountDelta?: number
  action: DailyBriefingAction
  relatedEntityId?: string
}

export interface DailyBriefingSummary {
  reportDay: number
  incomeTotal: number
  expenseTotal: number
  net: number
  laborIssueCount: number
  projectEventCount: number
  requiredActionCount: number
  requiredItems: DailyBriefingItem[]
  laborItems: DailyBriefingItem[]
  projectItems: DailyBriefingItem[]
  financeItems: DailyBriefingItem[]
}

function projectTitle(state: GameState, projectId?: string): string | undefined {
  return state.projectContracts.find((project) => project.id === projectId)?.title
}

function laborNoticeItems(state: GameState, reportDay: number): DailyBriefingItem[] {
  return state.pendingLaborClientNotices
    .filter((notice) => notice.checkedDay === reportDay)
    .map((notice) => ({
      id: `labor-notice-${notice.id}`,
      category: 'labor',
      severity: 'warning',
      title: `${notice.contractTitle} 产出未达标`,
      description: `${notice.employeeName ?? '驻场员工'} 昨日产出 ${Math.round(notice.actualOutput)} / ${Math.round(notice.requiredOutput)}，当天未结算，甲方要求更换人员。`,
      action: 'replace_labor_employee',
      relatedEntityId: notice.contractId,
    }))
}

function projectEventItems(state: GameState, reportDay: number): DailyBriefingItem[] {
  return state.pendingProjectClientEvents
    .filter((event) => event.triggeredDay === reportDay)
    .map((event) => ({
      id: `project-event-${event.id}`,
      category: 'project',
      severity: event.severity,
      title: event.title,
      description: `${event.projectTitle}：${event.description}`,
      action: 'resolve_project_event',
      relatedEntityId: event.projectId,
    }))
}

function recordItem(record: FinanceRecord): DailyBriefingItem {
  const financeCategory: DailyBriefingCategory =
    record.type.startsWith('labor_') ? 'labor' : record.type.startsWith('project_') ? 'project' : 'finance'
  const severity: EventSeverity =
    record.amount > 0 ? 'success' : record.type.includes('penalty') || record.type.includes('complaint') ? 'danger' : 'info'

  return {
    id: `finance-record-${record.id}`,
    category: financeCategory,
    severity,
    title: record.reason,
    description: record.amount > 0 ? `收入 ${record.amount}` : `支出 ${Math.abs(record.amount)}`,
    amountDelta: record.amount,
    action: 'view',
    relatedEntityId: record.relatedEntityId,
  }
}

function eventItem(state: GameState, event: GameEvent): DailyBriefingItem {
  return {
    id: `event-${event.id}`,
    category: event.type === 'project' ? 'project' : 'labor',
    severity: event.severity,
    title: event.title,
    description: projectTitle(state, event.relatedEntityId) ? `${projectTitle(state, event.relatedEntityId)}：${event.message}` : event.message,
    action: 'view',
    relatedEntityId: event.relatedEntityId,
  }
}

function uniqueItems(items: DailyBriefingItem[]): DailyBriefingItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false
    }
    seen.add(item.id)
    return true
  })
}

function sortBySeverity(items: DailyBriefingItem[]): DailyBriefingItem[] {
  const severityRank: Record<EventSeverity, number> = {
    danger: 0,
    warning: 1,
    info: 2,
    success: 3,
  }
  return [...items].sort((left, right) => {
    const severityDiff = severityRank[left.severity] - severityRank[right.severity]
    if (severityDiff !== 0) {
      return severityDiff
    }
    return Math.abs(right.amountDelta ?? 0) - Math.abs(left.amountDelta ?? 0)
  })
}

export function selectDailyBriefingSummary(state: GameState, reportDay: number): DailyBriefingSummary {
  const report = state.financeReports.find((item) => item.day === reportDay)
  const records = report ? [...report.incomeRecords, ...report.expenseRecords] : state.financeRecords.filter((record) => record.day === reportDay)
  const recordItems = records.map(recordItem)
  const requiredItems = sortBySeverity([
    ...laborNoticeItems(state, reportDay),
    ...projectEventItems(state, reportDay),
  ])
  const projectEventLogs = state.events
    .filter((event) => event.day === reportDay && event.type === 'project')
    .map((event) => eventItem(state, event))
  const laborEventLogs = state.events
    .filter((event) => event.day === reportDay && event.type === 'contract')
    .map((event) => eventItem(state, event))

  return {
    reportDay,
    incomeTotal: report?.incomeTotal ?? records.filter((record) => record.amount > 0).reduce((total, record) => total + record.amount, 0),
    expenseTotal: report?.expenseTotal ?? Math.abs(records.filter((record) => record.amount < 0).reduce((total, record) => total + record.amount, 0)),
    net: report?.net ?? records.reduce((total, record) => total + record.amount, 0),
    laborIssueCount: state.pendingLaborClientNotices.filter((notice) => notice.checkedDay === reportDay).length,
    projectEventCount: state.pendingProjectClientEvents.filter((event) => event.triggeredDay === reportDay).length,
    requiredActionCount: requiredItems.length,
    requiredItems,
    laborItems: sortBySeverity(uniqueItems([...requiredItems.filter((item) => item.category === 'labor'), ...recordItems.filter((item) => item.category === 'labor'), ...laborEventLogs])),
    projectItems: sortBySeverity(uniqueItems([...requiredItems.filter((item) => item.category === 'project'), ...recordItems.filter((item) => item.category === 'project'), ...projectEventLogs])),
    financeItems: sortBySeverity(recordItems.filter((item) => item.category === 'finance')),
  }
}

export function openDailyBriefing(state: GameState, reportDay?: number): GameState {
  const draft = cloneState(state)
  draft.activeDailyBriefingDay = reportDay ?? Math.max(1, draft.time.day - 1)
  return draft
}

export function dismissDailyBriefing(state: GameState): GameState {
  const draft = cloneState(state)
  const reportDay = draft.activeDailyBriefingDay
  if (reportDay !== undefined && !draft.dailyBriefingReadDays.includes(reportDay)) {
    draft.dailyBriefingReadDays.push(reportDay)
  }
  draft.activeDailyBriefingDay = undefined
  if (draft.pendingLaborClientNotices.length === 0 && draft.pendingProjectClientEvents.length === 0) {
    draft.time.paused = false
  }
  return draft
}
