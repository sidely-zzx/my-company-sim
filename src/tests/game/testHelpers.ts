import { createInitialGameState } from '../../game/initialState'
import type { Employee, GameState, ProjectContract } from '../../game/types'

export function createTestState(seed = 1): GameState {
  return createInitialGameState(seed)
}

export function createTestEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'employee-test',
    name: '测试员工',
    school: '985',
    resumeSkills: [{ role: 'product', level: 'senior' }],
    realSkillAbilities: {
      product: 80,
      design: 80,
      frontend: 80,
      backend: 80,
      testing: 80,
    },
    salaryPerDay: 300,
    socialInsuranceRatio: 1,
    satisfaction: 80,
    slackingTendency: 0,
    behaviorSeed: 1,
    energy: 80,
    pressure: 30,
    discipline: 80,
    workDays: 0,
    highestSalaryPerDay: 300,
    highestSocialInsuranceRatio: 1,
    unpaidSocialInsuranceGap: 0,
    status: 'idle',
    ...overrides,
  }
}

export function createTestProject(overrides: Partial<ProjectContract> = {}): ProjectContract {
  return {
    id: 'project-test',
    clientName: '测试甲方',
    title: '测试项目',
    amount: 10000,
    deadlineDay: 2,
    dailyPenalty: 1000,
    overdueDays: 0,
    status: 'active',
    currentPhase: 'product',
    requirements: [
      { role: 'product', minAbility: 50, headcount: 1 },
      { role: 'design', minAbility: 50, headcount: 1 },
      { role: 'frontend', minAbility: 50, headcount: 1 },
      { role: 'backend', minAbility: 50, headcount: 1 },
      { role: 'testing', minAbility: 50, headcount: 1 },
    ],
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
    ...overrides,
  }
}
