/** 玩家可选择的下班整点；到这个时间会自动日结并进入下一天。 */
export type WorkHour = 18 | 19 | 20 | 21 | 22 | 23 | 24
/** 游戏速度；0 表示暂停，1 表示正常速度，2 表示二倍速，6 表示快速推进。 */
export type GameSpeed = 0 | 1 | 2 | 6
/** 员工和项目使用的岗位/技能类型。 */
export type SkillRole = 'product' | 'design' | 'frontend' | 'backend' | 'testing'
/** 简历上自称的技能等级，只代表候选人包装，不直接决定真实效率。 */
export type ResumeSkillLevel = 'junior' | 'mid' | 'senior'
/** 学校背景，用于生成简历和影响候选人画像。 */
export type SchoolType = 'normal' | '211' | '985' | 'qs100'
/** 员工当前状态，用于 UI 展示、办公室头顶标签和项目产出计算。 */
export type EmployeeStatus =
  | 'idle'
  | 'focused_work'
  | 'working'
  | 'slacking'
  | 'drinking_water'
  | 'smoking'
  | 'toilet'
  | 'job_browsing'
  | 'gaming'
  | 'fired'
/** 玩家抓到员工摸鱼或离岗时可以执行的管理动作；辞退只在员工详情页执行。 */
export type EmployeeDisciplineAction = 'ignore' | 'verbal_warn' | 'formal_warn' | 'fine'
/** 员工被分配到的工作类型：人力外包或项目外包。 */
export type AssignmentType = 'labor' | 'project'
/** 员工投入方式；立即投入会中断当前工作，做完当前工作后投入会写入后续安排。 */
export type AssignmentMode = 'immediate' | 'after_current'
/** 项目当前阶段，阶段只能按顺序推进。 */
export type ProjectPhase = 'product' | 'design' | 'development' | 'testing'
/** 项目进度轨道；开发阶段拆成前端和后端两个轨道。 */
export type ProjectWorkTrack = 'product' | 'design' | 'frontend' | 'backend' | 'testing'
/** 项目合同状态；延期项目会继续推进直到 completed，毁约项目会停止推进并释放人员。 */
export type ProjectStatus = 'available' | 'accepted' | 'active' | 'overdue' | 'completed' | 'breached'
/** 甲方项目随机事件类型；只用于项目外包的待处理选择事件。 */
export type ProjectClientEventKind =
  | 'scope_change'
  | 'deadline_cut'
  | 'design_rework'
  | 'acceptance_dispute'
  | 'budget_for_scope'
/** 人力外包合同状态。 */
export type LaborContractStatus =
  | 'available'
  | 'accepted'
  | 'active'
  | 'warning'
  | 'completed'
  | 'terminated'
/** 人力外包紧急程度；急召期限更短但预算更高。 */
export type LaborUrgency = 'urgent' | 'normal'
/** 事件严重程度，用于 UI 决定颜色和优先级。 */
export type EventSeverity = 'info' | 'warning' | 'danger' | 'success'
/** 游戏事件分类，用于事件列表筛选和展示。 */
export type GameEventType =
  | 'tutorial'
  | 'finance'
  | 'recruiting'
  | 'contract'
  | 'project'
  | 'employee'
  | 'warning'
/** 财务流水类型，用于报表聚合和追踪资金来源。 */
export type FinanceRecordType =
  | 'salary'
  | 'social_insurance'
  | 'labor_income'
  | 'labor_penalty'
  | 'project_income'
  | 'project_penalty'
  | 'social_insurance_complaint'
  | 'arbitration'
  | 'fire_compensation'
  | 'discipline_fine'
/** 邮件类型，用于邮箱筛选和模板匹配。 */
export type MailType =
  | 'tutorial'
  | 'contract_signed'
  | 'contract_warning'
  | 'contract_breach'
  | 'project_overdue'
  | 'project_completed'
  | 'daily_finance_report'
  | 'labor_dispute_filed'
  | 'labor_dispute_result'
  | 'social_insurance_complaint'
/** 仲裁原因，决定邮件文案和胜诉风险判断。 */
export type ArbitrationReason =
  | 'underpaid_social_insurance'
  | 'low_compensation'
  | 'low_satisfaction'
/** 仲裁状态；pending 表示还没出结果。 */
export type ArbitrationStatus = 'pending' | 'won_by_employee' | 'rejected'
/** 新手教学节点 ID；节点按 nextId 串成单向链表，驱动左侧待办、推荐标记和遮罩指引。 */
export type TutorialNodeId =
  | 'read_welcome_mail'
  | 'review_labor_contract'
  | 'send_offer'
  | 'assign_employee'
  | 'start_first_day_time'
  | 'catch_slacking_employee'
  | 'settle_first_day'
  | 'read_project_mail'
  | 'review_project_contract'
  | 'hire_project_team'
  | 'assign_project_team'
  | 'wait_project_deadline_cut_event'
  | 'resolve_deadline_cut_event'
  | 'finish_starter_project'
  | 'completed'

/** 新手教学节点的指向目标；它影响底部 Dock 高亮、遮罩定位和玩家当前应关注的系统入口。 */
export type TutorialNodeTarget = 'mail' | 'labor' | 'recruiting' | 'project' | 'event' | 'employee' | 'speed' | 'done'

/** 教学 DOM 锚点 ID；组件只暴露锚点，是否使用由教学系统统一判断。 */
export type TutorialAnchorId =
  | 'dock-employee'
  | 'dock-mail'
  | 'dock-labor'
  | 'dock-recruiting'
  | 'dock-project'
  | 'dock-event'
  | 'speed-normal'
  | 'speed-fast'
  | 'dialog-close-button'
  | 'welcome-mail-row'
  | 'welcome-mail-action'
  | 'project-mail-row'
  | 'project-mail-action'
  | 'starter-labor-row'
  | 'starter-labor-sign-button'
  | 'starter-labor-detail-button'
  | 'starter-labor-employee'
  | 'starter-employee-hotspot'
  | 'starter-employee-row'
  | 'starter-employee-discipline-button'
  | 'starter-employee-discipline-verbal-button'
  | 'starter-resume-compensation-settings'
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

export interface TutorialCoachContent {
  title: string
  description: string
  actionText: string
  reasonText: string
  anchorIds: TutorialAnchorId[]
  target: TutorialNodeTarget
}

export interface TutorialGuideNode {
  /** 节点唯一 ID；它也是链表推进和 UI 查询的稳定 key。 */
  id: TutorialNodeId
  /** 下一个教学节点；为空表示链表已经到终点。 */
  nextId?: TutorialNodeId
  /** 该节点是否完成；完成后 syncTutorialProgress 会沿 nextId 推进到下一个未完成节点。 */
  completed: boolean
  /** 左侧待办展示文案；动态状态文本由 tutorialSystem 按当前局面计算。 */
  todoText: string
  /** 当前节点遮罩引导内容；它影响高亮目标、遮罩锚点和引导说明。 */
  coach: TutorialCoachContent
}

export interface GameTime {
  /** 当前游戏日，从第 1 天开始。 */
  day: number
  /** 当天已经走到第几分钟；例如 09:00 是 540。 */
  minuteOfDay: number
  /** 从开局以来累计推进的游戏分钟数，用于后续统计总时长。 */
  totalMinutes: number
  /** 现实毫秒累积器；避免每帧 delta 不足 2000ms 时丢失时间。 */
  realMsAccumulator: number
  /** 当前游戏速度；影响现实时间换算为游戏分钟的倍率。 */
  speed: GameSpeed
  /** 是否暂停；暂停时 tick 不推进游戏时间和系统结算。 */
  paused: boolean
}

export interface GameSettings {
  /** 玩家设定的下班时间；越晚下班，员工满意度下降越多。 */
  offWorkHour: WorkHour
}

export interface SkillClaim {
  /** 简历上声明的技能岗位。 */
  role: SkillRole
  /** 简历上声明的技能等级，不等于隐藏真实能力。 */
  level: ResumeSkillLevel
}

export interface Assignment {
  /** 分配目标类型，决定员工是在驻场还是做项目。 */
  type: AssignmentType
  /** 合同或项目的 ID，用于反查员工当前工作。 */
  id: string
  /** 员工在当前分配中的岗位职责。 */
  role?: SkillRole
}

export interface Employee {
  /** 员工唯一 ID，用于合同、项目、邮件和事件关联。 */
  id: string
  /** 员工真实姓名，来自候选人简历。 */
  name: string
  /** 玩家给员工起的花名，用于增强公司文化和 UI 展示。 */
  nickname?: string
  /** 员工毕业院校类型，影响候选人画像和后续平衡。 */
  school: SchoolType
  /** 简历上展示给玩家的技能信息，可能夸大或低估真实能力。 */
  resumeSkills: SkillClaim[]
  /** 入职来源简历 ID；它用于教学阶段识别保底候选人，并可支持后续招聘转化分析。 */
  sourceResumeId?: string
  /** 员工隐藏真实技能能力值；项目效率等于对应能力值 / 100。 */
  realSkillAbilities: Partial<Record<SkillRole, number>>
  /**
   * 员工每日税前工资；它受 offer 和详情页调薪影响，
   * 会影响每日工资支出、社保公司成本、辞退赔偿和仲裁诉求金额。
   */
  salaryPerDay: number
  /**
   * 社保公积金缴纳比例；1 表示按工资 100% 缴纳。
   * 它受 offer 和详情页社保设置影响，会影响每日社保成本、满意度下降、社保投诉概率和仲裁风险。
   */
  socialInsuranceRatio: number
  /**
   * 员工满意度；它受加班、社保不足和工资调整影响，
   * 过低会提高社保投诉、劳动仲裁等风险，并影响公司运营稳定性展示。
   */
  satisfaction: number
  /** 员工仲裁倾向；越高越容易在不满时发起仲裁。 */
  arbitrationTendency: number
  /** 员工摸鱼倾向；每分钟工作时按这个概率产出为 0。 */
  slackingTendency: number
  /** 员工行为随机种子；入职时由全局种子生成，之后每次个人行为判定都会推进它。它受员工自身行为消耗影响，并影响摸鱼、产出等个人随机行为，使员工表现不再受其他系统随机数顺序干扰。 */
  behaviorSeed: number
  /**
   * 员工精力；受工作强度、休息类状态和每日恢复影响。
   * 精力越高越容易全力工作，精力过低会提高喝水、上厕所、摸鱼等低产出状态概率，并最终影响项目推进速度。
   */
  energy: number
  /**
   * 员工忠诚度；受薪酬满意、管理处罚和长期压力影响。
   * 忠诚度越低越容易刷招聘软件，也会放大离职、仲裁等后续系统的风险空间。
   */
  loyalty: number
  /**
   * 员工压力；受加班、正式处罚和高强度工作影响。
   * 压力越高越容易抽烟、上厕所、刷招聘软件，且会影响满意度、忠诚度和劳动风险。
   */
  pressure: number
  /**
   * 员工自律；受个人性格、提醒、警告和罚款影响。
   * 自律越高越不容易摸鱼或玩游戏，也会提高正常工作、全力工作的权重。
   */
  discipline: number
  /**
   * 员工进取心；受候选人能力、经验和入职画像影响。
   * 进取心越高越容易全力工作，但在忠诚度低或压力高时也更可能关注外部机会。
   */
  ambition: number
  /**
   * 员工在本公司工作的天数；每日结算后增加。
   * 它用于辞退赔偿和劳动风险计算，不再使用候选人简历里的过往工作年限。
   */
  workDays: number
  /** 当前工作分配；未分配时为空。 */
  assignedTo?: Assignment
  /**
   * 员工后续工作安排；它不会立刻改变 assignedTo，也不会立刻影响员工产出。
   * 只有员工从当前项目岗位、人力外包或其他工作中释放为空闲后才会尝试生效；
   * 生效后会改变员工当前分配，并影响项目岗位人力、项目进度推进或人力合同履约状态。
   */
  pendingAssignment?: Assignment
  /** 员工状态，用于 UI 展示和产出判断。 */
  status: EmployeeStatus
  /** 被辞退的游戏日；用于后续仲裁或历史记录。 */
  firedDay?: number
}

export interface Resume {
  /** 简历唯一 ID，用于发 offer 和从简历池移除。 */
  id: string
  /** 候选人姓名，成功入职后成为员工姓名。 */
  name: string
  /** 候选人学校背景。 */
  school: SchoolType
  /** 候选人工作年限，用于生成薪资期望和隐藏风险。 */
  workYears: number
  /** 简历展示技能，玩家只能基于它初步判断候选人。 */
  resumeSkills: SkillClaim[]
  /** 候选人期望日薪，影响 offer 接受概率。 */
  expectedSalaryPerDay: number
  /** 简历简介文案，用于营造招聘市场内容。 */
  introduction: string
  /** 候选人的隐藏真实技能，入职后复制到员工身上。 */
  realSkillAbilities: Partial<Record<SkillRole, number>>
  /** Offer 是否已被候选人拒绝；受发 offer 结果影响，影响招聘弹窗展示并阻止继续给同一人发送 offer。 */
  offerRejected?: boolean
  /** 候选人初始满意度，入职后成为员工满意度。 */
  satisfaction: number
  /** 候选人隐藏仲裁倾向，入职后成为员工风险属性。 */
  arbitrationTendency: number
  /** 候选人隐藏摸鱼倾向，入职后影响实际产出。 */
  slackingTendency: number
}

export interface RecruitingPost {
  /** 招聘公告唯一 ID，用于后续编辑或关闭。 */
  id: string
  /** 招聘公告对应岗位。 */
  role: SkillRole
  /** 公告承诺日薪，影响投递和 offer 成功率。 */
  salaryPerDay: number
  /** 公告最低能力要求，用于后续筛选投递简历。 */
  minAbility: number
  /** 公告是否仍在生效。 */
  active: boolean
}

export interface MarketState {
  /** 今天已使用的简历刷新次数。 */
  resumeRefreshesUsed: number
  /** 今天简历刷新上限，普通为 3，VIP 为 10。 */
  resumeRefreshLimit: number
  /** 是否开通招聘 VIP，影响刷新次数和后续投递规模。 */
  vip: boolean
  /** 玩家发布的招聘公告列表。 */
  recruitingPosts: RecruitingPost[]
}

export interface TutorialState {
  /** 是否启用新手引导；关闭后不再影响待办、推荐标记和教学完成判定。 */
  enabled: boolean
  /** 是否已完成新手教学；它受第一单人力外包和第二天项目外包完成情况影响，完成后左侧待办恢复通用经营目标。 */
  completed: boolean
  /** 当前教学节点；它由链表节点完成状态推进，影响当前遮罩、待办和推荐高亮。 */
  currentNodeId: TutorialNodeId
  /** 教学节点链表；每个节点独立记录是否完成，避免步骤判断散落在 UI 和业务系统里。 */
  nodes: Record<TutorialNodeId, TutorialGuideNode>
  /** 引导推荐的人力外包合同 ID；用于 UI 标记推荐第一单和判定教学闭环。 */
  starterLaborContractId?: string
  /** 引导保底候选人简历 ID；用于招聘列表推荐标记和员工来源识别。 */
  starterResumeIds: string[]
  /** 创业第一天教学邮件 ID；用于判断玩家是否已阅读开局经营建议。 */
  welcomeMailId?: string
  /** 第一天员工状态教学锁定的员工 ID；它受推荐驻场分配结果影响，用于办公室热点、员工列表高亮和处理完成判定。 */
  starterStatusEmployeeId?: string
  /** 是否已经触发过第一次受控摸鱼；它受第一天加速推进影响，避免教学摸鱼重复出现。 */
  starterStatusTriggered?: boolean
  /** 是否已经处理过第一次员工状态教学；它受玩家提醒、警告、罚款或忽略影响，完成后允许继续推进到第一天日结。 */
  starterStatusHandled?: boolean
  /** 引导推荐的项目外包合同 ID；用于项目教学高亮、受控甲方事件和完成收款判定。 */
  starterProjectContractId?: string
  /** 项目教学保底候选人简历 ID；用于招聘高亮、Offer 保底成功和项目小队完整性判定。 */
  starterProjectResumeIds: string[]
  /** 第二天项目教学邮件 ID；用于判断玩家是否已阅读项目外包经营建议。 */
  projectMailId?: string
  /** 项目教学受控甲方事件 ID；用于事件高亮、处理状态判定和避免普通随机事件干扰。 */
  projectClientEventId?: string
}

export interface LaborContract {
  /** 人力外包合同唯一 ID。 */
  id: string
  /** 甲方公司名称，用于合同、邮件和事件展示。 */
  clientName: string
  /** 合同标题，概括甲方和岗位需求。 */
  title: string
  /** 甲方要求的驻场岗位。 */
  requiredRole: SkillRole
  /** 甲方要求的最低真实能力值；员工低于该值会降低满意度。 */
  requiredAbility: number
  /** 甲方每日预算；正常履约是收入，未按期安排则作为违约金扣除。 */
  dailyBudget: number
  /** 合同紧急程度；决定安排员工的期限。 */
  urgency: LaborUrgency
  /** 玩家接受合同的游戏日。 */
  acceptedDay?: number
  /** 安排员工截止日；超过后未安排会每日扣违约金。 */
  deadlineDay: number
  /** 当前安排给甲方的员工 ID。 */
  assignedEmployeeId?: string
  /** 甲方满意度；产出不足会下降，过低会预警或终止。 */
  satisfaction: number
  /** 甲方发出整改预警的游戏日。 */
  warningDay?: number
  /** 合同当前状态。 */
  status: LaborContractStatus
}

export interface ProjectRequirement {
  /** 项目需要的岗位。 */
  role: SkillRole
  /** 该岗位建议最低能力值，用于 UI 展示和后续分配提示。 */
  minAbility: number
  /** 该岗位建议人数。 */
  headcount: number
}

export interface ClientCompanyProfile {
  /** 甲方唯一 ID；影响项目合同关联和后续关系沉淀。 */
  id: number
  /** 甲方公司名称，用于项目标题、邮件和事件展示。 */
  name: string
  /** 客情关系；越高越愿意给宽松周期和小幅溢价，也会降低合作沟通损耗。 */
  relationship: number
  /** 预算等级；主要影响项目金额，高预算甲方更容易给大单。 */
  budgetLevel: number
  /** 需求混乱度；越高越会抬高岗位门槛、增加人力需求，并拖慢项目推进。 */
  requirementChaos: number
  /** 甲方脾气；越高延期罚金越重、周期越紧，也会增加合作推进压力。 */
  temper: number
  /** 信任度；影响甲方项目出现的概率。 */
  trust: number
}

export interface ClientRelation {
  /** 甲方公司 ID；关联 CLIENT_COMPANIES 基础配置。 */
  clientCompanyId: number
  /** 动态信任度；受完成、延期和毁约影响，并决定项目刷新概率与黑名单状态。 */
  trust: number
}

export interface ProjectContract {
  /** 项目合同唯一 ID。 */
  id: string
  /** 甲方公司 ID；由项目生成时写入，用于后续根据同一甲方沉淀关系。 */
  clientCompanyId?: number
  /** 甲方公司名称。 */
  clientName: string
  /** 签约机会生成时的甲方属性快照；trust 会使用当时的动态信任度，影响后续项目刷新概率展示。 */
  clientProfile?: ClientCompanyProfile
  /** 项目标题，用于列表、邮件和事件展示。 */
  title: string
  /** 项目完成后一次性支付的全款。 */
  amount: number
  /** 项目截止日；超过后未完成会进入延期状态。 */
  deadlineDay: number
  /** 延期后每天日结扣除的违约金。 */
  dailyPenalty: number
  /** 已延期天数，用于统计累计延期和邮件文案。 */
  overdueDays: number
  /** 项目当前状态。 */
  status: ProjectStatus
  /** 当前正在推进的阶段。 */
  currentPhase: ProjectPhase
  /** 项目岗位需求，用于玩家分配员工。 */
  requirements: ProjectRequirement[]
  /** 各工作轨道完成百分比；全部达到 100 才算项目完成。 */
  phaseProgress: Record<ProjectWorkTrack, number>
  /**
   * 已经发过“阶段完成”事件的工作轨道；它受 phaseProgress 推进到 100% 影响，
   * 用于避免同一阶段每分钟重复写事件，并影响事件日志里可点击的项目阶段提示。
   */
  notifiedCompletedTracks: ProjectWorkTrack[]
  /** 已分配员工，按岗位保存员工 ID 列表。 */
  assignedEmployees: Partial<Record<SkillRole, string[]>>
  /** 玩家接受项目的游戏日。 */
  acceptedDay?: number
  /** 项目完成的游戏日。 */
  completedDay?: number
  /** 项目完成收款对应的财务流水 ID。 */
  settlementFinanceRecordId?: string
  /** 项目毁约的游戏日；毁约会终止项目推进，并影响人员释放和后续安排取消。 */
  breachedDay?: number
  /** 项目毁约赔偿对应的财务流水 ID；金额为项目金额的 30%，会减少现金并进入财报支出。 */
  breachFinanceRecordId?: string
  /**
   * 上次触发甲方项目随机事件的游戏日。
   * 它受每日事件判定影响，会限制同一项目短期内重复出事，并影响玩家对项目风险的节奏感。
   */
  lastClientEventDay?: number
  /**
   * 项目累计触发过的甲方随机事件数量。
   * 它受事件生成影响，会限制单个项目最多出事次数，并间接影响项目后续经营压力。
   */
  clientEventCount?: number
  /**
   * 需求变更层级；数值越高表示项目范围越失控。
   * 它受需求追加、追加预算等甲方事件影响，并会提高后续项目事件权重和交付压力。
   */
  scopeChangeLevel?: number
}

export interface ProjectClientEventEffect {
  /** 项目截止日增减；负数代表甲方压缩周期，会提高延期风险。 */
  deadlineDayDelta?: number
  /** 项目金额增减；正数通常来自谈判或追加预算，会影响完成后的项目收入。 */
  amountDelta?: number
  /** 每日延期违约金增减；数值越高，逾期后的现金流压力越大。 */
  dailyPenaltyDelta?: number
  /** 各轨道进度增减；负数代表返工，会影响当前阶段和完成时间。 */
  progressDelta?: Partial<Record<ProjectWorkTrack, number>>
  /** 岗位最低能力要求增减；要求越高，低能力员工推进项目的风险越大。 */
  requirementAbilityDelta?: Partial<Record<SkillRole, number>>
  /** 岗位建议人数增减；人数要求越高，玩家越需要调配更多员工。 */
  requirementHeadcountDelta?: Partial<Record<SkillRole, number>>
  /** 需求变更层级增减；会影响后续甲方事件权重和项目风险。 */
  scopeChangeLevelDelta?: number
  /** 甲方动态信任度增减；会影响后续项目市场刷新概率和黑名单风险。 */
  clientTrustDelta?: number
  /** 当前项目成员压力增减；压力会影响员工状态、满意度和劳动风险。 */
  employeePressureDelta?: number
  /** 当前项目成员精力增减；精力会影响工作状态概率和项目推进速度。 */
  employeeEnergyDelta?: number
  /** 当前项目成员满意度增减；满意度会影响离职、仲裁和社保投诉风险。 */
  employeeSatisfactionDelta?: number
}

export interface ProjectClientEventOption {
  /** 选项唯一 ID，用于玩家点击后定位效果。 */
  id: string
  /** 选项按钮文案。 */
  label: string
  /** 选项影响说明，展示给玩家做取舍。 */
  description: string
  /** 选项实际效果；选择后会立即写入项目、员工和甲方关系。 */
  effects: ProjectClientEventEffect
}

export interface PendingProjectClientEvent {
  /** 待处理事件唯一 ID。 */
  id: string
  /** 甲方项目事件类型，用于后续扩展筛选和权重分析。 */
  kind: ProjectClientEventKind
  /** 关联项目 ID；玩家处理事件时会用它找到要修改的项目。 */
  projectId: string
  /** 项目标题快照；即使项目状态变化，事件面板也能展示来源。 */
  projectTitle: string
  /** 甲方名称快照，用于事件面板展示。 */
  clientName: string
  /** 事件发生的游戏日。 */
  triggeredDay: number
  /** 事件标题，适合待办区域短展示。 */
  title: string
  /** 事件描述，说明甲方提出了什么问题。 */
  description: string
  /** 事件严重程度，影响 UI 颜色和提醒优先级。 */
  severity: EventSeverity
  /** 玩家可选择的应对方案。 */
  options: ProjectClientEventOption[]
}

export interface GameEvent {
  /** 事件唯一 ID。 */
  id: string
  /** 事件发生的游戏日。 */
  day: number
  /** 事件发生时的当天分钟。 */
  minute: number
  /** 事件分类，用于筛选和图标展示。 */
  type: GameEventType
  /** 事件标题，适合列表里短展示。 */
  title: string
  /** 事件详细描述。 */
  message: string
  /** 事件严重程度，影响 UI 颜色和排序。 */
  severity: EventSeverity
  /** 关联对象 ID，例如员工、合同、项目或仲裁 ID。 */
  relatedEntityId?: string
}

export interface FinanceRecord {
  /** 财务流水唯一 ID。 */
  id: string
  /** 流水发生的游戏日。 */
  day: number
  /** 流水发生时的当天分钟。 */
  minute: number
  /** 流水类型，用于报表分类。 */
  type: FinanceRecordType
  /** 金额；正数为收入，负数为支出。 */
  amount: number
  /** 流水原因，解释这笔钱为什么发生。 */
  reason: string
  /** 关联对象 ID，例如员工、合同、项目或仲裁 ID。 */
  relatedEntityId?: string
  /** 关联邮件 ID，用于从报表跳转到通知。 */
  mailId?: string
}

export interface FinanceReport {
  /** 财务报表唯一 ID。 */
  id: string
  /** 报表统计的游戏日，通常是昨天。 */
  day: number
  /** 当日所有正向流水合计。 */
  incomeTotal: number
  /** 当日所有负向流水绝对值合计。 */
  expenseTotal: number
  /** 当日净利润，等于收入减支出。 */
  net: number
  /** 纳入报表的收入流水明细。 */
  incomeRecords: FinanceRecord[]
  /** 纳入报表的支出流水明细。 */
  expenseRecords: FinanceRecord[]
  /** 报表生成时所在的游戏日。 */
  generatedAtDay: number
  /** 财务报表通知邮件 ID。 */
  mailId?: string
}

export interface Mail {
  /** 邮件唯一 ID。 */
  id: string
  /** 邮件发送的游戏日。 */
  day: number
  /** 邮件发送时的当天分钟。 */
  minute: number
  /** 邮件类型，用于邮箱分类和模板识别。 */
  type: MailType
  /** 发件方，例如甲方、财务系统、劳动仲裁委员会。 */
  from: string
  /** 邮件主题。 */
  subject: string
  /** 邮件正文，说明发生了什么以及金额影响。 */
  body: string
  /** 是否已读，用于邮箱红点和未读计数。 */
  read: boolean
  /** 关联对象 ID，例如合同、项目、员工或报表 ID。 */
  relatedEntityId?: string
  /** 关联财务流水 ID，用于解释邮件导致的收支。 */
  financeRecordId?: string
}

export interface ArbitrationCase {
  /** 仲裁案件唯一 ID。 */
  id: string
  /** 发起仲裁的员工 ID。 */
  employeeId: string
  /** 发起仲裁的员工显示名，保留历史快照。 */
  employeeName: string
  /** 仲裁立案游戏日。 */
  filedDay: number
  /** 仲裁结果公布游戏日，规则为立案后第 3 天。 */
  resultDay: number
  /** 仲裁原因。 */
  reason: ArbitrationReason
  /** 员工主张金额，胜诉时会从公司现金扣除。 */
  claimedAmount: number
  /** 仲裁当前状态。 */
  status: ArbitrationStatus
  /** 是否已经发送结果邮件，避免重复通知。 */
  mailSent: boolean
}

export interface GameState {
  /** 游戏设置，例如下班时间。 */
  settings: GameSettings
  /** 当前游戏时间和速度。 */
  time: GameTime
  /** 公司当前现金余额。 */
  money: number
  /** 当前在职或历史员工列表。 */
  employees: Employee[]
  /** 当前招聘市场可浏览的简历池。 */
  resumes: Resume[]
  /** 人力外包合同列表，包含市场机会和已签合同。 */
  laborContracts: LaborContract[]
  /** 项目外包合同列表，包含市场机会和已签项目。 */
  projectContracts: ProjectContract[]
  /** 甲方动态关系；trust 会随项目合作结果变化，并影响后续可刷新到哪些甲方项目。 */
  clientRelations: ClientRelation[]
  /** 待玩家处理的甲方项目随机事件；选择后会立即影响项目、员工和甲方关系。 */
  pendingProjectClientEvents: PendingProjectClientEvent[]
  /** 最近发生的游戏事件，用于事件流和提示。 */
  events: GameEvent[]
  /** 所有财务流水，是财务报表的唯一数据来源。 */
  financeRecords: FinanceRecord[]
  /** 每日财务报表列表。 */
  financeReports: FinanceReport[]
  /** 玩家邮箱，保存合同、违约、仲裁和财报通知。 */
  mailbox: Mail[]
  /** 等待出结果或已结案的仲裁案件。 */
  pendingArbitrations: ArbitrationCase[]
  /** 招聘市场状态。 */
  market: MarketState
  /** 新手教学状态；影响引导待办、推荐市场数据、保底 Offer、受控甲方事件和教学完成判定。 */
  tutorial: TutorialState
  /** 随机数种子，用于可复现地生成市场和判定概率。 */
  rngSeed: number
  /** 自增 ID 计数器，保证新实体 ID 不重复。 */
  nextId: number
}
