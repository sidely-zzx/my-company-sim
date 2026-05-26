import type { ProjectRequirement } from '../types';

export interface ProjectTemplate {
  title: string;
  amount: number;
  durationDays: number;
  dailyPenalty: number;
  requirements: ProjectRequirement[];
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
  {
    title: '直播数据大屏',
    amount: 22000,
    durationDays: 7,
    dailyPenalty: 1800,
    requirements: [
      { role: 'product', minAbility: 60, headcount: 1 },
      { role: 'design', minAbility: 55, headcount: 1 },
      { role: 'frontend', minAbility: 65, headcount: 2 },
      { role: 'backend', minAbility: 60, headcount: 1 },
      { role: 'testing', minAbility: 50, headcount: 1 },
    ],
  },

  {
    title: '外卖优惠券系统',
    amount: 12000,
    durationDays: 4,
    dailyPenalty: 900,
    requirements: [
      { role: 'product', minAbility: 40, headcount: 1 },
      { role: 'design', minAbility: 40, headcount: 1 },
      { role: 'frontend', minAbility: 50, headcount: 1 },
      { role: 'backend', minAbility: 50, headcount: 1 },
      { role: 'testing', minAbility: 35, headcount: 1 },
    ],
  },

  {
    title: '企业OA审批流程',
    amount: 35000,
    durationDays: 10,
    dailyPenalty: 2500,
    requirements: [
      { role: 'product', minAbility: 70, headcount: 1 },
      { role: 'design', minAbility: 55, headcount: 1 },
      { role: 'frontend', minAbility: 70, headcount: 2 },
      { role: 'backend', minAbility: 75, headcount: 2 },
      { role: 'testing', minAbility: 60, headcount: 1 },
    ],
  },

  {
    title: '电商秒杀活动页',
    amount: 18000,
    durationDays: 3,
    dailyPenalty: 3000,
    requirements: [
      { role: 'product', minAbility: 55, headcount: 1 },
      { role: 'design', minAbility: 65, headcount: 1 },
      { role: 'frontend', minAbility: 70, headcount: 2 },
      { role: 'backend', minAbility: 60, headcount: 1 },
      { role: 'testing', minAbility: 45, headcount: 1 },
    ],
  },

  {
    title: '物流订单跟踪平台',
    amount: 28000,
    durationDays: 8,
    dailyPenalty: 2000,
    requirements: [
      { role: 'product', minAbility: 65, headcount: 1 },
      { role: 'design', minAbility: 50, headcount: 1 },
      { role: 'frontend', minAbility: 60, headcount: 2 },
      { role: 'backend', minAbility: 70, headcount: 2 },
      { role: 'testing', minAbility: 55, headcount: 1 },
    ],
  },

  {
    title: 'AI客服聊天系统',
    amount: 46000,
    durationDays: 12,
    dailyPenalty: 4000,
    requirements: [
      { role: 'product', minAbility: 80, headcount: 1 },
      { role: 'design', minAbility: 65, headcount: 1 },
      { role: 'frontend', minAbility: 75, headcount: 2 },
      { role: 'backend', minAbility: 80, headcount: 2 },
      { role: 'testing', minAbility: 65, headcount: 2 },
    ],
  },

  {
    title: '学校选课系统',
    amount: 14000,
    durationDays: 6,
    dailyPenalty: 1000,
    requirements: [
      { role: 'product', minAbility: 45, headcount: 1 },
      { role: 'design', minAbility: 40, headcount: 1 },
      { role: 'frontend', minAbility: 50, headcount: 1 },
      { role: 'backend', minAbility: 55, headcount: 1 },
      { role: 'testing', minAbility: 40, headcount: 1 },
    ],
  },

  {
    title: '新能源车后台管理',
    amount: 52000,
    durationDays: 15,
    dailyPenalty: 4500,
    requirements: [
      { role: 'product', minAbility: 85, headcount: 1 },
      { role: 'design', minAbility: 70, headcount: 1 },
      { role: 'frontend', minAbility: 80, headcount: 3 },
      { role: 'backend', minAbility: 85, headcount: 3 },
      { role: 'testing', minAbility: 70, headcount: 2 },
    ],
  },

  {
    title: '短视频审核平台',
    amount: 30000,
    durationDays: 9,
    dailyPenalty: 2600,
    requirements: [
      { role: 'product', minAbility: 65, headcount: 1 },
      { role: 'design', minAbility: 55, headcount: 1 },
      { role: 'frontend', minAbility: 68, headcount: 2 },
      { role: 'backend', minAbility: 72, headcount: 2 },
      { role: 'testing', minAbility: 58, headcount: 1 },
    ],
  },

  {
    title: '医院预约挂号系统',
    amount: 26000,
    durationDays: 8,
    dailyPenalty: 2100,
    requirements: [
      { role: 'product', minAbility: 60, headcount: 1 },
      { role: 'design', minAbility: 50, headcount: 1 },
      { role: 'frontend', minAbility: 62, headcount: 2 },
      { role: 'backend', minAbility: 70, headcount: 2 },
      { role: 'testing', minAbility: 55, headcount: 1 },
    ],
  },

  {
    title: '社交APP原型开发',
    amount: 9000,
    durationDays: 3,
    dailyPenalty: 700,
    requirements: [
      { role: 'product', minAbility: 35, headcount: 1 },
      { role: 'design', minAbility: 55, headcount: 1 },
      { role: 'frontend', minAbility: 45, headcount: 1 },
      { role: 'backend', minAbility: 40, headcount: 1 },
      { role: 'testing', minAbility: 30, headcount: 1 },
    ],
  },

  {
    title: '金融风控管理平台',
    amount: 68000,
    durationDays: 18,
    dailyPenalty: 6000,
    requirements: [
      { role: 'product', minAbility: 90, headcount: 1 },
      { role: 'design', minAbility: 70, headcount: 1 },
      { role: 'frontend', minAbility: 85, headcount: 3 },
      { role: 'backend', minAbility: 90, headcount: 4 },
      { role: 'testing', minAbility: 75, headcount: 2 },
    ],
  },
];
