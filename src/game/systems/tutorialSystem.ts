import {
  RESUMES_PER_REFRESH,
  SOCIAL_INSURANCE_COMPANY_RATE,
  STARTING_MONEY,
  WORK_START_MINUTE,
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
  TutorialAnchorId,
  TutorialCoachContent,
  TutorialGuideNode,
  TutorialNodeId,
  TutorialNodeTarget,
  TutorialState,
} from '../types'
import { roleLabels } from '../ui'
import { addEvent, createId } from './eventSystem'
import { sendMail } from './mailSystem'

export type { TutorialAnchorId } from '../types'

export interface TutorialTodoItem {
  text: string
  meta: string
  done: boolean
  current?: boolean
}

export type TutorialCoach = TutorialCoachContent

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
const tutorialNodeOrder: TutorialNodeId[] = [
  'read_welcome_mail',
  'review_labor_contract',
  'send_offer',
  'assign_employee',
  'start_first_day_time',
  'catch_slacking_employee',
  'settle_first_day',
  'read_project_mail',
  'review_project_contract',
  'hire_project_team',
  'assign_project_team',
  'wait_project_deadline_cut_event',
  'resolve_deadline_cut_event',
  'finish_starter_project',
  'completed',
]

function guideAnchors(...anchorIds: TutorialAnchorId[]): TutorialAnchorId[] {
  return [...anchorIds, 'dialog-close-button']
}

interface TutorialNodeDefinition {
  id: TutorialNodeId
  nextId?: TutorialNodeId
  todoText: string
  coach: TutorialCoach
  target: TutorialNodeTarget
  getMeta: (state: TutorialRuntimeState) => string
  isCompleted: (state: TutorialRuntimeState) => boolean
}

type TutorialRuntimeState = Pick<GameState, 'employees' | 'financeRecords' | 'laborContracts' | 'mailbox' | 'pendingProjectClientEvents' | 'projectContracts' | 'tutorial'>

function createGuideNode(definition: TutorialNodeDefinition): TutorialGuideNode {
  return {
    id: definition.id,
    nextId: definition.nextId,
    completed: false,
    todoText: definition.todoText,
    coach: definition.coach,
  }
}

function createTutorialNodes(): Record<TutorialNodeId, TutorialGuideNode> {
  return Object.fromEntries(
    tutorialNodeDefinitions.map((definition) => [definition.id, createGuideNode(definition)]),
  ) as Record<TutorialNodeId, TutorialGuideNode>
}

function getTutorialNodeDefinition(nodeId: TutorialNodeId): TutorialNodeDefinition {
  const definition = tutorialNodeDefinitionsById[nodeId]
  if (!definition) {
    throw new Error(`未知教学节点：${nodeId}`)
  }
  return definition
}

/** 默认教学状态创建；节点链表是教学进度的唯一来源，UI 只能通过 helper 读取当前节点。 */
export function createInitialTutorialState(enabled = true): TutorialState {
  const nodes = createTutorialNodes()

  if (!enabled) {
    for (const node of Object.values(nodes)) {
      node.completed = true
    }
  }

  return {
    // 关闭教程时直接进入 completed，避免待办、遮罩、高亮和教学保底市场继续影响正常开局。
    enabled,
    completed: !enabled,
    currentNodeId: enabled ? 'read_welcome_mail' : 'completed',
    nodes,
    starterResumeIds: [],
    starterStatusTriggered: false,
    starterStatusHandled: false,
    starterProjectResumeIds: [],
  }
}

function createStarterLaborContract(state: GameState): LaborContract {
  return {
    id: createId(state, 'labor'),
    clientCompanyId: 201,
    clientName: '星河科技',
    clientProfile: {
      id: 201,
      name: '星河科技',
      relationship: 65,
      budgetLevel: 52,
      requirementChaos: 35,
      temper: 45,
      trust: 60,
    },
    title: '星河科技驻场前端',
    requiredRole: starterRole,
    requiredAbility: 50,
    dailyBudget: 560,
    urgency: 'normal',
    durationDays: 8,
    endDay: state.time.day + 7,
    deadlineDay: state.time.day + 7,
    todayOutput: 0,
    todayRequiredOutput: 0,
    todayOutputDay: state.time.day,
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
    slackingTendency: 0.08,
  }

  return [steadyResume]
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

const tutorialNodeDefinitions: TutorialNodeDefinition[] = [
  {
    id: 'read_welcome_mail',
    nextId: 'review_labor_contract',
    todoText: '查看创业第一天邮件',
    getMeta: (state) => (isWelcomeMailRead(state) ? '已读' : '未读'),
    isCompleted: isWelcomeMailRead,
    target: 'mail',
    coach: {
      title: '读邮件',
      description: '打开底部「邮件」，阅读创业第一天邮件，确认第一单目标。',
      actionText: '点击「邮件」，把创业第一天邮件标记已读。',
      reasonText: '读完后会指向推荐驻场合同，开始第一笔稳定现金流。',
      anchorIds: guideAnchors('welcome-mail-action', 'welcome-mail-row', 'dock-mail'),
      target: 'mail',
    },
  },
  {
    id: 'review_labor_contract',
    nextId: 'send_offer',
    todoText: '签下推荐驻场合同',
    getMeta: (state) => {
      const starterContract = getStarterLaborContract(state)
      return starterContract ? `${roleLabels[starterContract.requiredRole]} · ${starterContract.dailyBudget}/天` : '未生成'
    },
    isCompleted: (state) => Boolean(getStarterLaborContract(state)?.status !== 'available'),
    target: 'labor',
    coach: {
      title: '签推荐合同',
      description: '打开「合同」，选择带有推荐标记的星河科技驻场前端。',
      actionText: '签下带「推荐第一单」标记的驻场合同。',
      reasonText: '签约后就能招聘并安排员工，跑通第一天日结。',
      anchorIds: guideAnchors('starter-labor-sign-button', 'starter-labor-row', 'dock-labor'),
      target: 'labor',
    },
  },
  {
    id: 'send_offer',
    nextId: 'assign_employee',
    todoText: '给匹配候选人发 Offer',
    getMeta: (state) => (hasActiveEmployee(state) ? '已入职' : '待招聘'),
    isCompleted: hasActiveEmployee,
    target: 'recruiting',
    coach: {
      title: '调成本发 Offer',
      description: '打开「招聘」，推荐候选人发送 Offer。',
      actionText: '可以调整工资和社保，再发送 Offer。',
      reasonText: '教学期 Offer 会 100% 成功，低工资和低社保能现金流，但可能会被拒绝并且影响满意度和劳动风险，入职后还能在员工详情页继续调整。',
      anchorIds: guideAnchors('starter-resume-compensation-settings', 'starter-resume-confirm-offer-button', 'starter-resume-offer-button', 'dock-recruiting'),
      target: 'recruiting',
    },
  },
  {
    id: 'assign_employee',
    nextId: 'start_first_day_time',
    todoText: '将员工安排到推荐合同',
    getMeta: (state) => (getStarterLaborContract(state)?.assignedEmployeeId ? '已驻场' : '待分配'),
    isCompleted: (state) => Boolean(getStarterLaborContract(state)?.assignedEmployeeId),
    target: 'labor',
    coach: {
      title: '安排员工',
      description: '回到「合同」详情，在员工列表里选择教学推荐员工并立即投入。',
      actionText: '进入推荐合同详情，点击教学推荐员工。',
      reasonText: '员工驻场后，先加速观察员工状态，再推进到下班看日结。',
      anchorIds: guideAnchors('starter-labor-employee', 'starter-labor-detail-button', 'starter-labor-row', 'dock-labor'),
      target: 'labor',
    },
  },
  {
    id: 'start_first_day_time',
    nextId: 'catch_slacking_employee',
    todoText: '加速观察员工状态',
    getMeta: (state) => (hasStarterStatusLessonStarted(state) ? '已发现' : '待推进'),
    isCompleted: hasStarterStatusLessonStarted,
    target: 'speed',
    coach: {
      title: '观察状态',
      description: '点击顶部速度按钮，让员工先工作一会儿，观察办公室里的员工状态变化。',
      actionText: '点击顶部速度按钮，推进几分钟观察员工状态。',
      reasonText: '员工状态会影响实际产出；摸鱼和离岗时产出为 0。',
      anchorIds: guideAnchors('speed-fast', 'speed-normal'),
      target: 'speed',
    },
  },
  {
    id: 'catch_slacking_employee',
    nextId: 'settle_first_day',
    todoText: '处理摸鱼员工',
    getMeta: (state) => hasStarterStatusLessonHandled(state) ? '已处理' : hasStarterStatusLessonStarted(state) ? '待处理' : '待触发',
    isCompleted: hasStarterStatusLessonHandled,
    target: 'employee',
    coach: {
      title: '抓摸鱼',
      description: '点击办公室里的摸鱼员工，或打开「员工」找到高亮员工，处理当前状态。',
      actionText: '点击摸鱼员工，推荐使用「口头提醒」。',
      reasonText: '提醒或处罚会让员工回到工作；经常严厉处罚会伤害满意度、士气和公司声誉。',
      anchorIds: guideAnchors(
        'starter-employee-discipline-verbal-button',
        'starter-employee-discipline-button',
        'starter-employee-hotspot',
        'starter-employee-row',
        'dock-employee',
      ),
      target: 'employee',
    },
  },
  {
    id: 'settle_first_day',
    nextId: 'read_project_mail',
    todoText: '推进到下班查看日结',
    getMeta: (state) => (hasStarterLaborOutcome(state) ? '已反馈' : '待日结'),
    isCompleted: (state) => Boolean(getStarterProjectContract(state)),
    target: 'speed',
    coach: {
      title: '推进时间',
      description: '点击顶部速度按钮加速到 18:00，查看第一笔驻场收入和人工成本。',
      actionText: '点击顶部速度按钮，把时间推进到下班。',
      reasonText: '日结会展示第一笔驻场收入、工资社保支出和净现金变化。',
      anchorIds: guideAnchors('speed-fast', 'speed-normal'),
      target: 'speed',
    },
  },
  {
    id: 'read_project_mail',
    nextId: 'review_project_contract',
    todoText: '阅读项目教学邮件',
    getMeta: (state) => (isProjectMailRead(state) ? '已读' : '未读'),
    isCompleted: isProjectMailRead,
    target: 'mail',
    coach: {
      title: '读项目邮件',
      description: '打开「邮件」，阅读项目外包教学邮件，确认今天的小项目目标。',
      actionText: '打开「邮件」，阅读第二天项目外包备忘录。',
      reasonText: '读完后会指向推荐项目，开始学习项目外包闭环。',
      anchorIds: guideAnchors('project-mail-action', 'project-mail-row', 'dock-mail'),
      target: 'mail',
    },
  },
  {
    id: 'review_project_contract',
    nextId: 'hire_project_team',
    todoText: '签下推荐项目',
    getMeta: (state) => getStarterProjectContract(state)?.status !== 'available' ? '已签约' : '待签约',
    isCompleted: (state) => Boolean(getStarterProjectContract(state)?.status !== 'available'),
    target: 'project',
    coach: {
      title: '签项目',
      description: '打开「项目」，选择带有项目教学标记的启明星官网改版。',
      actionText: '签下「启明星官网改版」推荐项目。',
      reasonText: '签约后需要招齐 5 个岗位，项目完成后一次性收款。',
      anchorIds: guideAnchors('starter-project-sign-button', 'starter-project-row', 'dock-project'),
      target: 'project',
    },
  },
  {
    id: 'hire_project_team',
    nextId: 'assign_project_team',
    todoText: '招齐项目小队',
    getMeta: (state) => `${state.tutorial.starterProjectResumeIds.filter((resumeId) =>
      state.employees.some((employee) => employee.sourceResumeId === resumeId && employee.status !== 'fired'),
    ).length}/5 人`,
    isCompleted: hasStarterProjectTeamHired,
    target: 'recruiting',
    coach: {
      title: '招项目小队',
      description: '打开「招聘」，给 5 个项目推荐候选人发 Offer。教学期 Offer 必定成功。',
      actionText: '给项目推荐候选人发送 Offer，招齐 5 个岗位。',
      reasonText: '产品、设计、前端、后端、测试齐了之后，才能推进完整项目。',
      anchorIds: guideAnchors('starter-project-resume-confirm-offer-button', 'starter-project-resume-offer-button', 'dock-recruiting'),
      target: 'recruiting',
    },
  },
  {
    id: 'assign_project_team',
    nextId: 'wait_project_deadline_cut_event',
    todoText: '分配 5 个项目岗位',
    getMeta: (state) => (hasStarterProjectTeamAssigned(state) || Boolean(state.tutorial.projectClientEventId) || hasStarterProjectIncome(state) ? '已分配' : '待分配'),
    isCompleted: hasStarterProjectTeamAssigned,
    target: 'project',
    coach: {
      title: '分配岗位',
      description: '打开「项目」详情，把产品、设计、前端、后端和测试员工分别投入推荐项目。',
      actionText: '在推荐项目详情里，为缺少的岗位分配教学推荐员工。',
      reasonText: '5 个岗位分配齐后，会触发一次受控甲方提前交付事件。',
      anchorIds: guideAnchors('starter-project-employee', 'starter-project-role-missing', 'starter-project-detail-button', 'starter-project-row', 'dock-project'),
      target: 'project',
    },
  },
  {
    id: 'wait_project_deadline_cut_event',
    nextId: 'resolve_deadline_cut_event',
    todoText: '处理甲方提前交付事件',
    getMeta: (state) => {
      if (isStarterProjectClientEventResolved(state)) {
        return '已处理'
      }
      if (isStarterProjectClientEventPending(state)) {
        return '待处理'
      }
      return isCurrentTutorialNode(state.tutorial, 'wait_project_deadline_cut_event') ? '推进到明早' : '待触发'
    },
    isCompleted: (state) => Boolean(state.tutorial.projectClientEventId),
    target: 'speed',
    coach: {
      title: '等待甲方事件',
      description: '推荐项目岗位已经分配齐。推进到下个工作日上午，教学甲方事件会自动触发。',
      actionText: '点击顶部速度按钮，把时间推进到下个工作日上午。',
      reasonText: '下午分配齐项目小队时会延后触发事件，避免项目没有完整工作日可完成。',
      anchorIds: guideAnchors('speed-fast', 'speed-normal'),
      target: 'speed',
    },
  },
  {
    id: 'resolve_deadline_cut_event',
    nextId: 'finish_starter_project',
    todoText: '处理甲方提前交付事件',
    getMeta: (state) => isStarterProjectClientEventResolved(state) ? '已处理' : isStarterProjectClientEventPending(state) ? '待处理' : '待触发',
    isCompleted: isStarterProjectClientEventResolved,
    target: 'event',
    coach: {
      title: '处理甲方事件',
      description: '打开「事件」，处理教学甲方事件。推荐选择「压缩工期」，也可以选择无视甲方要求。',
      actionText: '处理「甲方要求提前交付」，选择「压缩工期」或「无视甲方要求」。',
      reasonText: '处理后项目截止日会变成今天，观察项目风险和交付压力。',
      anchorIds: guideAnchors('starter-event-recommended-option', 'starter-event-card', 'dock-event'),
      target: 'event',
    },
  },
  {
    id: 'finish_starter_project',
    nextId: 'completed',
    todoText: '推进到项目完成收款',
    getMeta: (state) => (hasStarterProjectIncome(state) ? '已收款' : '待交付'),
    isCompleted: hasStarterProjectIncome,
    target: 'speed',
    coach: {
      title: '完成项目',
      description: '继续推进时间，观察项目阶段完成、验收邮件和项目完成款入账。',
      actionText: '继续推进时间，等待推荐项目完成验收。',
      reasonText: '完成后会产生项目外包收入，新手教学结束。',
      anchorIds: guideAnchors('speed-fast', 'speed-normal'),
      target: 'speed',
    },
  },
  {
    id: 'completed',
    todoText: '新手教学已完成',
    getMeta: () => '已完成',
    isCompleted: () => true,
    target: 'done',
    coach: {
      title: '新手教学已完成',
      description: '你已经跑通驻场日结、项目交付和甲方事件处理。',
      actionText: '继续自由经营公司。',
      reasonText: '后续待办会恢复为通用经营目标。',
      anchorIds: [],
      target: 'done',
    },
  },
]

const tutorialNodeDefinitionsById = Object.fromEntries(
  tutorialNodeDefinitions.map((definition) => [definition.id, definition]),
) as Record<TutorialNodeId, TutorialNodeDefinition>

export function estimatedEmployeeDailyCost(salaryPerDay: number, socialInsuranceRatio: number): number {
  return salaryPerDay + Math.round(salaryPerDay * socialInsuranceRatio * SOCIAL_INSURANCE_COMPANY_RATE)
}

export function clampTutorialOffer(
  resume: Resume,
  salaryPerDay: number,
  socialInsuranceRatio: number,
): { salaryPerDay: number; socialInsuranceRatio: number } {
  const minimumOffer = getTutorialMinimumOffer(resume)
  const salaryMax = Math.round(resume.expectedSalaryPerDay * TUTORIAL_OFFER_LIMITS.salaryMaxPercent / 100)
  // 教学期社保比例会影响每日成本、员工满意度和后续劳动风险；这里限制小范围调整，避免第一单被极端输入破坏。
  const socialMax = TUTORIAL_OFFER_LIMITS.socialMaxPercent / 100

  return {
    salaryPerDay: Math.min(salaryMax, Math.max(minimumOffer.salaryPerDay, Math.round(salaryPerDay))),
    socialInsuranceRatio: Math.min(socialMax, Math.max(minimumOffer.socialInsuranceRatio, socialInsuranceRatio)),
  }
}

export function getTutorialMinimumOffer(resume: Pick<Resume, 'expectedSalaryPerDay'>): { salaryPerDay: number; socialInsuranceRatio: number; socialPercent: number } {
  // 教学最低成本配置会影响 Offer 现金支出、入职后满意度和劳动风险；UI 和业务校验共用它，避免两边计算不一致。
  return {
    salaryPerDay: Math.round(resume.expectedSalaryPerDay * TUTORIAL_OFFER_LIMITS.salaryMinPercent / 100),
    socialInsuranceRatio: TUTORIAL_OFFER_LIMITS.socialMinPercent / 100,
    socialPercent: TUTORIAL_OFFER_LIMITS.socialMinPercent,
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

export function getCurrentTutorialNode(tutorial: TutorialState): TutorialGuideNode {
  return tutorial.nodes[tutorial.currentNodeId]
}

export function isCurrentTutorialNode(tutorial: TutorialState, ...nodeIds: TutorialNodeId[]): boolean {
  return tutorial.enabled && !tutorial.completed && nodeIds.includes(tutorial.currentNodeId)
}

export function getTutorialMailKind(tutorial: TutorialState, mailId: string): 'welcome' | 'project' | undefined {
  if (!tutorial.enabled || tutorial.completed) {
    return undefined
  }
  if (mailId === tutorial.welcomeMailId) {
    return 'welcome'
  }
  if (mailId === tutorial.projectMailId) {
    return 'project'
  }
  return undefined
}

export function isStarterProjectClientEvent(tutorial: TutorialState, eventId: string): boolean {
  return tutorial.enabled && !tutorial.completed && tutorial.projectClientEventId === eventId
}

export function getStarterStatusEmployeeId(tutorial: TutorialState): string | undefined {
  return isCurrentTutorialNode(tutorial, 'catch_slacking_employee') ? tutorial.starterStatusEmployeeId : undefined
}

export function isStarterLaborResume(tutorial: TutorialState, resumeId: string): boolean {
  return tutorial.enabled && tutorial.starterResumeIds.includes(resumeId)
}

export function isStarterStatusEmployee(state: Pick<GameState, 'tutorial'>, employee: Pick<Employee, 'id'>): boolean {
  return Boolean(
    state.tutorial.enabled &&
      !state.tutorial.completed &&
      isCurrentTutorialNode(state.tutorial, 'catch_slacking_employee') &&
      state.tutorial.starterStatusEmployeeId === employee.id,
  )
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

function getStarterLaborAssignedEmployee(
  state: Pick<GameState, 'employees' | 'laborContracts' | 'tutorial'>,
): Employee | undefined {
  const starterContract = getStarterLaborContract(state)
  if (!starterContract?.assignedEmployeeId) {
    return undefined
  }

  return state.employees.find((employee) =>
    employee.id === starterContract.assignedEmployeeId && employee.status !== 'fired',
  )
}

function hasStarterStatusLessonStarted(state: Pick<GameState, 'financeRecords' | 'tutorial'>): boolean {
  return Boolean(state.tutorial.starterStatusTriggered || hasStarterLaborOutcome(state))
}

function hasStarterStatusLessonHandled(state: Pick<GameState, 'financeRecords' | 'tutorial'>): boolean {
  return Boolean(state.tutorial.starterStatusHandled || hasStarterLaborOutcome(state))
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
    body: '你已经跑通第一笔驻场现金流，可以先自由扩张驻场单，也可以继续跟随推荐项目教学。今天推荐接一个小项目，招齐产品、设计、前端、后端和测试，观察多岗位项目如何推进和收款。',
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
        id: 'compress_deadline',
        label: '压缩工期',
        description: '接受甲方要求，截止日压缩到今天，项目小队压力和疲劳上升。',
        effects: {
          deadlineDayDelta: deadlineDelta,
          clientTrustDelta: 2,
          employeePressureDelta: 8,
          employeeEnergyDelta: -5,
          employeeSatisfactionDelta: -3,
        },
      },
      {
        id: 'ignore_request',
        label: '无视甲方要求',
        description: '不理会甲方催促；教学仍把截止日压缩到今天，但甲方信任下降且罚金风险上升。',
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
  // 教学甲方事件同样只暂停时间，不清空 speed；玩家选完方案后会恢复到触发前的播放/快进速度。
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

function triggerStarterEmployeeStatusLessonInPlace(state: GameState): void {
  if (
    !state.tutorial.enabled ||
    state.tutorial.completed ||
    state.tutorial.starterStatusTriggered ||
    hasStarterLaborOutcome(state)
  ) {
    return
  }

  const employee = getStarterLaborAssignedEmployee(state)
  if (
    !employee ||
    state.time.paused ||
    state.time.speed === 0 ||
    state.time.minuteOfDay <= WORK_START_MINUTE
  ) {
    return
  }

  // 第一次员工状态教学是受控触发：只改变推荐驻场员工的当前状态和时间暂停，不写事件日志，避免玩家刚开局就被随机日志噪声打断。
  employee.status = 'slacking'
  state.tutorial.starterStatusEmployeeId = employee.id
  state.tutorial.starterStatusTriggered = true
  state.time.speed = 0
  state.time.paused = true
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
    return `推荐驻场合同完成第一次日结，收入 +${record.amount}。驻场现金流已跑通，你可以自己去合同市场签更多人力外包单。`
  }
  if (record?.type === 'labor_penalty') {
    return `推荐驻场合同已经产生违约反馈，本次扣款 ${Math.abs(record.amount)}，需要尽快补人。`
  }
  return '推荐驻场合同已经完成第一次日结反馈。'
}

function recordTutorialNodeEvents(
  state: GameState,
  previousStep: TutorialNodeId,
  nextStep: TutorialNodeId,
): void {
  const previousIndex = tutorialNodeOrder.indexOf(previousStep)
  const nextIndex = tutorialNodeOrder.indexOf(nextStep)
  if (previousIndex < 0 || nextIndex <= previousIndex) {
    return
  }

  const starterLaborContractId = state.tutorial.starterLaborContractId
  for (const completedStep of tutorialNodeOrder.slice(previousIndex, nextIndex)) {
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
      addTutorialEventOnce(state, '员工已安排到第一单', '推荐驻场合同已有员工驻场，先推进时间观察员工状态。', starterLaborContractId)
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
    if (completedStep === 'wait_project_deadline_cut_event') {
      addTutorialEventOnce(state, '等待甲方提前交付事件', '推荐项目岗位已分配齐，教学甲方事件会在下个工作日上午触发。', state.tutorial.starterProjectContractId)
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
  if (!state.tutorial.enabled) {
    return
  }

  applyStarterProjectMarketInPlace(state)
  createStarterDeadlineCutEventInPlace(state)
  normalizeResolvedStarterProjectEvent(state)
  triggerStarterEmployeeStatusLessonInPlace(state)

  const previousStep = state.tutorial.currentNodeId
  let currentNodeId = state.tutorial.currentNodeId

  // 节点推进统一在这里完成：先刷新当前节点完成状态，再沿 nextId 跳过所有已满足条件的节点。
  // 这样 UI 不需要知道“项目事件已生成时要跳过等待节点”等流程细节。
  while (true) {
    const definition = getTutorialNodeDefinition(currentNodeId)
    const node = state.tutorial.nodes[currentNodeId] ?? createGuideNode(definition)
    const completed = definition.isCompleted(state)
    state.tutorial.nodes[currentNodeId] = {
      ...node,
      completed,
    }

    if (!completed || !definition.nextId) {
      break
    }

    currentNodeId = definition.nextId
  }

  if (currentNodeId === 'completed') {
    state.tutorial.nodes.completed = {
      ...state.tutorial.nodes.completed,
      completed: true,
    }
  }

  if (recordEvents) {
    recordTutorialNodeEvents(state, previousStep, currentNodeId)
  }

  state.tutorial.currentNodeId = currentNodeId
  state.tutorial.completed = currentNodeId === 'completed'
}

export function syncTutorialProgress(state: GameState, recordEvents = true): GameState {
  const draft = cloneState(state)
  syncTutorialProgressInPlace(draft, recordEvents)
  return draft
}

export function markTutorialEmployeeStatusHandled(state: GameState, employeeId: string): GameState {
  const draft = cloneState(state)
  if (
    draft.tutorial.enabled &&
    !draft.tutorial.completed &&
    draft.tutorial.starterStatusTriggered &&
    !draft.tutorial.starterStatusHandled &&
    draft.tutorial.starterStatusEmployeeId === employeeId
  ) {
    draft.tutorial.starterStatusHandled = true
  }
  syncTutorialProgressInPlace(draft, true)
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
  state: TutorialRuntimeState,
): TutorialTodoItem[] {
  const starterProject = getStarterProjectContract(state)
  return tutorialNodeDefinitions
    .filter((definition) => definition.id !== 'completed')
    .filter((definition) => starterProject || tutorialNodeOrder.indexOf(definition.id) <= tutorialNodeOrder.indexOf('settle_first_day'))
    .map((definition) => {
      const node = state.tutorial.nodes[definition.id]
      const done = node?.completed || definition.isCompleted(state)
      return {
        text: definition.todoText,
        meta: definition.getMeta(state),
        done,
        current: state.tutorial.currentNodeId === definition.id,
      }
    })
}

export function getTutorialCoach(state: Pick<GameState, 'tutorial'>): TutorialCoach | undefined {
  if (!state.tutorial.enabled || state.tutorial.completed) {
    return undefined
  }
  return getCurrentTutorialNode(state.tutorial).coach
}
