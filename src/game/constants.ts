import type { ProjectPhase, ProjectWorkTrack, SkillRole, WorkHour } from './types'

export const STARTING_MONEY = 5000
export const START_DAY = 1
export const WORK_START_HOUR = 9
export const WORK_START_MINUTE = WORK_START_HOUR * 60
export const DEFAULT_OFF_WORK_HOUR: WorkHour = 18
export const MS_PER_GAME_MINUTE = 2000
export const BASE_OUTPUT_PER_MINUTE = 1
/** 人力外包甲方认可的满日有效工时；能力值会乘以 7 小时形成全天要求。 */
export const LABOR_FULL_DAY_REQUIRED_MINUTES = 7 * 60
/** 中途上岗的人力外包按 17:00 前剩余时间折算当天要求。 */
export const LABOR_FIRST_DAY_REQUIREMENT_CUTOFF_MINUTE = 17 * 60
/** 中途上岗折算系数；8 小时窗口中只按 7 小时有效产出要求。 */
export const LABOR_PARTIAL_DAY_REQUIREMENT_RATIO = 7 / 8
/** 人力外包当日产出不达标时扣除对应甲方的动态 trust。 */
export const LABOR_OUTPUT_MISS_TRUST_DELTA = -5
export const DAILY_RESUME_REFRESH_LIMIT = 3
export const VIP_DAILY_RESUME_REFRESH_LIMIT = 10
export const RESUMES_PER_REFRESH = 5
export const MAX_RECENT_EVENTS = 200
export const SOCIAL_INSURANCE_COMPANY_RATE = 0.38
/** 项目主动毁约赔偿比例；受项目金额影响，会直接扣现金并计入财报支出。 */
export const PROJECT_BREACH_PENALTY_RATE = 0.3
export const DEFAULT_SEED = 20260523
export const PROJECT_PHASES: ProjectPhase[] = ['product', 'design', 'development', 'testing']
export const PROJECT_WORK_TRACKS: ProjectWorkTrack[] = [
  'product',
  'design',
  'frontend',
  'backend',
  'testing',
]
export const SKILL_ROLES: SkillRole[] = ['product', 'design', 'frontend', 'backend', 'testing']
