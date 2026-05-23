import type { ProjectRequirement } from '../types'

export interface ProjectTemplate {
  title: string
  amount: number
  durationDays: number
  dailyPenalty: number
  requirements: ProjectRequirement[]
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    title: '会员运营后台',
    amount: 16000,
    durationDays: 5,
    dailyPenalty: 1200,
    requirements: [
      { role: 'product', minAbility: 50, headcount: 1 },
      { role: 'design', minAbility: 45, headcount: 1 },
      { role: 'frontend', minAbility: 55, headcount: 1 },
      { role: 'backend', minAbility: 55, headcount: 1 },
      { role: 'testing', minAbility: 45, headcount: 1 },
    ],
  },
  {
    title: '增长活动 H5',
    amount: 9000,
    durationDays: 3,
    dailyPenalty: 900,
    requirements: [
      { role: 'product', minAbility: 45, headcount: 1 },
      { role: 'design', minAbility: 50, headcount: 1 },
      { role: 'frontend', minAbility: 60, headcount: 1 },
      { role: 'backend', minAbility: 35, headcount: 1 },
      { role: 'testing', minAbility: 40, headcount: 1 },
    ],
  },
  {
    title: '数据看板重构',
    amount: 22000,
    durationDays: 7,
    dailyPenalty: 1600,
    requirements: [
      { role: 'product', minAbility: 55, headcount: 1 },
      { role: 'design', minAbility: 45, headcount: 1 },
      { role: 'frontend', minAbility: 65, headcount: 1 },
      { role: 'backend', minAbility: 65, headcount: 1 },
      { role: 'testing', minAbility: 50, headcount: 1 },
    ],
  },
]
