import { useState } from 'react'

import { useGameStore } from '../../store/gameStore'
import { panel, srOnly } from '../../styles/tw'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog'
import { EmployeeDetailPanel, type EmployeeCompensationFormState } from './EmployeeDetailPanel'

interface EmployeeDetailDialogProps {
  employeeId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmployeeDetailDialog({
  employeeId,
  open,
  onOpenChange,
}: EmployeeDetailDialogProps) {
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const renameEmployee = useGameStore((state) => state.renameEmployee)
  const updateEmployeeCompensation = useGameStore((state) => state.updateEmployeeCompensation)
  const fireEmployee = useGameStore((state) => state.fireEmployee)
  const assignEmployeeToLabor = useGameStore((state) => state.assignEmployeeToLabor)
  const assignEmployeeToProject = useGameStore((state) => state.assignEmployeeToProject)
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [compensationForms, setCompensationForms] = useState<Record<string, EmployeeCompensationFormState>>({})
  const employee = employeeId ? employees.find((item) => item.id === employeeId) : undefined

  function getCompensationForm(nextEmployeeId: string): EmployeeCompensationFormState {
    const targetEmployee = employees.find((item) => item.id === nextEmployeeId)
    return compensationForms[nextEmployeeId] ?? {
      salary: targetEmployee ? String(targetEmployee.salaryPerDay) : '0',
      socialPercent: targetEmployee ? Math.round(targetEmployee.socialInsuranceRatio * 100) : 100,
    }
  }

  function updateCompensationForm(nextEmployeeId: string, patch: Partial<EmployeeCompensationFormState>) {
    setCompensationForms((current) => ({
      ...current,
      [nextEmployeeId]: {
        ...getCompensationForm(nextEmployeeId),
        ...current[nextEmployeeId],
        ...patch,
      },
    }))
  }

  return (
    <Dialog open={open && Boolean(employee)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-24px)] w-[min(calc(100vw-24px),1280px)] overflow-hidden p-0 max-[900px]:overflow-auto">
        <DialogTitle className={srOnly}>员工详情</DialogTitle>
        <DialogDescription className={srOnly}>查看员工属性、薪酬、离职和工作安排。</DialogDescription>
        {employee ? (
          <section className={panel}>
            <EmployeeDetailPanel
              employee={employee}
              laborContracts={laborContracts}
              projectContracts={projectContracts}
              nickname={nicknames[employee.id] ?? employee.nickname ?? ''}
              compensationForm={getCompensationForm(employee.id)}
              backLabel="关闭详情"
              onBack={() => onOpenChange(false)}
              onNicknameChange={(value) =>
                setNicknames((current) => ({ ...current, [employee.id]: value }))
              }
              onRename={() => renameEmployee(
                employee.id,
                (nicknames[employee.id] ?? employee.nickname ?? employee.name) || employee.name,
              )}
              onFire={() =>
                fireEmployee(employee.id)
              }
              onCompensationFormChange={(patch) => updateCompensationForm(employee.id, patch)}
              onSaveCompensation={(salaryPerDay, socialInsuranceRatio) => {
                updateEmployeeCompensation(employee.id, salaryPerDay, socialInsuranceRatio)
                setCompensationForms((current) => ({
                  ...current,
                  [employee.id]: {
                    salary: String(salaryPerDay),
                    socialPercent: Math.round(socialInsuranceRatio * 100),
                  },
                }))
              }}
              onAssignToLabor={assignEmployeeToLabor}
              onAssignToProject={assignEmployeeToProject}
            />
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
