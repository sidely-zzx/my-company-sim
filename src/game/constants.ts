import type { ProjectPhase, ProjectWorkTrack, SkillRole, WorkHour } from './types'

export const STARTING_MONEY = 5000
export const START_DAY = 1
export const WORK_START_HOUR = 9
export const WORK_START_MINUTE = WORK_START_HOUR * 60
export const DEFAULT_OFF_WORK_HOUR: WorkHour = 18
export const MS_PER_GAME_MINUTE = 2000
export const BASE_OUTPUT_PER_MINUTE = 1
export const DAILY_RESUME_REFRESH_LIMIT = 3
export const VIP_DAILY_RESUME_REFRESH_LIMIT = 10
export const RESUMES_PER_REFRESH = 5
export const MAX_RECENT_EVENTS = 200
export const SOCIAL_INSURANCE_COMPANY_RATE = 0.38
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
