import {
  DAILY_RESUME_REFRESH_LIMIT,
  RESUMES_PER_REFRESH,
  VIP_DAILY_RESUME_REFRESH_LIMIT,
} from '../constants';
import { createInitialEmployeeBehaviorProfile } from '../entities/EmployeeEntity';
import { CANDIDATE_INTROS, FIRST_NAME, MIDDLE_NAME, LAST_NAME } from '../data/candidateTemplates';
import { clamp, cloneState, nextRandom, randomChoice, randomInt, randomChoiceName } from '../seed';
import type {
  GameState,
  Resume,
  ResumeSkillLevel,
  SchoolType,
  SkillClaim,
  SkillRole,
} from '../types';
import { addEvent, createId } from './eventSystem';
import { companyReputationOfferMultiplier } from './reputationSystem';
import { clampTutorialOffer, isStarterResume } from './tutorialSystem';
import { levelFromAbility } from '../../utils';

const schoolTypes: SchoolType[] = ['normal', '211', '985', 'qs100'];
const roles: SkillRole[] = ['product', 'design', 'frontend', 'backend', 'testing'];
const levels: ResumeSkillLevel[] = ['junior', 'mid', 'senior'];

function averageAbility(abilities: Partial<Record<SkillRole, number>>): number {
  const values = Object.values(abilities);
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function calculateOfferAcceptanceChance(
  expectedSalaryPerDay: number,
  salaryPerDay: number,
  socialInsuranceRatio: number,
  companyReputation: number,
): number {
  const salaryFit = salaryPerDay / Math.max(expectedSalaryPerDay, 1);
  const baseChance = clamp(0.2 + (salaryFit - 0.8) * 0.8 + socialInsuranceRatio * 0.25, 0.01, 0.95);
  if (companyReputation <= 0) {
    // 声誉归零时，候选人默认极度不信任公司；薪资和社保仍有影响，但最终接受率不会超过 10%。
    return clamp((baseChance / 0.95) * 0.1, 0.01, 0.1);
  }
  // Offer 接受率由薪资、社保和公司声誉共同决定；声誉越低，候选人越担心公司口碑，从而降低接受概率。
  return clamp(baseChance * companyReputationOfferMultiplier(companyReputation), 0.01, 0.95);
}


function generateResume(state: GameState): Resume {
  const name = randomChoiceName(state.rngSeed, FIRST_NAME, MIDDLE_NAME, LAST_NAME);
  state.rngSeed = name.seed;
  const school = randomChoice(state.rngSeed, schoolTypes);
  state.rngSeed = school.seed;
  const schoolFactor = school.value === 'normal' ? 1 : school.value === '211' ? 2 : school.value === '985' ? 3 : 2;
  const role = randomChoice(state.rngSeed, roles);
  state.rngSeed = role.seed;
  const workYears = randomInt(state.rngSeed, 0, 8);
  state.rngSeed = workYears.seed;
  const baseAbility = randomInt(state.rngSeed, Math.max(workYears.value, 5) * 10 + schoolFactor * 5, Math.min(100, workYears.value * 15 + schoolFactor * 10));
  state.rngSeed = baseAbility.seed;
  const intro = randomChoice(state.rngSeed, CANDIDATE_INTROS);
  state.rngSeed = intro.seed;
  const extraSkillRoll = nextRandom(state.rngSeed);
  state.rngSeed = extraSkillRoll.seed;

  const realSkillAbilities: Partial<Record<SkillRole, number>> = {
    [role.value]: clamp(baseAbility.value, 20, 100),
  };
  const resumeSkills: SkillClaim[] = [
    {
      role: role.value,
      level: levelFromAbility(realSkillAbilities[role.value] ?? baseAbility.value),
    },
  ];

  if (extraSkillRoll.value > 0.78) {
    const extraRole = randomChoice(
      state.rngSeed,
      roles.filter((item) => item !== role.value),
    );
    state.rngSeed = extraRole.seed;
    const extraAbility = randomInt(state.rngSeed, 10, baseAbility.value);
    state.rngSeed = extraAbility.seed;
    realSkillAbilities[extraRole.value] = extraAbility.value;
    resumeSkills.push({
      role: extraRole.value,
      level: levels[Math.min(2, Math.floor(extraAbility.value / 34))],
    });
  }

  const expectedSalaryPerDay = randomInt(
    state.rngSeed,
    Math.round(
      120 + workYears.value * 35 + baseAbility.value * 1.5 + schoolFactor * 50,
    ),
    120 + workYears.value * 40 + baseAbility.value * 1.8 + schoolFactor * 80,
  );
  state.rngSeed = expectedSalaryPerDay.seed;
  const expectedSalaryFactor = randomInt(state.rngSeed, 1, resumeSkills.length === 1 ? 1.3 : 2);
  state.rngSeed = expectedSalaryFactor.seed;
  const satisfaction = randomInt(state.rngSeed, 65, 90);
  state.rngSeed = satisfaction.seed;
  const slackingTendency = randomInt(state.rngSeed, 5, 35);
  state.rngSeed = slackingTendency.seed;

  return {
    id: createId(state, 'resume'),
    name: name.value,
    school: school.value,
    workYears: workYears.value,
    resumeSkills,
    expectedSalaryPerDay: expectedSalaryPerDay.value * expectedSalaryFactor.value,
    introduction: intro.value,
    realSkillAbilities,
    satisfaction: satisfaction.value,
    slackingTendency: slackingTendency.value / 100,
  };
}

export function refreshResumes(state: GameState, countUsage = true): GameState {
  const draft = cloneState(state);
  const limit = draft.market.vip ? VIP_DAILY_RESUME_REFRESH_LIMIT : DAILY_RESUME_REFRESH_LIMIT;
  draft.market.resumeRefreshLimit = limit;

  if (countUsage && draft.market.resumeRefreshesUsed >= limit) {
    addEvent(draft, {
      type: 'recruiting',
      title: '刷新简历失败',
      message: '今天的简历刷新次数已经用完。',
      severity: 'warning',
    });
    return draft;
  }

  if (countUsage) {
    draft.market.resumeRefreshesUsed += 1;
  }
  draft.resumes = Array.from({ length: RESUMES_PER_REFRESH }, () => generateResume(draft));
  if (draft.tutorial.enabled && !draft.tutorial.completed) {
    const hiredSourceResumeIds = new Set(
      draft.employees
        .filter((employee) => employee.status !== 'fired' && employee.sourceResumeId)
        .map((employee) => employee.sourceResumeId as string),
    );
    const preservedResumeIds = new Set<string>([
      ...(draft.employees.length === 0 ? draft.tutorial.starterResumeIds : []),
      ...draft.tutorial.starterProjectResumeIds.filter((resumeId) => !hiredSourceResumeIds.has(resumeId)),
    ]);
    const starterResumes = state.resumes.filter((resume) => preservedResumeIds.has(resume.id));
    draft.resumes = [
      ...starterResumes,
      ...draft.resumes.slice(0, Math.max(0, RESUMES_PER_REFRESH - starterResumes.length)),
    ];
  }
  addEvent(draft, {
    type: 'recruiting',
    title: '简历已刷新',
    message: `招聘市场更新了 ${RESUMES_PER_REFRESH} 份候选人简历。`,
    severity: 'info',
  });
  return draft;
}

export function sendOffer(
  state: GameState,
  resumeId: string,
  salaryPerDay: number,
  socialInsuranceRatio: number,
): GameState {
  const draft = cloneState(state);
  const resume = draft.resumes.find((item) => item.id === resumeId);
  if (!resume) {
    addEvent(draft, {
      type: 'recruiting',
      title: 'Offer 发送失败',
      message: '没有找到这份简历。',
      severity: 'warning',
    });
    return draft;
  }
  if (resume.offerRejected) {
    addEvent(draft, {
      type: 'recruiting',
      title: 'Offer 发送失败',
      message: `${resume.name} 已经拒绝过 offer。`,
      severity: 'warning',
      relatedEntityId: resume.id,
    });
    return draft;
  }

  const starterResumeOffer = draft.tutorial.enabled && !draft.tutorial.completed && isStarterResume(draft, resume.id);
  const offer = starterResumeOffer
    ? clampTutorialOffer(resume, salaryPerDay, socialInsuranceRatio)
    : { salaryPerDay, socialInsuranceRatio };
  const salaryFit = offer.salaryPerDay / resume.expectedSalaryPerDay;
  const chance = starterResumeOffer
    ? 1
    : calculateOfferAcceptanceChance(
      resume.expectedSalaryPerDay,
      offer.salaryPerDay,
      offer.socialInsuranceRatio,
      draft.companyReputation,
    );
  const roll = starterResumeOffer ? { value: 0, seed: draft.rngSeed } : nextRandom(draft.rngSeed);
  draft.rngSeed = roll.seed;
  if (roll.value > chance) {
    // 候选人拒绝后保留在简历池展示结果，但标记为不可再次发送 offer。
    resume.offerRejected = true;
    addEvent(draft, {
      type: 'recruiting',
      title: 'Offer 被拒',
      message: `${resume.name} 拒绝了日薪 ${offer.salaryPerDay} 的 offer。`,
      severity: 'warning',
      relatedEntityId: resume.id,
    });
    return draft;
  }

  const employeeId = createId(draft, 'employee');
  const behaviorProfile = createInitialEmployeeBehaviorProfile(draft.rngSeed, {
    salaryFit,
    slackingTendency: resume.slackingTendency,
    averageAbility: averageAbility(resume.realSkillAbilities),
  });
  draft.rngSeed = behaviorProfile.seed;
  draft.employees.push({
    id: employeeId,
    name: resume.name,
    school: resume.school,
    resumeSkills: resume.resumeSkills,
    sourceResumeId: resume.id,
    realSkillAbilities: resume.realSkillAbilities,
    salaryPerDay: offer.salaryPerDay,
    socialInsuranceRatio: clamp(offer.socialInsuranceRatio, 0, 1),
    satisfaction: resume.satisfaction,
    slackingTendency: resume.slackingTendency,
    behaviorSeed: behaviorProfile.profile.behaviorSeed,
    energy: behaviorProfile.profile.energy,
    pressure: behaviorProfile.profile.pressure,
    discipline: behaviorProfile.profile.discipline,
    workDays: 0,
    highestSalaryPerDay: offer.salaryPerDay,
    highestSocialInsuranceRatio: clamp(offer.socialInsuranceRatio, 0, 1),
    unpaidSocialInsuranceGap: 0,
    status: 'idle',
  });
  draft.resumes = draft.resumes.filter((item) => item.id !== resume.id);
  addEvent(draft, {
    type: 'recruiting',
    title: '新员工入职',
    message: `${resume.name} 接受 offer，日薪 ${offer.salaryPerDay}。`,
    severity: 'success',
    relatedEntityId: employeeId,
  });
  return draft;
}

export function resetDailyRecruiting(state: GameState): GameState {
  const draft = cloneState(state);
  draft.market.resumeRefreshesUsed = 0;
  draft.market.resumeRefreshLimit = draft.market.vip
    ? VIP_DAILY_RESUME_REFRESH_LIMIT
    : DAILY_RESUME_REFRESH_LIMIT;
  return draft;
}
