import type {
  Assignment,
  AssignmentMode,
  Employee,
  GameState,
  LaborContract,
  ProjectContract,
  SkillRole,
} from '../types'
import { isProjectRoleActive } from '../projectPhase'
import { roleLabels } from '../ui'
import { addEvent } from './eventSystem'

const assignableProjectStatuses = ['accepted', 'active', 'overdue'] as const
const assignableLaborStatuses = ['accepted', 'active', 'warning'] as const

function employeeDisplayName(employee: Employee): string {
  return employee.nickname ?? employee.name
}

function targetText(state: GameState, assignment: Assignment): string {
  if (assignment.type === 'labor') {
    const contract = state.laborContracts.find((item) => item.id === assignment.id)
    return contract ? `人力外包 ${contract.title}` : '未知人力外包'
  }

  const project = state.projectContracts.find((item) => item.id === assignment.id)
  const role = assignment.role ? roleLabels[assignment.role] : '未知岗位'
  return project ? `项目 ${project.title} / ${role}` : `未知项目 / ${role}`
}

function validateAssignmentTarget(
  state: GameState,
  assignment: Assignment,
): { ok: true; assignment: Assignment } | { ok: false; message: string } {
  if (assignment.type === 'project') {
    const project = state.projectContracts.find((item) => item.id === assignment.id)
    const role = assignment.role
    if (!project || !role) {
      return { ok: false, message: '项目或岗位不存在。' }
    }
    if (!assignableProjectStatuses.includes(project.status as (typeof assignableProjectStatuses)[number])) {
      return { ok: false, message: '该项目当前不能安排员工。' }
    }
    if (project.phaseProgress[role] >= 100) {
      return { ok: false, message: '该岗位轨道已经完成，不能继续安排员工。' }
    }
    return { ok: true, assignment: { type: 'project', id: project.id, role } }
  }

  const contract = state.laborContracts.find((item) => item.id === assignment.id)
  if (!contract) {
    return { ok: false, message: '人力外包合同不存在。' }
  }
  if (!assignableLaborStatuses.includes(contract.status as (typeof assignableLaborStatuses)[number])) {
    return { ok: false, message: '该人力外包合同当前不能安排员工。' }
  }
  return { ok: true, assignment: { type: 'labor', id: contract.id, role: contract.requiredRole } }
}

function removeEmployeeFromProject(project: ProjectContract, employeeId: string): void {
  for (const role of Object.keys(project.assignedEmployees) as SkillRole[]) {
    project.assignedEmployees[role] = (project.assignedEmployees[role] ?? []).filter((id) => id !== employeeId)
  }
}

function clearEmployeeFromAllTargets(state: GameState, employeeId: string): void {
  for (const project of state.projectContracts) {
    removeEmployeeFromProject(project, employeeId)
  }

  for (const contract of state.laborContracts) {
    if (contract.assignedEmployeeId !== employeeId) {
      continue
    }
    contract.assignedEmployeeId = undefined
    if (contract.status === 'active' || contract.status === 'warning') {
      contract.status = 'accepted'
    }
  }
}

export function releaseEmployeeFromCurrentAssignment(state: GameState, employee: Employee): void {
  // 释放员工会清理项目和人力合同中的反向引用；这会让员工变为空闲，并触发后续安排的生效机会。
  clearEmployeeFromAllTargets(state, employee.id)
  employee.assignedTo = undefined
  if (employee.status !== 'fired') {
    employee.status = 'idle'
  }
}

function applyProjectAssignment(
  state: GameState,
  employee: Employee,
  project: ProjectContract,
  role: SkillRole,
): void {
  project.assignedEmployees[role] = Array.from(
    new Set([...(project.assignedEmployees[role] ?? []), employee.id]),
  )
  project.status = project.status === 'overdue' ? 'overdue' : 'active'
  employee.assignedTo = { type: 'project', id: project.id, role }
  // 项目分配会占用员工，但状态由项目当前阶段决定；岗位阶段未开始时显示空闲，等阶段推进到该岗位后才恢复工作并产生进度。
  employee.status = isProjectRoleActive(project, role) ? 'working' : 'idle'
  addEvent(state, {
    type: 'project',
    title: '项目成员已投入',
    message: `${employeeDisplayName(employee)} 开始负责 ${project.title} 的 ${roleLabels[role]}。`,
    severity: 'success',
    relatedEntityId: project.id,
  })
}

function applyLaborAssignment(state: GameState, employee: Employee, contract: LaborContract): void {
  if (contract.assignedEmployeeId && contract.assignedEmployeeId !== employee.id) {
    const replacedEmployee = state.employees.find((item) => item.id === contract.assignedEmployeeId)
    if (replacedEmployee) {
      releaseEmployeeFromCurrentAssignment(state, replacedEmployee)
    }
  }

  contract.assignedEmployeeId = employee.id
  contract.status = 'active'
  employee.assignedTo = { type: 'labor', id: contract.id, role: contract.requiredRole }
  employee.status = 'working'
  addEvent(state, {
    type: 'contract',
    title: '员工已安排驻场',
    message: `${employeeDisplayName(employee)} 已安排到 ${contract.clientName}。`,
    severity: 'success',
    relatedEntityId: contract.id,
  })
}

function applyImmediateAssignment(state: GameState, employee: Employee, assignment: Assignment): boolean {
  const validation = validateAssignmentTarget(state, assignment)
  if (!validation.ok) {
    addEvent(state, {
      type: assignment.type === 'project' ? 'project' : 'contract',
      title: '安排失败',
      message: validation.message,
      severity: 'warning',
      relatedEntityId: assignment.id,
    })
    return false
  }

  releaseEmployeeFromCurrentAssignment(state, employee)
  employee.pendingAssignment = undefined

  if (validation.assignment.type === 'project') {
    const project = state.projectContracts.find((item) => item.id === validation.assignment.id)
    if (!project || !validation.assignment.role) {
      return false
    }
    applyProjectAssignment(state, employee, project, validation.assignment.role)
    return true
  }

  const contract = state.laborContracts.find((item) => item.id === validation.assignment.id)
  if (!contract) {
    return false
  }
  applyLaborAssignment(state, employee, contract)
  return true
}

export function processIdlePendingAssignments(state: GameState): void {
  // 后续安排按“员工空闲即尝试生效”的规则推进；一个员工只保留一条，执行前会再次校验目标是否仍然有效。
  let changed = true
  let guard = Math.max(6, state.employees.length * 3)

  while (changed && guard > 0) {
    changed = false
    guard -= 1

    for (const employee of state.employees) {
      if (employee.status === 'fired' || employee.assignedTo || !employee.pendingAssignment) {
        continue
      }

      const pendingAssignment = employee.pendingAssignment
      employee.pendingAssignment = undefined
      const applied = applyImmediateAssignment(state, employee, pendingAssignment)
      if (!applied) {
        addEvent(state, {
          type: pendingAssignment.type === 'project' ? 'project' : 'contract',
          title: '后续安排已取消',
          message: `${employeeDisplayName(employee)} 的后续安排 ${targetText(state, pendingAssignment)} 已失效。`,
          severity: 'warning',
          relatedEntityId: pendingAssignment.id,
        })
      }
      changed = true
    }
  }
}

export function assignEmployeeToTarget(
  state: GameState,
  employeeId: string,
  assignment: Assignment,
  mode: AssignmentMode,
): void {
  const employee = state.employees.find((item) => item.id === employeeId)
  if (!employee || employee.status === 'fired') {
    addEvent(state, {
      type: assignment.type === 'project' ? 'project' : 'contract',
      title: '安排失败',
      message: '没有找到可安排的员工。',
      severity: 'warning',
      relatedEntityId: assignment.id,
    })
    return
  }

  const validation = validateAssignmentTarget(state, assignment)
  if (!validation.ok) {
    addEvent(state, {
      type: assignment.type === 'project' ? 'project' : 'contract',
      title: '安排失败',
      message: validation.message,
      severity: 'warning',
      relatedEntityId: assignment.id,
    })
    return
  }

  if (mode === 'after_current' && employee.assignedTo) {
    employee.pendingAssignment = validation.assignment
    addEvent(state, {
      type: validation.assignment.type === 'project' ? 'project' : 'contract',
      title: '后续安排已更新',
      message: `${employeeDisplayName(employee)} 会在当前工作完成后投入 ${targetText(state, validation.assignment)}。`,
      severity: 'info',
      relatedEntityId: validation.assignment.id,
    })
    return
  }

  applyImmediateAssignment(state, employee, validation.assignment)
  processIdlePendingAssignments(state)
}

export function releaseCompletedProjectRoleAssignments(
  state: GameState,
  project: ProjectContract,
  role: SkillRole,
): void {
  const employeeIds = [...(project.assignedEmployees[role] ?? [])]
  if (project.phaseProgress[role] < 100 || employeeIds.length === 0) {
    return
  }

  project.assignedEmployees[role] = []
  const releasedNames: string[] = []
  for (const employeeId of employeeIds) {
    const employee = state.employees.find((item) => item.id === employeeId)
    if (!employee || employee.assignedTo?.type !== 'project' || employee.assignedTo.id !== project.id) {
      continue
    }
    employee.assignedTo = undefined
    if (employee.status !== 'fired') {
      employee.status = 'idle'
    }
    releasedNames.push(employeeDisplayName(employee))
  }

  cancelPendingAssignmentsForProjectRole(state, project, role)
  if (releasedNames.length > 0) {
    addEvent(state, {
      type: 'project',
      title: '项目岗位工作完成',
      message: `${project.title} 的 ${roleLabels[role]} 已完成，${releasedNames.join('、')} 已释放。`,
      severity: 'success',
      relatedEntityId: project.id,
    })
    processIdlePendingAssignments(state)
  }
}

export function releaseProjectAssignments(state: GameState, project: ProjectContract): void {
  const employeeIds = Array.from(
    new Set(Object.values(project.assignedEmployees).flatMap((ids) => ids ?? [])),
  )
  project.assignedEmployees = {}

  for (const employeeId of employeeIds) {
    const employee = state.employees.find((item) => item.id === employeeId)
    if (!employee || employee.assignedTo?.type !== 'project' || employee.assignedTo.id !== project.id) {
      continue
    }
    employee.assignedTo = undefined
    if (employee.status !== 'fired') {
      employee.status = 'idle'
    }
  }

  processIdlePendingAssignments(state)
}

export function releaseLaborContractAssignment(state: GameState, contract: LaborContract): void {
  const employeeId = contract.assignedEmployeeId
  contract.assignedEmployeeId = undefined
  if (contract.status === 'active' || contract.status === 'warning') {
    contract.status = 'accepted'
  }

  if (!employeeId) {
    return
  }

  const employee = state.employees.find((item) => item.id === employeeId)
  if (employee?.assignedTo?.type === 'labor' && employee.assignedTo.id === contract.id) {
    employee.assignedTo = undefined
    if (employee.status !== 'fired') {
      employee.status = 'idle'
    }
  }
  processIdlePendingAssignments(state)
}

export function cancelPendingAssignmentsForProjectRole(
  state: GameState,
  project: ProjectContract,
  role: SkillRole,
): void {
  for (const employee of state.employees) {
    if (
      employee.pendingAssignment?.type !== 'project' ||
      employee.pendingAssignment.id !== project.id ||
      employee.pendingAssignment.role !== role
    ) {
      continue
    }
    employee.pendingAssignment = undefined
    addEvent(state, {
      type: 'project',
      title: '后续安排已取消',
      message: `${employeeDisplayName(employee)} 原计划投入 ${project.title} 的 ${roleLabels[role]}，但该岗位已完成。`,
      severity: 'warning',
      relatedEntityId: project.id,
    })
  }
}

export function cancelPendingAssignmentsForProject(state: GameState, project: ProjectContract): void {
  for (const employee of state.employees) {
    if (employee.pendingAssignment?.type !== 'project' || employee.pendingAssignment.id !== project.id) {
      continue
    }
    employee.pendingAssignment = undefined
    addEvent(state, {
      type: 'project',
      title: '后续安排已取消',
      message: `${employeeDisplayName(employee)} 原计划投入 ${project.title}，但项目已结束。`,
      severity: 'warning',
      relatedEntityId: project.id,
    })
  }
}

export function cancelPendingAssignmentsForLaborContract(state: GameState, contract: LaborContract): void {
  for (const employee of state.employees) {
    if (employee.pendingAssignment?.type !== 'labor' || employee.pendingAssignment.id !== contract.id) {
      continue
    }
    employee.pendingAssignment = undefined
    addEvent(state, {
      type: 'contract',
      title: '后续安排已取消',
      message: `${employeeDisplayName(employee)} 原计划投入 ${contract.title}，但合同已结束。`,
      severity: 'warning',
      relatedEntityId: contract.id,
    })
  }
}
