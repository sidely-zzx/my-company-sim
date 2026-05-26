import type { ProjectContract } from '../../game/types'
import { phaseLabels, progressTone, projectProgress, projectRisk, projectStatusLabels } from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import {
  cn,
  emptyState,
  progressFill,
  progressToneClass,
  progressTrack,
  riskToneClass,
  surface,
} from '../../styles/tw'
import { ProjectDetailDialog } from './ProjectDetailDialog'

const visibleProjectStatuses = ['accepted', 'active', 'overdue'] as const
const visibleProjectStatusRank = {
  overdue: 0,
  active: 1,
  accepted: 2,
} as const

function isVisibleProject(project: ProjectContract): boolean {
  // 左侧展示玩家已经接下的项目：accepted 会进入项目详情等待分配员工，active/overdue 会继续影响项目进度和延期罚金。
  return visibleProjectStatuses.includes(project.status as (typeof visibleProjectStatuses)[number])
}

function runningProjectSort(left: ProjectContract, right: ProjectContract): number {
  // 排序受项目状态、截止日和总进度影响；它只影响左侧看板顺序，不改变项目进度、现金流或人员分配。
  const statusDiff =
    visibleProjectStatusRank[left.status as keyof typeof visibleProjectStatusRank] -
    visibleProjectStatusRank[right.status as keyof typeof visibleProjectStatusRank]
  if (statusDiff !== 0) {
    return statusDiff
  }

  const deadlineDiff = left.deadlineDay - right.deadlineDay
  if (deadlineDiff !== 0) {
    return deadlineDiff
  }

  return projectProgress(left) - projectProgress(right)
}

export function RunningProjectList() {
  const day = useGameStore((state) => state.time.day)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const runningProjects = projectContracts.filter(isVisibleProject).sort(runningProjectSort)

  return (
    <section className={cn(surface, 'min-w-0 p-3.5')}>
      <h2 className="mb-3 mt-0 text-[17px] text-[#efe2c8]">已接项目</h2>
      {runningProjects.length === 0 ? (
        <p className={emptyState}>暂无已签约或正在推进的项目。</p>
      ) : (
        <div className="grid max-h-[320px] gap-2.5 overflow-auto pr-1">
          {runningProjects.map((project) => {
            // 总进度来自五条项目轨道的平均值；它会被员工岗位能力和当前分配持续影响。
            const progress = projectProgress(project)
            // 风险展示受当前游戏日、项目截止日和延期状态影响，用于提醒玩家优先处理高风险项目。
            const risk = projectRisk(project, day)

            return (
              <ProjectDetailDialog
                key={project.id}
                project={project}
                trigger={
                  <button
                    type="button"
                    className="grid w-full cursor-pointer gap-2 rounded-md border border-[#303834] bg-[rgba(12,15,15,0.5)] p-2.5 text-left hover:border-[#b59d65] hover:bg-[#242a28] focus-visible:border-[#b59d65] focus-visible:outline-none"
                    aria-label={`查看${project.title}项目详情`}
                  >
                    <span className="flex justify-between gap-2">
                      <strong className="truncate text-[13px] text-[#e7dcc3]">{project.title}</strong>
                      <span className={cn('shrink-0 text-xs font-extrabold', riskToneClass[risk.tone])}>
                        {risk.label}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 text-xs font-extrabold text-[#aeb5ac]">
                      <span>
                        {projectStatusLabels[project.status]} · {phaseLabels[project.currentPhase]}
                      </span>
                      <span>{progress}%</span>
                    </span>
                    <span className={progressTrack}>
                      <i
                        className={cn(progressFill, progressToneClass[progressTone(progress)])}
                        style={{ width: `${progress}%` }}
                      />
                    </span>
                    <span className="text-xs font-extrabold text-[#aeb5ac]">点击查看详情</span>
                  </button>
                }
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
