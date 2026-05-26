import {
  DAILY_RESUME_REFRESH_LIMIT,
  RESUMES_PER_REFRESH,
  VIP_DAILY_RESUME_REFRESH_LIMIT,
} from '../constants'
import { CANDIDATE_INTROS, FIRST_NAME, MIDDLE_NAME, LAST_NAME } from '../data/candidateTemplates'
import { clamp, cloneState, nextRandom, randomChoice, randomInt, randomChoiceName } from '../seed'
import type {
  GameState,
  Resume,
  ResumeSkillLevel,
  SchoolType,
  SkillClaim,
  SkillRole,
} from '../types'
import { addEvent, createId } from './eventSystem'

const schoolTypes: SchoolType[] = ['normal', '211', '985', 'qs100']
const roles: SkillRole[] = ['product', 'design', 'frontend', 'backend', 'testing']
const levels: ResumeSkillLevel[] = ['junior', 'mid', 'senior']

function levelFromAbility(ability: number): ResumeSkillLevel {
  if (ability >= 75) {
    return 'senior'
  }
  if (ability >= 50) {
    return 'mid'
  }
  return 'junior'
}

function generateResume(state: GameState): Resume {
  const name = randomChoiceName(state.rngSeed, FIRST_NAME, MIDDLE_NAME, LAST_NAME)
  state.rngSeed = name.seed
  const school = randomChoice(state.rngSeed, schoolTypes)
  state.rngSeed = school.seed
  const role = randomChoice(state.rngSeed, roles)
  state.rngSeed = role.seed
  const workYears = randomInt(state.rngSeed, 0, 8)
  state.rngSeed = workYears.seed
  const baseAbility = randomInt(state.rngSeed, 30, 95)
  state.rngSeed = baseAbility.seed
  const intro = randomChoice(state.rngSeed, CANDIDATE_INTROS)
  state.rngSeed = intro.seed
  const extraSkillRoll = nextRandom(state.rngSeed)
  state.rngSeed = extraSkillRoll.seed

  const realSkillAbilities: Partial<Record<SkillRole, number>> = {
    [role.value]: clamp(baseAbility.value + workYears.value * 2, 20, 100),
  }
  const resumeSkills: SkillClaim[] = [
    {
      role: role.value,
      level: levelFromAbility(realSkillAbilities[role.value] ?? baseAbility.value),
    },
  ]

  if (extraSkillRoll.value > 0.78) {
    const extraRole = randomChoice(
      state.rngSeed,
      roles.filter((item) => item !== role.value),
    )
    state.rngSeed = extraRole.seed
    const extraAbility = randomInt(state.rngSeed, 25, 70)
    state.rngSeed = extraAbility.seed
    realSkillAbilities[extraRole.value] = extraAbility.value
    resumeSkills.push({
      role: extraRole.value,
      level: levels[Math.min(2, Math.floor(extraAbility.value / 34))],
    })
  }

  const expectedSalaryPerDay = Math.round(
    120 + workYears.value * 35 + (baseAbility.value > 75 ? 120 : baseAbility.value > 50 ? 60 : 0),
  )
  const satisfaction = randomInt(state.rngSeed, 65, 90)
  state.rngSeed = satisfaction.seed
  const arbitrationTendency = randomInt(state.rngSeed, 10, 75)
  state.rngSeed = arbitrationTendency.seed
  const slackingTendency = randomInt(state.rngSeed, 5, 35)
  state.rngSeed = slackingTendency.seed

  return {
    id: createId(state, 'resume'),
    name: name.value,
    school: school.value,
    workYears: workYears.value,
    resumeSkills,
    expectedSalaryPerDay,
    introduction: intro.value,
    realSkillAbilities,
    satisfaction: satisfaction.value,
    arbitrationTendency: arbitrationTendency.value,
    slackingTendency: slackingTendency.value / 100,
  }
}

export function refreshResumes(state: GameState, countUsage = true): GameState {
  const draft = cloneState(state)
  const limit = draft.market.vip ? VIP_DAILY_RESUME_REFRESH_LIMIT : DAILY_RESUME_REFRESH_LIMIT
  draft.market.resumeRefreshLimit = limit

  if (countUsage && draft.market.resumeRefreshesUsed >= limit) {
    addEvent(draft, {
      type: 'recruiting',
      title: '刷新简历失败',
      message: '今天的简历刷新次数已经用完。',
      severity: 'warning',
    })
    return draft
  }

  if (countUsage) {
    draft.market.resumeRefreshesUsed += 1
  }
  draft.resumes = Array.from({ length: RESUMES_PER_REFRESH }, () => generateResume(draft))
  addEvent(draft, {
    type: 'recruiting',
    title: '简历已刷新',
    message: `招聘市场更新了 ${RESUMES_PER_REFRESH} 份候选人简历。`,
    severity: 'info',
  })
  return draft
}

export function sendOffer(
  state: GameState,
  resumeId: string,
  salaryPerDay: number,
  socialInsuranceRatio: number,
): GameState {
  const draft = cloneState(state)
  const resume = draft.resumes.find((item) => item.id === resumeId)
  if (!resume) {
    addEvent(draft, {
      type: 'recruiting',
      title: 'Offer 发送失败',
      message: '没有找到这份简历。',
      severity: 'warning',
    })
    return draft
  }

  const salaryFit = salaryPerDay / resume.expectedSalaryPerDay
  const chance = clamp(0.2 + (salaryFit - 0.8) * 0.8 + socialInsuranceRatio * 0.25, 0.05, 0.95)
  const roll = nextRandom(draft.rngSeed)
  draft.rngSeed = roll.seed
  if (roll.value > chance) {
    addEvent(draft, {
      type: 'recruiting',
      title: 'Offer 被拒',
      message: `${resume.name} 拒绝了日薪 ${salaryPerDay} 的 offer。`,
      severity: 'warning',
      relatedEntityId: resume.id,
    })
    return draft
  }

  const employeeId = createId(draft, 'employee')
  const behaviorSeed = nextRandom(draft.rngSeed)
  draft.rngSeed = behaviorSeed.seed
  draft.employees.push({
    id: employeeId,
    name: resume.name,
    school: resume.school,
    resumeSkills: resume.resumeSkills,
    realSkillAbilities: resume.realSkillAbilities,
    salaryPerDay,
    socialInsuranceRatio: clamp(socialInsuranceRatio, 0, 1),
    satisfaction: resume.satisfaction,
    arbitrationTendency: resume.arbitrationTendency,
    slackingTendency: resume.slackingTendency,
    behaviorSeed: behaviorSeed.seed,
    workYears: resume.workYears,
    status: 'idle',
  })
  draft.resumes = draft.resumes.filter((item) => item.id !== resume.id)
  addEvent(draft, {
    type: 'recruiting',
    title: '新员工入职',
    message: `${resume.name} 接受 offer，日薪 ${salaryPerDay}。`,
    severity: 'success',
    relatedEntityId: employeeId,
  })
  return draft
}

export function resetDailyRecruiting(state: GameState): GameState {
  const draft = cloneState(state)
  draft.market.resumeRefreshesUsed = 0
  draft.market.resumeRefreshLimit = draft.market.vip
    ? VIP_DAILY_RESUME_REFRESH_LIMIT
    : DAILY_RESUME_REFRESH_LIMIT
  return draft
}
