import { useMemo, useState } from 'react'

import type { AssignmentMode, Employee, LaborContract, ProjectContract, SkillRole } from '../../game/types'
import {
  assignmentModeLabels,
  assignmentModes,
  assignmentText,
  laborStatusLabels,
  pendingAssignmentText,
  projectStatusLabels,
  projectTracks,
  roleLabels,
} from '../../game/ui'
import { button, cn, emptyState, riskToneClass } from '../../styles/tw'
import { money } from '../../utils'
import { SelectField, type SelectFieldOption } from '../ui/select-field'

type AssignmentTargetType = 'labor' | 'project'

interface EmployeeAssignmentControlProps {
  employee: Employee
  laborContracts: LaborContract[]
  projectContracts: ProjectContract[]
  onAssignToLabor: (employeeId: string, contractId: string, mode: AssignmentMode) => void
  onAssignToProject: (employeeId: string, projectId: string, role: SkillRole, mode: AssignmentMode) => void
}

const assignmentModeOptions = assignmentModes.map((mode) => ({
  value: mode,
  label: assignmentModeLabels[mode],
})) satisfies SelectFieldOption<AssignmentMode>[]

const targetTypeOptions = [
  { value: 'labor', label: '人力外包' },
  { value: 'project', label: '项目外包' },
] satisfies SelectFieldOption<AssignmentTargetType>[]

function canAssignLaborContract(contract: LaborContract): boolean {
  return ['accepted', 'active', 'warning'].includes(contract.status)
}

function canAssignProject(project: ProjectContract): boolean {
  return ['accepted', 'active', 'overdue'].includes(project.status)
}

function employeeAbility(employee: Employee, role: SkillRole): number {
  return employee.realSkillAbilities[role] ?? 0
}

export function EmployeeAssignmentControl({
  employee,
  laborContracts,
  projectContracts,
  onAssignToLabor,
  onAssignToProject,
}: EmployeeAssignmentControlProps) {
  const availableLaborContracts = useMemo(
    () => laborContracts.filter(canAssignLaborContract),
    [laborContracts],
  )
  const availableProjectContracts = useMemo(
    () => projectContracts.filter(canAssignProject),
    [projectContracts],
  )
  const [targetType, setTargetType] = useState<AssignmentTargetType>(
    availableLaborContracts.length > 0 ? 'labor' : 'project',
  )
  const [selectedMode, setSelectedMode] = useState<AssignmentMode>('immediate')
  const [selectedLaborId, setSelectedLaborId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedRole, setSelectedRole] = useState<SkillRole>('product')

  const laborOptions: SelectFieldOption<string>[] = availableLaborContracts.map((contract) => ({
    value: contract.id,
    label: `${contract.title} / ${roleLabels[contract.requiredRole]}`,
  }))
  const projectOptions: SelectFieldOption<string>[] = availableProjectContracts.map((project) => ({
    value: project.id,
    label: project.title,
  }))
  const activeLaborId = laborOptions.some((option) => option.value === selectedLaborId)
    ? selectedLaborId
    : laborOptions[0]?.value ?? ''
  const activeProjectId = projectOptions.some((option) => option.value === selectedProjectId)
    ? selectedProjectId
    : projectOptions[0]?.value ?? ''
  const selectedLabor = availableLaborContracts.find((contract) => contract.id === activeLaborId)
  const selectedProject = availableProjectContracts.find((project) => project.id === activeProjectId)
  const projectRoleOptions: SelectFieldOption<SkillRole>[] = selectedProject
    ? projectTracks
        .filter((track) => selectedProject.phaseProgress[track] < 100)
        .map((track) => ({
          value: track,
          label: roleLabels[track],
        }))
    : []
  const activeProjectRole = projectRoleOptions.some((option) => option.value === selectedRole)
    ? selectedRole
    : projectRoleOptions[0]?.value ?? 'product'
  const isFired = employee.status === 'fired'
  const canAssignLabor = !isFired && Boolean(selectedLabor)
  const canAssignProjectTarget = !isFired && Boolean(selectedProject) && projectRoleOptions.length > 0
  const canAssign = targetType === 'labor' ? canAssignLabor : canAssignProjectTarget
  const disabledReason = isFired
    ? '已离职员工不能安排工作。'
    : targetType === 'labor'
      ? selectedLabor
        ? ''
        : '暂无可安排的人力外包合同。'
      : selectedProject
        ? projectRoleOptions.length > 0
          ? ''
          : '该项目没有未完成的岗位轨道。'
        : '暂无可安排的项目外包。'

  function assignEmployee() {
    if (!canAssign) {
      return
    }

    // 员工详情页的安排入口只把玩家选择转发到现有分配系统；分配系统会继续校验合同/项目状态并更新员工当前或后续安排。
    if (targetType === 'labor' && selectedLabor) {
      onAssignToLabor(employee.id, selectedLabor.id, selectedMode)
      return
    }

    if (targetType === 'project' && selectedProject) {
      onAssignToProject(employee.id, selectedProject.id, activeProjectRole, selectedMode)
    }
  }

  return (
    <section className="grid gap-2.5 rounded-md border border-[#303834] bg-[rgba(12,15,15,0.5)] p-3">
      <div>
        <h3 className="m-0 text-[15px] text-[#efe2c8]">工作安排</h3>
        <p className="m-0 mt-1 text-xs font-extrabold text-[#aaa48f]">
          从员工视角安排当前或后续工作。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[13px] text-[#d8cfbb] max-[760px]:grid-cols-1">
        {/* 当前分配影响员工今天的产出来源；后续安排会在当前合同释放后接管，两个摘要并排展示以减少详情页纵向高度。 */}
        <p className="m-0 min-w-0 rounded-md border border-[#303834] bg-[#171c1b] p-2">
          <span className="block text-xs font-extrabold text-[#aaa48f]">当前</span>
          <span className="mt-1 block truncate">{assignmentText(employee, laborContracts, projectContracts)}</span>
        </p>
        <p className="m-0 min-w-0 rounded-md border border-[#303834] bg-[#171c1b] p-2">
          <span className="block text-xs font-extrabold text-[#aaa48f]">后续</span>
          <span className="mt-1 block truncate">{pendingAssignmentText(employee, laborContracts, projectContracts)}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <SelectField
          label="目标类型"
          name={`employee-assignment-target-${employee.id}`}
          value={targetType}
          options={targetTypeOptions}
          disabled={isFired}
          onValueChange={setTargetType}
        />
        <SelectField
          label="投入方式"
          name={`employee-assignment-mode-${employee.id}`}
          value={selectedMode}
          options={assignmentModeOptions}
          disabled={isFired}
          onValueChange={setSelectedMode}
        />
      </div>

      {targetType === 'labor' ? (
        laborOptions.length > 0 ? (
          <div className="grid gap-2">
            <SelectField
              label="人力合同"
              name={`employee-assignment-labor-${employee.id}`}
              value={activeLaborId}
              options={laborOptions}
              disabled={isFired}
              triggerClassName="min-w-[18rem] max-[560px]:min-w-0"
              onValueChange={setSelectedLaborId}
            />
            {selectedLabor ? (
              <div className="grid gap-1 rounded-md border border-[#303834] bg-[#171c1b] p-2 text-xs text-[#aeb5ac]">
                <strong className="text-[#efe2c8]">{selectedLabor.title}</strong>
                <span>
                  {laborStatusLabels[selectedLabor.status]} · {roleLabels[selectedLabor.requiredRole]} · 能力 {employeeAbility(employee, selectedLabor.requiredRole)} / 要求 {selectedLabor.requiredAbility}
                </span>
                <span>日预算 {money(selectedLabor.dailyBudget)} · 第 {selectedLabor.endDay} 天到期</span>
              </div>
            ) : null}
          </div>
        ) : (
          <p className={emptyState}>暂无可安排的人力外包合同。</p>
        )
      ) : projectOptions.length > 0 ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <SelectField
              label="项目"
              name={`employee-assignment-project-${employee.id}`}
              value={activeProjectId}
              options={projectOptions}
              disabled={isFired}
              triggerClassName="min-w-[18rem] max-[560px]:min-w-0"
              onValueChange={setSelectedProjectId}
            />
            {projectRoleOptions.length > 0 ? (
              <SelectField
                label="岗位"
                name={`employee-assignment-project-role-${employee.id}`}
                value={activeProjectRole}
                options={projectRoleOptions}
                disabled={isFired}
                onValueChange={setSelectedRole}
              />
            ) : null}
          </div>
          {selectedProject ? (
            <div className="grid gap-1 rounded-md border border-[#303834] bg-[#171c1b] p-2 text-xs text-[#aeb5ac]">
              <strong className="text-[#efe2c8]">{selectedProject.title}</strong>
              <span>
                {projectStatusLabels[selectedProject.status]} · {roleLabels[activeProjectRole]}进度 {Math.round(selectedProject.phaseProgress[activeProjectRole])}% · 员工能力 {employeeAbility(employee, activeProjectRole)}
              </span>
              <span>截止第 {selectedProject.deadlineDay} 天 · 延期罚金 {money(selectedProject.dailyPenalty)}/天</span>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={emptyState}>暂无可安排的项目外包。</p>
      )}

      {disabledReason ? (
        <p className={cn('m-0 text-xs font-extrabold', riskToneClass.danger)}>
          {disabledReason}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className={button}
          disabled={!canAssign}
          onClick={assignEmployee}
        >
          安排员工
        </button>
      </div>
    </section>
  )
}
