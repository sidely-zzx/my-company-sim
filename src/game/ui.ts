import type {
  AssignmentMode,
  Employee,
  EmployeeDisciplineAction,
  EmployeeStatus,
  LaborContract,
  ProjectContract,
  ProjectPhase,
  ProjectStatus,
  ProjectWorkTrack,
  SkillRole,
  WorkHour,
  ResumeSkillLevel
} from './types'
import { money } from '../utils'

export const workHours: WorkHour[] = [18, 19, 20, 21, 22, 23, 24]
export const skillRoles: SkillRole[] = ['product', 'design', 'frontend', 'backend', 'testing']
export const projectTracks: ProjectWorkTrack[] = ['product', 'design', 'frontend', 'backend', 'testing']

export const assignmentModes: AssignmentMode[] = ['immediate', 'after_current']
export const employeeDisciplineActions: EmployeeDisciplineAction[] = ['ignore', 'verbal_warn', 'formal_warn', 'fine']

export const assignmentModeLabels: Record<AssignmentMode, string> = {
  immediate: '立即投入',
  after_current: '做完当前工作后投入',
}

export const levelLabels: Record<ResumeSkillLevel, string> = {
  senior: '资深',
  mid: '中级',
  junior: '初级',
}

export const roleLabels: Record<SkillRole, string> = {
  product: '产品',
  design: '设计',
  frontend: '前端',
  backend: '后端',
  testing: '测试',
}

export const phaseLabels: Record<ProjectPhase, string> = {
  product: '产品',
  design: '设计',
  development: '开发',
  testing: '测试',
}

export const projectStatusLabels: Record<ProjectStatus, string> = {
  available: '可签约',
  accepted: '已签约',
  active: '进行中',
  overdue: '延期中',
  completed: '已完成',
  breached: '已毁约',
}

export const schoolLabels = {
  normal: '普本',
  '211': '211',
  '985': '985',
  qs100: 'QS100',
}

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  idle: '空闲',
  focused_work: '全力工作',
  working: '工作中',
  slacking: '摸鱼',
  drinking_water: '喝水',
  smoking: '抽烟',
  toilet: '上厕所',
  job_browsing: '刷招聘软件',
  gaming: '玩游戏',
  fired: '已离职',
}

export const employeeDisciplineActionLabels: Record<EmployeeDisciplineAction, string> = {
  ignore: '忽略',
  verbal_warn: '口头提醒',
  formal_warn: '正式警告',
  fine: '罚款',
}

export const laborStatusLabels = {
  available: '可签约',
  accepted: '已签约',
  active: '驻场中',
  warning: '预警',
  completed: '已完成',
  terminated: '已终止',
}

export const urgencyLabels = {
  urgent: '急召',
  normal: '普通',
}

export function formatTime(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${money(value)}`
}

export function average(values: number[], fallback: number): number {
  if (values.length === 0) {
    return fallback
  }

  return values.reduce((total, value) => total + value, 0) / values.length
}

export function projectProgress(project: ProjectContract): number {
  return Math.round(
    average(
      projectTracks.map((track) => project.phaseProgress[track] ?? 0),
      0,
    ),
  )
}

export function projectRisk(project: ProjectContract, day: number): { label: string; tone: 'danger' | 'warning' | 'success' } {
  if (project.status === 'overdue' || project.deadlineDay <= day) {
    return { label: '延期风险：高', tone: 'danger' }
  }
  if (project.deadlineDay - day <= 1) {
    return { label: '延期风险：中', tone: 'warning' }
  }
  return { label: '延期风险：低', tone: 'success' }
}

export function progressTone(value: number): 'danger' | 'warning' | 'success' {
  if (value >= 75) {
    return 'success'
  }
  if (value >= 45) {
    return 'warning'
  }
  return 'danger'
}

export function eventIcon(type: string): string {
  const icons: Record<string, string> = {
    tutorial: 'T',
    finance: '$',
    recruiting: '+',
    contract: '#',
    project: 'P',
    employee: '@',
    warning: '!',
  }

  return icons[type] ?? 'i'
}

export function clampNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function skillClaimsText(skills: { role: SkillRole; level: ResumeSkillLevel }[]): string {
  return skills.map((skill) => `${levelLabels[skill.level]}${roleLabels[skill.role]}`).join('、')
}

export function abilitiesText(employee: Employee): string {
  return skillRoles
    .map((role) => `${roleLabels[role]} ${employee.realSkillAbilities[role] ?? 0}`)
    .join(' / ')
}

export function assignmentText(
  employee: Employee,
  laborContracts: LaborContract[],
  projectContracts: ProjectContract[],
): string {
  if (!employee.assignedTo) {
    return '未分配'
  }
  if (employee.assignedTo.type === 'labor') {
    const contract = laborContracts.find((item) => item.id === employee.assignedTo?.id)
    return contract ? `人力：${contract.title}` : '人力：未知合同'
  }
  const project = projectContracts.find((item) => item.id === employee.assignedTo?.id)
  return project
    ? `项目：${project.title}（${roleLabels[employee.assignedTo.role ?? 'product']}）`
    : '项目：未知项目'
}

export function pendingAssignmentText(
  employee: Employee,
  laborContracts: LaborContract[],
  projectContracts: ProjectContract[],
): string {
  if (!employee.pendingAssignment) {
    return '无'
  }
  if (employee.pendingAssignment.type === 'labor') {
    const contract = laborContracts.find((item) => item.id === employee.pendingAssignment?.id)
    return contract ? `做完当前工作后投入：${contract.title}` : '做完当前工作后投入：未知合同'
  }

  const project = projectContracts.find((item) => item.id === employee.pendingAssignment?.id)
  const role = roleLabels[employee.pendingAssignment.role ?? 'product']
  return project ? `做完当前工作后投入：${project.title}（${role}）` : `做完当前工作后投入：未知项目（${role}）`
}
