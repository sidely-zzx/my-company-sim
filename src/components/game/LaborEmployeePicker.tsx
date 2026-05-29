import { useMemo, useState } from 'react'

import { SelectField, type SelectFieldOption } from '../ui/select-field'
import type { AssignmentMode, Employee, LaborContract, ProjectContract, SkillRole } from '../../game/types'
import {
  assignmentModeLabels,
  assignmentModes,
  assignmentText,
  laborStatusLabels,
  levelLabels,
  pendingAssignmentText,
  roleLabels,
  skillClaimsText,
  skillRoles,
  urgencyLabels,
} from '../../game/ui'
import { isStarterEmployee, isStarterLaborContract } from '../../game/systems/tutorialSystem'
import { useGameStore } from '../../store/gameStore'
import { cn, emptyState, riskToneClass, tutorialTarget } from '../../styles/tw'
import { money, levelFromAbility } from '../../utils'

type EmployeeAvailabilityFilter = 'all' | 'idle' | 'busy'
type LaborMatchFilter = 'all' | 'role' | 'qualified'

const assignmentModeOptions = assignmentModes.map((mode) => ({
  value: mode,
  label: assignmentModeLabels[mode],
})) satisfies SelectFieldOption<AssignmentMode>[]

const availabilityFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'idle', label: '仅空闲' },
  { value: 'busy', label: '仅忙碌' },
] satisfies SelectFieldOption<EmployeeAvailabilityFilter>[]

const matchFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'role', label: '仅对口' },
  { value: 'qualified', label: '仅达标' },
] satisfies SelectFieldOption<LaborMatchFilter>[]

interface LaborEmployeePickerProps {
  contract?: LaborContract
  employees: Employee[]
  laborContracts: LaborContract[]
  projectContracts: ProjectContract[]
  canAssign: boolean
  onAssignEmployee: (employeeId: string, mode: AssignmentMode) => void
}

function isEmployeeIdle(employee: Employee): boolean {
  return !employee.assignedTo
}

function roleAbility(employee: Employee, role: SkillRole): number {
  return employee.realSkillAbilities[role] ?? 0
}

// 主工种是从真实能力最高的岗位推导出的展示属性，只影响人力外包分配列表的展示、筛选和排序，不会写回员工数据。
function primaryRole(employee: Employee): SkillRole | undefined {
  let bestRole: SkillRole | undefined
  let bestAbility = 0

  for (const role of skillRoles) {
    const ability = roleAbility(employee, role)
    if (ability > bestAbility) {
      bestRole = role
      bestAbility = ability
    }
  }

  return bestRole ?? employee.resumeSkills[0]?.role
}

function resumeMatchesRole(employee: Employee, role: SkillRole): boolean {
  return employee.resumeSkills.some((skill) => skill.role === role)
}

function employeeMatchesContractRole(employee: Employee, contract: LaborContract): boolean {
  return primaryRole(employee) === contract.requiredRole || resumeMatchesRole(employee, contract.requiredRole)
}

function employeeMatchesAvailability(employee: Employee, filter: EmployeeAvailabilityFilter): boolean {
  if (filter === 'all') {
    return true
  }
  return filter === 'idle' ? isEmployeeIdle(employee) : !isEmployeeIdle(employee)
}

function employeeMatchesLaborFilter(employee: Employee, contract: LaborContract, filter: LaborMatchFilter): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'role') {
    return employeeMatchesContractRole(employee, contract)
  }
  return roleAbility(employee, contract.requiredRole) >= contract.requiredAbility
}

export function LaborEmployeePicker({
  contract,
  employees,
  laborContracts,
  projectContracts,
  canAssign,
  onAssignEmployee,
}: LaborEmployeePickerProps) {
  const tutorial = useGameStore((state) => state.tutorial)
  const [selectedMode, setSelectedMode] = useState<AssignmentMode>('immediate')
  const [availabilityFilter, setAvailabilityFilter] = useState<EmployeeAvailabilityFilter>('all')
  const [matchFilter, setMatchFilter] = useState<LaborMatchFilter>('all')

  const filteredEmployees = useMemo(() => {
    if (!contract) {
      return []
    }

    return employees
      .filter((employee) => employee.status !== 'fired')
      .filter((employee) => employeeMatchesAvailability(employee, availabilityFilter))
      .filter((employee) => employeeMatchesLaborFilter(employee, contract, matchFilter))
      .sort((left, right) => {
        const idleDiff = Number(isEmployeeIdle(right)) - Number(isEmployeeIdle(left))
        if (idleDiff !== 0) {
          return idleDiff
        }

        // 合同岗位能力会参与人力合同日结满意度判断，因此排序优先把达标员工和能力更高的员工放在前面。
        const qualifiedDiff =
          Number(roleAbility(right, contract.requiredRole) >= contract.requiredAbility) -
          Number(roleAbility(left, contract.requiredRole) >= contract.requiredAbility)
        if (qualifiedDiff !== 0) {
          return qualifiedDiff
        }

        const roleDiff =
          Number(employeeMatchesContractRole(right, contract)) -
          Number(employeeMatchesContractRole(left, contract))
        if (roleDiff !== 0) {
          return roleDiff
        }

        const abilityDiff = roleAbility(right, contract.requiredRole) - roleAbility(left, contract.requiredRole)
        if (abilityDiff !== 0) {
          return abilityDiff
        }

        return right.satisfaction - left.satisfaction
      })
  }, [availabilityFilter, contract, employees, matchFilter])

  if (!contract) {
    return (
      <div className="grid gap-3">
        <p className={emptyState}>先签约一份可安排的人力外包合同。</p>
      </div>
    )
  }
  const starterContract = isStarterLaborContract({ tutorial }, contract.id) && !tutorial.completed

  function assignEmployee(employeeId: string) {
    if (!canAssign) {
      return
    }

    // 后续安排只会写入员工 pendingAssignment，不会立刻改变当前分配；员工释放为空闲后才会影响驻场履约状态。
    onAssignEmployee(employeeId, selectedMode)
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="rounded-md border border-[#303834] bg-[rgba(12,15,15,0.42)] p-3">
        <div className="mb-3 grid gap-1 text-sm text-[#d8cfbb]">
          <strong className="text-[#efe2c8]">{contract.title}</strong>
          <span className="text-xs text-[#aeb5ac]">
            {contract.clientName} · {laborStatusLabels[contract.status]} · {urgencyLabels[contract.urgency]} · {contract.durationDays} 天 · 第 {contract.endDay} 天到期
          </span>
          <span className="text-xs font-extrabold text-[#d8cfbb]">
            需求 {levelLabels[levelFromAbility(contract.requiredAbility)]} {roleLabels[contract.requiredRole]} · 今日产出 {Math.round(contract.todayOutput)} / {Math.round(contract.todayRequiredOutput)} · {money(contract.dailyBudget)}/天
          </span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <SelectField
            label="投入方式"
            name={`labor-mode-${contract.id}`}
            value={selectedMode}
            options={assignmentModeOptions}
            onValueChange={setSelectedMode}
          />
          <SelectField
            label="空闲筛选"
            name={`labor-availability-${contract.id}`}
            value={availabilityFilter}
            options={availabilityFilterOptions}
            onValueChange={setAvailabilityFilter}
          />
          <SelectField
            label="匹配筛选"
            name={`labor-match-${contract.id}`}
            value={matchFilter}
            options={matchFilterOptions}
            onValueChange={setMatchFilter}
          />
        </div>
        {!canAssign && (
          <p className={cn('mb-0 mt-2 text-xs font-extrabold', riskToneClass.danger)}>
            该人力合同状态不允许继续安排员工。
          </p>
        )}
      </div>

      {filteredEmployees.length === 0 ? (
        <p className={emptyState}>没有符合筛选条件的员工。</p>
      ) : (
        <div className="grid max-h-[560px] gap-2 overflow-auto pr-1">
          {filteredEmployees.map((employee) => {
            const employeePrimaryRole = primaryRole(employee)
            const ability = roleAbility(employee, contract.requiredRole)
            const abilityGap = ability - contract.requiredAbility
            const qualified = abilityGap >= 0
            const idle = isEmployeeIdle(employee)
            const matchesRole = employeeMatchesContractRole(employee, contract)
            const starterEmployee = isStarterEmployee({ tutorial }, employee) && !tutorial.completed
            const showLaborPendingHint = employee.assignedTo?.type === 'labor' && selectedMode === 'after_current'

            return (
              <button
                key={employee.id}
                type="button"
                data-tutorial-anchor={starterContract && starterEmployee ? 'starter-labor-employee' : undefined}
                className={cn(
                  'grid gap-2 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-left text-[#d8cfbb]',
                  idle && 'border-[#56684d] bg-[#1d251d]',
                  starterContract && starterEmployee && cn('animate-pulse', tutorialTarget),
                  qualified && matchesRole && 'shadow-[inset_4px_0_0_#6f9d51]',
                  !canAssign
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:border-[#b59d65] hover:bg-[#242a28] focus-visible:border-[#b59d65] focus-visible:outline-none',
                )}
                disabled={!canAssign}
                onClick={() => assignEmployee(employee.id)}
              >
                <span className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <strong className="truncate text-[#efe2c8]">{employee.nickname || employee.name}</strong>
                  <span className={cn('text-xs font-extrabold', idle ? riskToneClass.success : riskToneClass.warning)}>
                    {starterContract && starterEmployee ? '教学推荐' : idle ? '空闲' : '忙碌'}
                  </span>
                </span>

                <span className="flex flex-wrap gap-2 text-xs font-extrabold">
                  <span className="rounded border border-[#3d4642] bg-[#202624] px-2 py-1 text-[#d8cfbb]">
                    主工种 {employeePrimaryRole ? roleLabels[employeePrimaryRole] : '未知'}
                  </span>
                  {/* <span className="rounded border border-[#3d4642] bg-[#202624] px-2 py-1 text-[#d8cfbb]">
                    {roleLabels[contract.requiredRole]}能力 {ability} / 要求 {contract.requiredAbility}
                  </span> */}
                  {/* <span
                    className={cn(
                      'rounded border px-2 py-1',
                      qualified
                        ? 'border-[#56684d] bg-[#1d251d] text-[#92d16e]'
                        : 'border-[#5a352f] bg-[#241717] text-[#ff7968]',
                    )}
                  >
                    {qualified ? (idle && matchesRole ? '推荐' : '达标') : `差距 ${abilityGap}`}
                  </span> */}
                </span>

                <span className="grid gap-1 text-xs text-[#aeb5ac]">
                  <span>当前：{assignmentText(employee, laborContracts, projectContracts)}</span>
                  <span>后续：{pendingAssignmentText(employee, laborContracts, projectContracts)}</span>
                  <span>简历：{skillClaimsText(employee.resumeSkills)}</span>
                </span>

                <span className="flex flex-wrap gap-2 text-xs font-extrabold text-[#d8cfbb]">
                  <span>满意度 {employee.satisfaction}</span>
                  <span>日薪 {money(employee.salaryPerDay)}</span>
                </span>

                {showLaborPendingHint && (
                  <span className="text-xs font-extrabold text-[#e4b45b]">
                    驻场合同会在到期日自动完成；后续安排要等合同到期、被替换或立即调走后才会执行。
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
