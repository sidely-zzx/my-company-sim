import type { ResumeSkillLevel } from '../game/types';

export function money(value: number): string {
  return `￥${value.toLocaleString('zh-CN')}`;
}

export function levelFromAbility(ability: number): ResumeSkillLevel {
  if (ability >= 75) {
    return 'senior';
  }
  if (ability >= 50) {
    return 'mid';
  }
  return 'junior';
}
