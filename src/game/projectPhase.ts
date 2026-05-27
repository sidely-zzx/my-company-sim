import type { ProjectContract, ProjectPhase, ProjectWorkTrack, SkillRole } from './types'

export function projectTracksForPhase(phase: ProjectPhase): ProjectWorkTrack[] {
  if (phase === 'development') {
    return ['frontend', 'backend']
  }
  return [phase]
}

export function resolveProjectPhase(project: Pick<ProjectContract, 'phaseProgress'>): ProjectPhase {
  // 项目阶段由各轨道进度推导：它决定哪些岗位当前能产出，并影响员工状态展示与项目推进顺序。
  if ((project.phaseProgress.product ?? 0) < 100) {
    return 'product'
  }
  if ((project.phaseProgress.design ?? 0) < 100) {
    return 'design'
  }
  if ((project.phaseProgress.frontend ?? 0) < 100 || (project.phaseProgress.backend ?? 0) < 100) {
    return 'development'
  }
  return 'testing'
}

export function isProjectRoleActive(project: Pick<ProjectContract, 'phaseProgress'>, role?: SkillRole): boolean {
  if (!role) {
    return false
  }
  return projectTracksForPhase(resolveProjectPhase(project)).includes(role)
}
