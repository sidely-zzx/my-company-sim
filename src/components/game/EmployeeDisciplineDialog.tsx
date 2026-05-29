import {
  CircleDollarSign,
  EyeOff,
  FileWarning,
  MessageCircleWarning,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'

import {
  employeeDisciplineActionLabels,
  employeeStatusLabels,
  projectStatusLabels,
  roleLabels,
  levelLabels,
} from '../../game/ui'
import { isCurrentTutorialNode } from '../../game/systems/tutorialSystem'
import type { Employee, EmployeeDisciplineAction, EmployeeStatus } from '../../game/types'
import { useGameStore } from '../../store/gameStore'
import { button, cn, tutorialTarget } from '../../styles/tw'
import { money } from '../../utils'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Slider } from '../ui/slider'

interface EmployeeDisciplineDialogProps {
  employee?: Employee
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenDetail?: (employeeId: string) => void
}

const actionIcons: Record<EmployeeDisciplineAction, LucideIcon> = {
  ignore: EyeOff,
  verbal_warn: MessageCircleWarning,
  formal_warn: FileWarning,
  fine: CircleDollarSign,
}

function statusToneClass(status: EmployeeStatus): string {
  if (status === 'focused_work' || status === 'working') {
    return 'border-[#4f6f3f] bg-[#1d271b] text-[#a9e27b]'
  }
  if (status === 'slacking' || status === 'job_browsing' || status === 'gaming') {
    return 'border-[#8a5a29] bg-[#2d2118] text-[#ffc078]'
  }
  if (status === 'smoking' || status === 'drinking_water' || status === 'toilet') {
    return 'border-[#3c6479] bg-[#18262d] text-[#9bddff]'
  }
  return 'border-[#303834] bg-[#171c1b] text-[#d8cfbb]'
}

function availableActions(status: EmployeeStatus): EmployeeDisciplineAction[] {
  if (status === 'slacking' || status === 'job_browsing' || status === 'gaming' || status === 'smoking') {
    return ['ignore', 'verbal_warn', 'formal_warn', 'fine']
  }
  if (status === 'drinking_water' || status === 'toilet') {
    return ['ignore', 'verbal_warn']
  }
  return ['ignore']
}

function actionButtonClass(action: EmployeeDisciplineAction): string {
  if (action === 'formal_warn') {
    return 'border-[#8a5a29] bg-[#2d2118] text-[#ffc078] hover:bg-[#3a2a1b]'
  }
  return 'border-[#303834] bg-[#171c1b] text-[#d8cfbb] hover:bg-[#242b28]'
}

function attributeLevel(value: number): number {
  // 员工属性内部仍然是 0-100，这里只折算成 5 档，避免玩家看到精确数值。
  return Math.min(5, Math.max(1, Math.ceil(value / 20)))
}

function attributeBarTone(level: number, reversed?: boolean): string {
  // 压力是反向属性：段数越多代表风险越高，所以颜色逻辑和正向属性相反。
  const dangerLevel = reversed ? level : 6 - level
  if (dangerLevel >= 5) {
    return 'border-[#8f3f32] bg-[#d35d48]'
  }
  if (dangerLevel >= 4) {
    return 'border-[#8a5a29] bg-[#d8923d]'
  }
  if (dangerLevel >= 3) {
    return 'border-[#8b7f3f] bg-[#d8c45a]'
  }
  return 'border-[#4f6f3f] bg-[#7fb85c]'
}

interface AttributeBarProps {
  label: string
  value: number
  reversed?: boolean
}

function AttributeBar({ label, value, reversed }: AttributeBarProps) {
  const level = attributeLevel(value)
  const activeTone = attributeBarTone(level, reversed)

  return (
    <div className="grid grid-cols-[3.5em_minmax(0,1fr)] items-center gap-2">
      <span className="font-extrabold text-[#d8cfbb]">{label}</span>
      <div className="grid grid-cols-5 gap-1" aria-label={`${label}状态条`}>
        {Array.from({ length: 5 }, (_, index) => {
          const active = index < level
          return (
            <span
              key={index}
              className={cn(
                'h-2.5 rounded-sm border',
                active ? activeTone : 'border-[#303834] bg-[#202624]',
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

export function EmployeeDisciplineDialog({
  employee,
  open,
  onOpenChange,
  onOpenDetail,
}: EmployeeDisciplineDialogProps) {
  const applyEmployeeDiscipline = useGameStore((state) => state.applyEmployeeDiscipline)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const tutorial = useGameStore((state) => state.tutorial)
  const [fineRatio, setFineRatio] = useState(0.1)

  function handleAction(action: EmployeeDisciplineAction, nextFineRatio?: number) {
    if (!employee) {
      return
    }
    applyEmployeeDiscipline(employee.id, action, nextFineRatio)
    onOpenChange(false)
  }

  const actions = employee ? availableActions(employee.status) : []
  const normalActions = actions.filter((action) => action !== 'fine')
  const canFine = actions.includes('fine')
  const fineAmount = employee ? Math.round(employee.salaryPerDay * fineRatio) : 0
  const currentProject = employee?.assignedTo?.type === 'project'
    ? projectContracts.find((project) => project.id === employee.assignedTo?.id)
    : undefined
  const tutorialEmployee = Boolean(
    employee &&
      isCurrentTutorialNode(tutorial, 'catch_slacking_employee') &&
      tutorial.starterStatusEmployeeId === employee.id,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-32px),520px)]">
        <DialogHeader>
          <DialogTitle>员工处理</DialogTitle>
          <DialogDescription>
            {employee ? `${employee.nickname ?? employee.name} ${employee.resumeSkills.map((item) => `${levelLabels[item.level]}${roleLabels[item.role]}`).join(', ')} 当前状态：${employeeStatusLabels[employee.status]}` : '未选择员工'}
          </DialogDescription>
        </DialogHeader>

        {employee ? (
          <div className="grid gap-4">
            <div className="grid gap-2 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-[13px] text-[#d8cfbb]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-[16px] text-[#efe2c8]">{employee.nickname ?? employee.name}</strong>
                <span className={cn('rounded-md border px-2.5 py-1 text-xs font-extrabold', statusToneClass(employee.status))}>
                  {employeeStatusLabels[employee.status]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-[520px]:grid-cols-1">
                <AttributeBar label="精力" value={employee.energy} />
                <AttributeBar label="压力" value={employee.pressure} reversed />
                <AttributeBar label="自律" value={employee.discipline} />
                <AttributeBar label="满意度" value={employee.satisfaction} />
                <span>入职 {employee.workDays} 天</span>
              </div>
              {currentProject ? (
                <div className="rounded-md border border-[#3d4642] bg-[#202624] p-2 text-xs font-extrabold text-[#d8cfbb]">
                  当前项目：{currentProject.title} / {roleLabels[employee.assignedTo?.role ?? 'product']} / {projectStatusLabels[currentProject.status]}
                </div>
              ) : null}
            </div>

            {tutorialEmployee ? (
              <div className="rounded-md border-2 border-[#ffd46a] bg-[#2b2110] p-3 text-sm font-extrabold leading-6 text-[#fff3cd] shadow-[0_0_0_2px_rgba(255,212,106,0.2)]">
                摸鱼时当前产出为 0，长期不达标会让甲方满意度下降，严重时会退人。口头提醒、正式警告或罚款会让员工立刻回到工作；但频繁严厉处罚会降低满意度和士气，后续也会影响公司声誉与离职风险。
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              {onOpenDetail ? (
                <button
                  type="button"
                  className={cn(button, 'inline-flex items-center gap-1.5 border-[#4b514d] bg-[#242a28] text-[#efe2c8] hover:border-[#8b7f63] hover:bg-[#2d3431]')}
                  onClick={() => onOpenDetail(employee.id)}
                >
                  员工详情
                </button>
              ) : null}
              {normalActions.map((action) => {
                const Icon = actionIcons[action]
                return (
                  <button
                    key={action}
                    type="button"
                    data-tutorial-anchor={tutorialEmployee && action === 'verbal_warn' ? 'starter-employee-discipline-verbal-button' : undefined}
                    className={cn(button, 'inline-flex items-center gap-1.5', actionButtonClass(action), tutorialEmployee && action === 'verbal_warn' && tutorialTarget)}
                    onClick={() => handleAction(action)}
                  >
                    <Icon className="size-4" data-icon="inline-start" />
                    {employeeDisciplineActionLabels[action]}
                  </button>
                )
              })}
            </div>

            {canFine ? (
              <div className="grid gap-3 rounded-md border border-[#303834] bg-[#171c1b] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-extrabold text-[#d8cfbb]">
                  <span>罚款比例 {Math.round(fineRatio * 100)}%</span>
                  <strong className="text-[#efe2c8]">{money(fineAmount)}</strong>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 max-[520px]:grid-cols-1">
                  <Slider
                    aria-label={`${employee.name} 罚款比例`}
                    name={`discipline-fine-ratio-${employee.id}`}
                    min={0}
                    max={1}
                    step={0.05}
                    value={[fineRatio]}
                    onValueChange={(value) => setFineRatio(value[0] ?? 0)}
                  />
                  <button
                    type="button"
                    className={cn(button, 'inline-flex items-center gap-1.5 border-[#7b4630] bg-[#2c1d19] text-[#ffb0a3] hover:bg-[#3a241d]')}
                    onClick={() => handleAction('fine', fineRatio)}
                  >
                    <CircleDollarSign className="size-4" data-icon="inline-start" />
                    罚款
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
