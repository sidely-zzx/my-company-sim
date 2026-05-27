import type { GameEvent, ProjectContract } from '../../game/types'
import { eventIcon, formatTime } from '../../game/ui'
import { cn, eventBorderToneClass, eventTokenToneClass } from '../../styles/tw'
import { ProjectDetailDialog } from './ProjectDetailDialog'

interface EventLogItemProps {
  event: GameEvent
  projectContracts: ProjectContract[]
  compact?: boolean
}

function findRelatedProject(event: GameEvent, projectContracts: ProjectContract[]): ProjectContract | undefined {
  if (event.type !== 'project' || !event.relatedEntityId) {
    return undefined
  }
  return projectContracts.find((project) => project.id === event.relatedEntityId)
}

export function EventLogItem({ event, projectContracts, compact = false }: EventLogItemProps) {
  // 项目事件通过 relatedEntityId 反查项目；只影响日志点击行为，不改变事件或项目数据。
  const project = findRelatedProject(event, projectContracts)
  const content = (
    <>
      <span className="text-xs text-[#9aa29a]">
        {compact ? formatTime(event.minute) : `第 ${event.day} 天 ${formatTime(event.minute)}`}
      </span>
      <strong className={cn('mt-0.5 block text-[#eadfc7]', compact ? 'text-[13px]' : 'text-sm')}>
        {event.title}
      </strong>
      <p className={cn('mt-1 text-[#aeb5ac]', compact ? 'text-xs' : 'text-sm')}>{event.message}</p>
      {project && <span className="mt-1 block text-xs font-extrabold text-[#d5c4a1]">点击查看项目详情</span>}
    </>
  )

  if (compact) {
    if (project) {
      return (
        <li className="border-b border-[#303834] py-[9px]">
          <ProjectDetailDialog
            project={project}
            trigger={
              <button
                type="button"
                className="grid w-full cursor-pointer grid-cols-[28px_minmax(0,1fr)] gap-2.5 text-left hover:text-[#efe2c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b59d65]"
                aria-label={`查看${project.title}项目详情`}
              >
                <span className={cn('grid h-6 w-6 place-items-center rounded-md text-xs font-black text-[#111514]', eventTokenToneClass[event.severity])}>
                  {eventIcon(event.type)}
                </span>
                <span>{content}</span>
              </button>
            }
          />
        </li>
      )
    }

    return (
      <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 border-b border-[#303834] py-[9px]">
        <span className={cn('grid h-6 w-6 place-items-center rounded-md text-xs font-black text-[#111514]', eventTokenToneClass[event.severity])}>
          {eventIcon(event.type)}
        </span>
        <div>{content}</div>
      </li>
    )
  }

  return (
    <li className={cn('rounded-md border-l-4 bg-[rgba(12,15,15,0.5)] px-3 py-2.5', eventBorderToneClass[event.severity])}>
      {project ? (
        <ProjectDetailDialog
          project={project}
          trigger={
            <button
              type="button"
              className="grid w-full cursor-pointer text-left hover:text-[#efe2c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b59d65]"
              aria-label={`查看${project.title}项目详情`}
            >
              {content}
            </button>
          }
        />
      ) : (
        content
      )}
    </li>
  )
}
