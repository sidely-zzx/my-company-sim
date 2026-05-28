import {
  RESUMES_PER_REFRESH,
  SOCIAL_INSURANCE_COMPANY_RATE,
  STARTING_MONEY,
} from '../constants'
import { cloneState } from '../seed'
import type {
  Employee,
  GameEvent,
  GameState,
  LaborContract,
  PendingProjectClientEvent,
  ProjectContract,
  Resume,
  SkillRole,
  TutorialState,
  TutorialStep,
} from '../types'
import { roleLabels } from '../ui'
import { addEvent, createId } from './eventSystem'
import { sendMail } from './mailSystem'

export interface TutorialTodoItem {
  text: string
  meta: string
  done: boolean
  current?: boolean
}

export type TutorialAnchorId =
  | 'dock-mail'
  | 'dock-labor'
  | 'dock-recruiting'
  | 'dock-project'
  | 'dock-event'
  | 'speed-normal'
  | 'speed-fast'
  | 'welcome-mail-row'
  | 'welcome-mail-action'
  | 'project-mail-row'
  | 'project-mail-action'
  | 'starter-labor-row'
  | 'starter-labor-sign-button'
  | 'starter-labor-detail-button'
  | 'starter-labor-employee'
  | 'starter-resume-offer-button'
  | 'starter-resume-confirm-offer-button'
  | 'starter-project-row'
  | 'starter-project-sign-button'
  | 'starter-project-detail-button'
  | 'starter-project-role-missing'
  | 'starter-project-employee'
  | 'starter-project-resume-offer-button'
  | 'starter-project-resume-confirm-offer-button'
  | 'starter-event-card'
  | 'starter-event-recommended-option'

export interface TutorialCoach {
  title: string
  description: string
  actionText: string
  reasonText: string
  anchorIds: TutorialAnchorId[]
  target: 'mail' | 'labor' | 'recruiting' | 'project' | 'event' | 'speed' | 'done'
}

export interface TutorialOfferLimits {
  salaryMinPercent: number
  salaryMaxPercent: number
  socialMinPercent: number
  socialMaxPercent: number
}

const starterRole: SkillRole = 'frontend'
const starterProjectRoles: SkillRole[] = ['product', 'design', 'frontend', 'backend', 'testing']
const projectEventMorningCutoff = 12 * 60
const starterProjectCompletionMultiplier = 3.2
/** 教学期 Offer 调整区间；它限制新玩家只做小幅薪资/社保取舍，并保证第一单现金流仍可读。 */
export const TUTORIAL_OFFER_LIMITS: TutorialOfferLimits = {
  salaryMinPercent: 90,
  salaryMaxPercent: 110,
  socialMinPercent: 80,
  socialMaxPercent: 100,
}
const tutorialStepOrder: TutorialStep[] = [
  'read_welcome_mail',
  'review_labor_contract',
  'send_offer',
  'assign_employee',
  'settle_first_day',
  'read_project_mail',
  'review_project_contract',
  'hire_project_team',
  'assign_project_team',
  'resolve_deadline_cut_event',
  'finish_starter_project',
  'completed',
]

export function createInitialTutorialState(): TutorialState {
  return {
    enabled: true,
    completed: false,
    currentStep: 'read_welcome_mail',
    starterResumeIds: [],
    starterProjectResumeIds: [],
  }
}

function createStarterLaborContract(state: GameState): LaborContract {
  return {
    id: createId(state, 'labor'),
    clientName: '星河科技',
    title: '星河科技驻场前端',
    requiredRole: starterRole,
    requiredAbility: 50,
    dailyBudget: 560,
    urgency: 'normal',
    deadlineDay: state.time.day + 2,
    satisfaction: 100,
    status: 'available',
  }
}

function createStarterResumes(state: GameState): Resume[] {
  const steadyResume: Resume = {
    id: createId(state, 'resume'),
    name: '林子轩',
    school: '211',
    workYears: 2,
    resumeSkills: [{ role: starterRole, level: 'mid' }],
    expectedSalaryPerDay: 330,
    introduction: '做过多个中后台页面，能接受短期驻场，沟通节奏比较稳定。',
    realSkillAbilities: { [starterRole]: 62 },
    satisfaction: 84,
    arbitrationTendency: 18,
    slackingTendency: 0.08,
  }
  const budgetResume: Resume = {
    id: createId(state, 'resume'),
    name: '周一航',
    school: 'normal',
    workYears: 1,
    resumeSkills: [{ role: starterRole, level: 'junior' }],
    expectedSalaryPerDay: 240,
    introduction: '价格比较灵活，做过活动页切图和简单接口联调，需要更明确的排期管理。',
    realSkillAbilities: { [starterRole]: 49 },
    satisfaction: 72,
    arbitrationTendency: 34,
    slackingTendency: 0.18,
  }

  return [steadyResume, budgetResume]
}

function createStarterProjectContract(state: GameState): ProjectContract {
  return {
    id: createId(state, 'project'),
    clientCompanyId: 101,
    clientName: '启明星传媒',
    clientProfile: {
      id: 101,
      name: '启明星传媒',
      relationship: 62,
      budgetLevel: 55,
      requirementChaos: 38,
      temper: 58,
      trust: 60,
    },
    title: '启明星官网改版',
    amount: 12000,
    deadlineDay: state.time.day + 4,
    dailyPenalty: 800,
    overdueDays: 0,
    status: 'available',
    currentPhase: 'product',
    requirements: starterProjectRoles.map((role) => ({
      role,
      minAbility: role === 'testing' ? 40 : 45,
      headcount: 1,
    })),
    phaseProgress: {
      product: 0,
      design: 0,
      frontend: 0,
      backend: 0,
      testing: 0,
    },
    notifiedCompletedTracks: [],
    assignedEmployees: {},
    clientEventCount: 0,
    scopeChangeLevel: 0,
  }
}

function createStarterProjectResume(state: GameState, role: SkillRole, name: string, expectedSalaryPerDay: number): Resume {
  return {
    id: createId(state, 'resume'),
    name,
    school: role === 'product' || role === 'testing' ? '211' : '985',
    workYears: role === 'testing' ? 2 : 3,
    resumeSkills: [{ role, level: 'senior' }],
    expectedSalaryPerDay,
    introduction: `${roleLabels[role]}方向项目教学候选人，适合第二天小项目快速交付。`,
    // 项目教学候选人的真实能力会影响阶段推进速度；这里给高能力值，确保受控甲方事件后仍能在一个工作日内完成。
    realSkillAbilities: { [role]: 120 },
    satisfaction: 86,
    arbitrationTendency: 12,
    slackingTendency: 0.02,
  }
}

function createStarterProjectResumes(state: GameState): Resume[] {
  return [
    createStarterProjectResume(state, 'product', '许安然', 320),
    createStarterProjectResume(state, 'design', '韩若琳', 310),
    createStarterProjectResume(state, 'frontend', '陈景航', 340),
    createStarterProjectResume(state, 'backend', '赵铭宇', 350),
    createStarterProjectResume(state, 'testing', '沈佳宁', 280),
  ]
}

export function estimatedEmployeeDailyCost(salaryPerDay: number, socialInsuranceRatio: number): number {
  return salaryPerDay + Math.round(salaryPerDay * socialInsuranceRatio * SOCIAL_INSURANCE_COMPANY_RATE)
}

export function clampTutorialOffer(
  resume: Resume,
  salaryPerDay: number,
  socialInsuranceRatio: number,
): { salaryPerDay: number; socialInsuranceRatio: number } {
  const salaryMin = Math.round(resume.expectedSalaryPerDay * TUTORIAL_OFFER_LIMITS.salaryMinPercent / 100)
  const salaryMax = Math.round(resume.expectedSalaryPerDay * TUTORIAL_OFFER_LIMITS.salaryMaxPercent / 100)
  // 教学期社保比例会影响每日成本、员工满意度和后续劳动风险；这里限制小范围调整，避免第一单被极端输入破坏。
  const socialMin = TUTORIAL_OFFER_LIMITS.socialMinPercent / 100
  const socialMax = TUTORIAL_OFFER_LIMITS.socialMaxPercent / 100

  return {
    salaryPerDay: Math.min(salaryMax, Math.max(salaryMin, Math.round(salaryPerDay))),
    socialInsuranceRatio: Math.min(socialMax, Math.max(socialMin, socialInsuranceRatio)),
  }
}

export function getStarterLaborContract(state: Pick<GameState, 'laborContracts' | 'tutorial'>): LaborContract | undefined {
  return state.laborContracts.find((contract) => contract.id === state.tutorial.starterLaborContractId)
}

export function getStarterProjectContract(state: Pick<GameState, 'projectContracts' | 'tutorial'>): ProjectContract | undefined {
  return state.projectContracts.find((project) => project.id === state.tutorial.starterProjectContractId)
}

export function isStarterLaborContract(state: Pick<GameState, 'tutorial'>, contractId: string): boolean {
  return state.tutorial.enabled && state.tutorial.starterLaborContractId === contractId
}

export function isStarterProjectContract(state: Pick<GameState, 'tutorial'>, projectId: string): boolean {
  return state.tutorial.enabled && state.tutorial.starterProjectContractId === projectId
}

export function isStarterResume(state: Pick<GameState, 'tutorial'>, resumeId: string): boolean {
  return state.tutorial.enabled && (
    state.tutorial.starterResumeIds.includes(resumeId) ||
    state.tutorial.starterProjectResumeIds.includes(resumeId)
  )
}

export function isStarterProjectResume(state: Pick<GameState, 'tutorial'>, resumeId: string): boolean {
  return state.tutorial.enabled && state.tutorial.starterProjectResumeIds.includes(resumeId)
}

export function isStarterEmployee(state: Pick<GameState, 'tutorial'>, employee: Employee): boolean {
  return Boolean(employee.sourceResumeId && isStarterResume(state, employee.sourceResumeId))
}

export function isStarterProjectEmployee(state: Pick<GameState, 'tutorial'>, employee: Employee): boolean {
  return Boolean(employee.sourceResumeId && isStarterProjectResume(state, employee.sourceResumeId))
}

function isWelcomeMailRead(state: Pick<GameState, 'mailbox' | 'tutorial'>): boolean {
  if (!state.tutorial.welcomeMailId) {
    return true
  }

  const mail = state.mailbox.find((item) => item.id === state.tutorial.welcomeMailId)
  return !mail || mail.read
}

function hasActiveEmployee(state: Pick<GameState, 'employees'>): boolean {
  return state.employees.some((employee) => employee.status !== 'fired')
}

function hasStarterLaborOutcome(
  state: Pick<GameState, 'financeRecords' | 'tutorial'>,
): boolean {
  const starterLaborContractId = state.tutorial.starterLaborContractId
  return Boolean(
    starterLaborContractId &&
      state.financeRecords.some((record) =>
        record.relatedEntityId === starterLaborContractId &&
        (record.type === 'labor_income' || record.type === 'labor_penalty'),
      ),
  )
}

function isProjectMailRead(state: Pick<GameState, 'mailbox' | 'tutorial'>): boolean {
  if (!state.tutorial.projectMailId) {
    return false
  }

  const mail = state.mailbox.find((item) => item.id === state.tutorial.projectMailId)
  return Boolean(mail?.read)
}

function hasStarterProjectTeamHired(state: Pick<GameState, 'employees' | 'tutorial'>): boolean {
  return (
    state.tutorial.starterProjectResumeIds.length === starterProjectRoles.length &&
    state.tutorial.starterProjectResumeIds.every((resumeId) =>
      state.employees.some((employee) => employee.status !== 'fired' && employee.sourceResumeId === resumeId),
    )
  )
}

function hasStarterProjectTeamAssigned(state: Pick<GameState, 'projectContracts' | 'tutorial'>): boolean {
  const project = getStarterProjectContract(state)
  return Boolean(
    project &&
      starterProjectRoles.every((role) => (project.assignedEmployees[role] ?? []).length > 0),
  )
}

export function hasStarterProjectIncome(state: Pick<GameState, 'financeRecords' | 'tutorial'>): boolean {
  const starterProjectContractId = state.tutorial.starterProjectContractId
  return Boolean(
    starterProjectContractId &&
      state.financeRecords.some((record) =>
        record.relatedEntityId === starterProjectContractId && record.type === 'project_income',
      ),
  )
}

function isStarterProjectClientEventPending(state: Pick<GameState, 'pendingProjectClientEvents' | 'tutorial'>): boolean {
  return Boolean(
    state.tutorial.projectClientEventId &&
      state.pendingProjectClientEvents.some((event) => event.id === state.tutorial.projectClientEventId),
  )
}

function isStarterProjectClientEventResolved(state: Pick<GameState, 'pendingProjectClientEvents' | 'tutorial'>): boolean {
  return Boolean(state.tutorial.projectClientEventId && !isStarterProjectClientEventPending(state))
}

export function shouldSkipOrdinaryProjectClientEvent(
  state: Pick<GameState, 'tutorial'>,
  project: Pick<ProjectContract, 'id'>,
): boolean {
  // 推荐项目的甲方事件由教学系统受控触发；项目教学完成前跳过普通随机池，避免随机事件打断教学闭环。
  return Boolean(
    state.tutorial.enabled &&
      !state.tutorial.completed &&
      state.tutorial.starterProjectContractId === project.id,
  )
}

export function shouldPauseOrdinaryProjectClientEvents(
  state: Pick<GameState, 'financeRecords' | 'tutorial'>,
): boolean {
  // 第二段教学完成前暂停普通甲方随机事件，确保玩家先处理受控的提前交付事件，不被额外随机事件打断。
  return Boolean(
    state.tutorial.enabled &&
      !state.tutorial.completed &&
      state.tutorial.starterProjectContractId &&
      !hasStarterProjectIncome(state),
  )
}

export function starterProjectProgressMultiplier(
  state: Pick<GameState, 'financeRecords' | 'pendingProjectClientEvents' | 'tutorial'>,
  project: Pick<ProjectContract, 'id'>,
): number {
  if (
    !state.tutorial.enabled ||
    state.tutorial.completed ||
    state.tutorial.starterProjectContractId !== project.id ||
    !isStarterProjectClientEventResolved(state) ||
    hasStarterProjectIncome(state)
  ) {
    return 1
  }

  // 教学倍率只影响受控项目事件后的推荐项目进度；它让玩家看到“今天交付”的压力，同时避免随机摸鱼导致教学卡死。
  return starterProjectCompletionMultiplier
}

function applyStarterProjectMarketInPlace(state: GameState): void {
  if (
    !state.tutorial.enabled ||
    state.tutorial.starterProjectContractId ||
    !hasStarterLaborOutcome(state) ||
    state.time.day < 2
  ) {
    return
  }

  const starterProject = createStarterProjectContract(state)
  const starterProjectResumes = createStarterProjectResumes(state)
  state.projectContracts = [starterProject, ...state.projectContracts]
  state.resumes = [
    ...starterProjectResumes,
    ...state.resumes.slice(0, Math.max(0, RESUMES_PER_REFRESH - starterProjectResumes.length)),
  ]
  state.tutorial.starterProjectContractId = starterProject.id
  state.tutorial.starterProjectResumeIds = starterProjectResumes.map((resume) => resume.id)
  state.tutorial.projectMailId = sendMail(state, {
    type: 'tutorial',
    from: '项目经营备忘录',
    subject: '第二天：接一笔项目外包试试',
    body: '你已经跑通第一笔驻场现金流。今天推荐接一个小项目，招齐产品、设计、前端、后端和测试，观察多岗位项目如何推进和收款。',
    relatedEntityId: starterProject.id,
  })
  addEvent(state, {
    type: 'tutorial',
    title: '项目教学已开启',
    message: `推荐项目 ${starterProject.title} 已加入项目市场，先阅读项目经营备忘录。`,
    severity: 'info',
    relatedEntityId: starterProject.id,
  })
}

function createStarterDeadlineCutEvent(state: GameState, project: ProjectContract): PendingProjectClientEvent {
  const deadlineDelta = state.time.day - project.deadlineDay
  return {
    id: createId(state, 'project-client-event'),
    kind: 'deadline_cut',
    projectId: project.id,
    projectTitle: project.title,
    clientName: project.clientName,
    triggeredDay: state.time.day,
    title: '甲方要求提前交付',
    description: `${project.clientName} 临时要求今天上线。这个教学事件会把项目截止日压缩到今天，并让你观察甲方事件如何改变项目风险。`,
    severity: 'danger',
    options: [
      {
        id: 'accept_rush',
        label: '接受今天交付',
        description: '截止日改为今天，甲方信任提升，但项目小队压力和疲劳显著增加。',
        effects: {
          deadlineDayDelta: deadlineDelta,
          clientTrustDelta: 4,
          employeePressureDelta: 12,
          employeeEnergyDelta: -8,
          employeeSatisfactionDelta: -3,
        },
      },
      {
        id: 'partial_rush',
        label: '只提前 1 天',
        description: '教学推荐：对外承诺今天交付核心范围，团队压力可控，甲方信任略升。',
        effects: {
          deadlineDayDelta: deadlineDelta,
          clientTrustDelta: 1,
          employeePressureDelta: 6,
          employeeEnergyDelta: -3,
        },
      },
      {
        id: 'reject_rush',
        label: '拒绝额外压榨',
        description: '不接受新增要求，但项目仍需今天交付，甲方信任下降并提高违约争议压力。',
        effects: {
          deadlineDayDelta: deadlineDelta,
          clientTrustDelta: -8,
          dailyPenaltyDelta: 100,
        },
      },
    ],
  }
}

function shouldCreateStarterDeadlineCutEvent(state: GameState, project: ProjectContract): boolean {
  if (!hasStarterProjectTeamAssigned(state) || state.tutorial.projectClientEventId) {
    return false
  }
  if (!['accepted', 'active'].includes(project.status)) {
    return false
  }
  // 如果玩家下午才分配齐项目小队，就延迟到下一个工作日上午触发，确保教学项目还有完整工作日可完成。
  return state.time.minuteOfDay <= projectEventMorningCutoff
}

function createStarterDeadlineCutEventInPlace(state: GameState): void {
  const project = getStarterProjectContract(state)
  if (!project || !shouldCreateStarterDeadlineCutEvent(state, project)) {
    return
  }

  const pendingEvent = createStarterDeadlineCutEvent(state, project)
  state.pendingProjectClientEvents.push(pendingEvent)
  state.tutorial.projectClientEventId = pendingEvent.id
  project.lastClientEventDay = state.time.day
  project.clientEventCount = (project.clientEventCount ?? 0) + 1
  state.time.speed = 0
  state.time.paused = true
  addEvent(state, {
    type: 'project',
    title: '教学甲方事件待处理',
    message: `${project.title} 触发「${pendingEvent.title}」，处理后项目截止日会压缩到今天。`,
    severity: 'danger',
    relatedEntityId: project.id,
  })
}

function normalizeResolvedStarterProjectEvent(state: GameState): void {
  const project = getStarterProjectContract(state)
  if (!project || !isStarterProjectClientEventResolved(state) || hasStarterProjectIncome(state)) {
    return
  }

  project.deadlineDay = state.time.day
}

function computeTutorialStep(state: GameState): TutorialStep {
  if (!state.tutorial.enabled || state.tutorial.completed) {
    return state.tutorial.currentStep
  }

  const starterContract = getStarterLaborContract(state)
  if (!starterContract) {
    return state.tutorial.currentStep
  }

  if (!isWelcomeMailRead(state)) {
    return 'read_welcome_mail'
  }
  if (starterContract.status === 'available') {
    return 'review_labor_contract'
  }
  if (!hasActiveEmployee(state)) {
    return 'send_offer'
  }
  if (!starterContract.assignedEmployeeId) {
    return 'assign_employee'
  }
  if (!hasStarterLaborOutcome(state)) {
    return 'settle_first_day'
  }

  const starterProject = getStarterProjectContract(state)
  if (!starterProject) {
    return 'settle_first_day'
  }
  if (!isProjectMailRead(state)) {
    return 'read_project_mail'
  }
  if (starterProject.status === 'available') {
    return 'review_project_contract'
  }
  if (!hasStarterProjectTeamHired(state)) {
    return 'hire_project_team'
  }
  if (!hasStarterProjectTeamAssigned(state) && !state.tutorial.projectClientEventId) {
    return 'assign_project_team'
  }
  if (isStarterProjectClientEventPending(state)) {
    return 'resolve_deadline_cut_event'
  }
  if (!isStarterProjectClientEventResolved(state)) {
    return 'assign_project_team'
  }
  if (!hasStarterProjectIncome(state)) {
    return 'finish_starter_project'
  }
  return 'completed'
}

function addTutorialEventOnce(
  state: GameState,
  title: string,
  message: string,
  relatedEntityId?: string,
): void {
  const exists = state.events.some((event: GameEvent) =>
    event.type === 'tutorial' &&
    event.title === title &&
    event.relatedEntityId === relatedEntityId,
  )
  if (exists) {
    return
  }

  addEvent(state, {
    type: 'tutorial',
    title,
    message,
    severity: 'success',
    relatedEntityId,
  })
}

function starterSettlementMessage(state: GameState): string {
  const starterLaborContractId = state.tutorial.starterLaborContractId
  const record = state.financeRecords
    .filter((item) => item.relatedEntityId === starterLaborContractId)
    .find((item) => item.type === 'labor_income' || item.type === 'labor_penalty')

  if (record?.type === 'labor_income') {
    return `推荐驻场合同完成第一次日结，收入 +${record.amount}，可以开始考虑第二单。`
  }
  if (record?.type === 'labor_penalty') {
    return `推荐驻场合同已经产生违约反馈，本次扣款 ${Math.abs(record.amount)}，需要尽快补人。`
  }
  return '推荐驻场合同已经完成第一次日结反馈。'
}

function recordTutorialStepEvents(
  state: GameState,
  previousStep: TutorialStep,
  nextStep: TutorialStep,
): void {
  const previousIndex = tutorialStepOrder.indexOf(previousStep)
  const nextIndex = tutorialStepOrder.indexOf(nextStep)
  if (previousIndex < 0 || nextIndex <= previousIndex) {
    return
  }

  const starterLaborContractId = state.tutorial.starterLaborContractId
  for (const completedStep of tutorialStepOrder.slice(previousIndex, nextIndex)) {
    if (completedStep === 'read_welcome_mail') {
      addTutorialEventOnce(state, '已阅读创业邮件', '玩家已查看第一天经营建议。', starterLaborContractId)
    }
    if (completedStep === 'review_labor_contract') {
      addTutorialEventOnce(state, '推荐驻场合同已签约', '第一单已签约，接下来需要招聘匹配员工。', starterLaborContractId)
    }
    if (completedStep === 'send_offer') {
      addTutorialEventOnce(state, '首位员工已入职', '公司已有第一名员工，可以安排到推荐驻场合同。', starterLaborContractId)
    }
    if (completedStep === 'assign_employee') {
      addTutorialEventOnce(state, '员工已安排到第一单', '推荐驻场合同已有员工驻场，推进到下班即可查看日结。', starterLaborContractId)
    }
    if (completedStep === 'settle_first_day') {
      addTutorialEventOnce(state, '第一笔驻场日结已反馈', starterSettlementMessage(state), starterLaborContractId)
    }
    if (completedStep === 'read_project_mail') {
      addTutorialEventOnce(state, '已阅读项目备忘录', '玩家已查看第二天项目外包经营建议。', state.tutorial.starterProjectContractId)
    }
    if (completedStep === 'review_project_contract') {
      addTutorialEventOnce(state, '推荐项目已签约', '项目外包已签约，接下来需要招齐项目小队。', state.tutorial.starterProjectContractId)
    }
    if (completedStep === 'hire_project_team') {
      addTutorialEventOnce(state, '项目小队已招齐', '产品、设计、前端、后端和测试候选人已经入职。', state.tutorial.starterProjectContractId)
    }
    if (completedStep === 'assign_project_team') {
      addTutorialEventOnce(state, '项目岗位已分配', '推荐项目的 5 个岗位已分配齐，准备处理甲方提前交付事件。', state.tutorial.starterProjectContractId)
    }
    if (completedStep === 'resolve_deadline_cut_event') {
      addTutorialEventOnce(state, '甲方提前交付事件已处理', '推荐项目截止日已压缩到今天，推进时间观察项目交付。', state.tutorial.starterProjectContractId)
    }
    if (completedStep === 'finish_starter_project') {
      addTutorialEventOnce(state, '第一笔项目外包已完成', '推荐项目已验收收款，项目外包教学完成。', state.tutorial.starterProjectContractId)
    }
  }
}

function syncTutorialProgressInPlace(state: GameState, recordEvents: boolean): void {
  applyStarterProjectMarketInPlace(state)
  createStarterDeadlineCutEventInPlace(state)
  normalizeResolvedStarterProjectEvent(state)
  const previousStep = state.tutorial.currentStep
  const nextStep = computeTutorialStep(state)

  if (recordEvents) {
    recordTutorialStepEvents(state, previousStep, nextStep)
  }

  state.tutorial.currentStep = nextStep
  state.tutorial.completed = nextStep === 'completed'
}

export function syncTutorialProgress(state: GameState, recordEvents = true): GameState {
  const draft = cloneState(state)
  syncTutorialProgressInPlace(draft, recordEvents)
  return draft
}

export function applyTutorialStarterMarket(state: GameState): GameState {
  const draft = cloneState(state)
  if (!draft.tutorial.enabled || draft.tutorial.starterLaborContractId) {
    syncTutorialProgressInPlace(draft, false)
    return draft
  }

  const starterContract = createStarterLaborContract(draft)
  const starterResumes = createStarterResumes(draft)
  const starterResumeIds = starterResumes.map((resume) => resume.id)
  draft.laborContracts = [starterContract, ...draft.laborContracts]
  draft.resumes = [
    ...starterResumes,
    ...draft.resumes.slice(0, Math.max(0, RESUMES_PER_REFRESH - starterResumes.length)),
  ]
  draft.tutorial.starterLaborContractId = starterContract.id
  draft.tutorial.starterResumeIds = starterResumeIds
  draft.tutorial.welcomeMailId = sendMail(draft, {
    type: 'tutorial',
    from: '经营备忘录',
    subject: '创业第一天：先拿下第一笔驻场单',
    body: `公司账上现金只有 ${STARTING_MONEY}。建议先查看推荐驻场合同，招一名前端员工派过去，跑通第一笔稳定现金流后再考虑项目外包。`,
    relatedEntityId: starterContract.id,
  })
  addEvent(draft, {
    type: 'tutorial',
    title: '新手引导已开启',
    message: `推荐先完成 ${starterContract.title}，需求 ${roleLabels[starterContract.requiredRole]} 能力 ${starterContract.requiredAbility}。`,
    severity: 'info',
    relatedEntityId: starterContract.id,
  })
  syncTutorialProgressInPlace(draft, false)
  return draft
}

export function getTutorialTodos(
  state: Pick<GameState, 'employees' | 'financeRecords' | 'laborContracts' | 'mailbox' | 'pendingProjectClientEvents' | 'projectContracts' | 'tutorial'>,
): TutorialTodoItem[] {
  const starterContract = getStarterLaborContract(state)
  const starterProject = getStarterProjectContract(state)
  const welcomeRead = isWelcomeMailRead(state)
  const contractSigned = Boolean(starterContract && starterContract.status !== 'available')
  const hasEmployee = hasActiveEmployee(state)
  const assignedEmployee = Boolean(starterContract?.assignedEmployeeId)
  const settled = hasStarterLaborOutcome(state)
  const projectMailRead = isProjectMailRead(state)
  const projectSigned = Boolean(starterProject && starterProject.status !== 'available')
  const projectTeamHired = hasStarterProjectTeamHired(state)
  const projectEventResolved = isStarterProjectClientEventResolved(state)
  const projectIncome = hasStarterProjectIncome(state)
  const projectTeamAssigned = hasStarterProjectTeamAssigned(state) || Boolean(state.tutorial.projectClientEventId) || projectIncome
  const currentStep = state.tutorial.currentStep

  const laborTodos: TutorialTodoItem[] = [
    {
      text: '查看创业第一天邮件',
      meta: welcomeRead ? '已读' : '未读',
      done: welcomeRead,
      current: currentStep === 'read_welcome_mail',
    },
    {
      text: '签下推荐驻场合同',
      meta: starterContract ? `${roleLabels[starterContract.requiredRole]} · ${starterContract.dailyBudget}/天` : '未生成',
      done: contractSigned,
      current: currentStep === 'review_labor_contract',
    },
    {
      text: '给匹配候选人发 Offer',
      meta: hasEmployee ? '已入职' : '待招聘',
      done: hasEmployee,
      current: currentStep === 'send_offer',
    },
    {
      text: '将员工安排到推荐合同',
      meta: assignedEmployee ? '已驻场' : '待分配',
      done: assignedEmployee,
      current: currentStep === 'assign_employee',
    },
    {
      text: '推进到下班查看日结',
      meta: settled ? '已反馈' : '待日结',
      done: settled,
      current: currentStep === 'settle_first_day',
    },
  ]

  if (!starterProject) {
    return laborTodos
  }

  return [
    ...laborTodos,
    {
      text: '阅读项目教学邮件',
      meta: projectMailRead ? '已读' : '未读',
      done: projectMailRead,
      current: currentStep === 'read_project_mail',
    },
    {
      text: '签下推荐项目',
      meta: projectSigned ? '已签约' : '待签约',
      done: projectSigned,
      current: currentStep === 'review_project_contract',
    },
    {
      text: '招齐项目小队',
      meta: `${state.tutorial.starterProjectResumeIds.filter((resumeId) =>
        state.employees.some((employee) => employee.sourceResumeId === resumeId && employee.status !== 'fired'),
      ).length}/5 人`,
      done: projectTeamHired,
      current: currentStep === 'hire_project_team',
    },
    {
      text: '分配 5 个项目岗位',
      meta: projectTeamAssigned ? '已分配' : '待分配',
      done: projectTeamAssigned,
      current: currentStep === 'assign_project_team',
    },
    {
      text: '处理甲方提前交付事件',
      meta: projectEventResolved ? '已处理' : isStarterProjectClientEventPending(state) ? '待处理' : '待触发',
      done: projectEventResolved,
      current: currentStep === 'resolve_deadline_cut_event',
    },
    {
      text: '推进到项目完成收款',
      meta: projectIncome ? '已收款' : '待交付',
      done: projectIncome,
      current: currentStep === 'finish_starter_project',
    },
  ]
}

export function getTutorialCoach(state: Pick<GameState, 'tutorial'>): TutorialCoach | undefined {
  if (!state.tutorial.enabled || state.tutorial.completed) {
    return undefined
  }

  if (state.tutorial.currentStep === 'read_welcome_mail') {
    return {
      title: '读邮件',
      description: '打开底部「邮件」，阅读创业第一天邮件，确认第一单目标。',
      actionText: '点击「邮件」，把创业第一天邮件标记已读。',
      reasonText: '读完后会指向推荐驻场合同，开始第一笔稳定现金流。',
      anchorIds: ['welcome-mail-action', 'welcome-mail-row', 'dock-mail'],
      target: 'mail',
    }
  }
  if (state.tutorial.currentStep === 'review_labor_contract') {
    return {
      title: '签推荐合同',
      description: '打开「合同」，选择带有推荐标记的星河科技驻场前端。',
      actionText: '签下带「推荐第一单」标记的驻场合同。',
      reasonText: '签约后就能招聘并安排员工，跑通第一天日结。',
      anchorIds: ['starter-labor-sign-button', 'starter-labor-row', 'dock-labor'],
      target: 'labor',
    }
  }
  if (state.tutorial.currentStep === 'send_offer') {
    return {
      title: '发 Offer',
      description: '打开「招聘」，给推荐候选人发 Offer。教学期只能小幅调整工资和社保，推荐候选人会接受。',
      actionText: '给推荐候选人发送 Offer。',
      reasonText: '教学期 Offer 会 100% 成功，入职后可安排到推荐合同。',
      anchorIds: ['starter-resume-confirm-offer-button', 'starter-resume-offer-button', 'dock-recruiting'],
      target: 'recruiting',
    }
  }
  if (state.tutorial.currentStep === 'assign_employee') {
    return {
      title: '安排员工',
      description: '回到「合同」详情，在员工列表里选择教学推荐员工并立即投入。',
      actionText: '进入推荐合同详情，点击教学推荐员工。',
      reasonText: '员工驻场后，推进到下班就能看到收入、工资和社保成本。',
      anchorIds: ['starter-labor-employee', 'starter-labor-detail-button', 'starter-labor-row', 'dock-labor'],
      target: 'labor',
    }
  }
  if (state.tutorial.currentStep === 'settle_first_day') {
    return {
      title: '推进时间',
      description: '点击顶部速度按钮加速到 18:00，查看第一笔驻场收入和人工成本。',
      actionText: '点击顶部速度按钮，把时间推进到下班。',
      reasonText: '日结会展示第一笔驻场收入、工资社保支出和净现金变化。',
      anchorIds: ['speed-fast', 'speed-normal'],
      target: 'speed',
    }
  }
  if (state.tutorial.currentStep === 'read_project_mail') {
    return {
      title: '读项目邮件',
      description: '打开「邮件」，阅读项目外包教学邮件，确认今天的小项目目标。',
      actionText: '打开「邮件」，阅读第二天项目外包备忘录。',
      reasonText: '读完后会指向推荐项目，开始学习项目外包闭环。',
      anchorIds: ['project-mail-action', 'project-mail-row', 'dock-mail'],
      target: 'mail',
    }
  }
  if (state.tutorial.currentStep === 'review_project_contract') {
    return {
      title: '签项目',
      description: '打开「项目」，选择带有项目教学标记的启明星官网改版。',
      actionText: '签下「启明星官网改版」推荐项目。',
      reasonText: '签约后需要招齐 5 个岗位，项目完成后一次性收款。',
      anchorIds: ['starter-project-sign-button', 'starter-project-row', 'dock-project'],
      target: 'project',
    }
  }
  if (state.tutorial.currentStep === 'hire_project_team') {
    return {
      title: '招项目小队',
      description: '打开「招聘」，给 5 个项目推荐候选人发 Offer。教学期 Offer 必定成功。',
      actionText: '给项目推荐候选人发送 Offer，招齐 5 个岗位。',
      reasonText: '产品、设计、前端、后端、测试齐了之后，才能推进完整项目。',
      anchorIds: ['starter-project-resume-confirm-offer-button', 'starter-project-resume-offer-button', 'dock-recruiting'],
      target: 'recruiting',
    }
  }
  if (state.tutorial.currentStep === 'assign_project_team') {
    return {
      title: '分配岗位',
      description: '打开「项目」详情，把产品、设计、前端、后端和测试员工分别投入推荐项目。',
      actionText: '在推荐项目详情里，为缺少的岗位分配教学推荐员工。',
      reasonText: '5 个岗位分配齐后，会触发一次受控甲方提前交付事件。',
      anchorIds: ['starter-project-employee', 'starter-project-role-missing', 'starter-project-detail-button', 'starter-project-row', 'dock-project'],
      target: 'project',
    }
  }
  if (state.tutorial.currentStep === 'resolve_deadline_cut_event') {
    return {
      title: '处理甲方事件',
      description: '打开「事件」，处理教学甲方事件。推荐选择「只提前 1 天」，处理后截止日会压缩到今天。',
      actionText: '处理「甲方要求提前交付」，推荐选择「只提前 1 天」。',
      reasonText: '处理后项目截止日会变成今天，观察项目风险和交付压力。',
      anchorIds: ['starter-event-recommended-option', 'starter-event-card', 'dock-event'],
      target: 'event',
    }
  }
  if (state.tutorial.currentStep === 'finish_starter_project') {
    return {
      title: '完成项目',
      description: '继续推进时间，观察项目阶段完成、验收邮件和项目完成款入账。',
      actionText: '继续推进时间，等待推荐项目完成验收。',
      reasonText: '完成后会产生项目外包收入，新手教学结束。',
      anchorIds: ['speed-fast', 'speed-normal'],
      target: 'speed',
    }
  }

  return {
    title: '新手教学已完成',
    description: '你已经跑通驻场日结、项目交付和甲方事件处理。',
    actionText: '继续自由经营公司。',
    reasonText: '后续待办会恢复为通用经营目标。',
    anchorIds: [],
    target: 'done',
  }
}
