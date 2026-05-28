import type { ReactNode } from 'react'

import type { LaborContract } from '../../game/types'
import {
  laborStatusLabels,
  roleLabels,
  urgencyLabels,
} from '../../game/ui'
import { isStarterLaborContract } from '../../game/systems/tutorialSystem'
import { useGameStore } from '../../store/gameStore'
import { button, cn, riskToneClass, tutorialTarget } from '../../styles/tw'
import { money } from '../../utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { LaborEmployeePicker } from './LaborEmployeePicker'

interface LaborDetailDialogProps {
  contract: LaborContract
  trigger?: ReactNode
}

function canAssignLaborContract(contract: LaborContract): boolean {
  return ['accepted', 'active', 'warning'].includes(contract.status)
}

export function LaborDetailDialog({ contract, trigger }: LaborDetailDialogProps) {
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const tutorial = useGameStore((state) => state.tutorial)
  const acceptLaborContract = useGameStore((state) => state.acceptLaborContract)
  const assignEmployeeToLabor = useGameStore((state) => state.assignEmployeeToLabor)
  const assigned = employees.find((employee) => employee.id === contract.assignedEmployeeId)
  // 当前驻场员工的合同岗位能力会参与分钟产出累计；能力、工作分钟和工作状态倍率共同决定当天是否达标。
  const assignedAbility = assigned?.realSkillAbilities[contract.requiredRole] ?? 0
  const canAssign = canAssignLaborContract(contract)
  const starterContract = isStarterLaborContract({ tutorial }, contract.id) && !tutorial.completed

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <button type="button" className={button}>
            详情
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[min(calc(100vw-32px),1180px)]">
        <DialogTitle>{contract.title}</DialogTitle>
        <DialogDescription>
          {contract.clientName} · {laborStatusLabels[contract.status]} · {urgencyLabels[contract.urgency]}
        </DialogDescription>

        <div className="grid min-h-[620px] grid-cols-[minmax(260px,0.75fr)_minmax(520px,1.25fr)] gap-4 max-[980px]:grid-cols-1">
          <section className="min-w-0 rounded-md border border-[#303834] bg-[rgba(12,15,15,0.42)] p-4">
            <div className="grid gap-3">
              {starterContract ? (
                <div className="rounded-md border border-[#7f6840] bg-[#2d281f] p-3 text-sm text-[#ead7aa]">
                  <strong className="block text-[#ffe0a3]">推荐第一单</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#d8cfbb]">
                    能力和真实工作状态会决定每天产出；合同到期后会自动释放驻场员工。
                  </span>
                </div>
              ) : null}
              <dl className="m-0 grid grid-cols-2 gap-2 text-[13px] text-[#d8cfbb]">
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">需求岗位</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{roleLabels[contract.requiredRole]}</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">最低能力</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{contract.requiredAbility}</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">日预算</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{money(contract.dailyBudget)}</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">服务期</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{contract.durationDays} 天</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">到期日</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">第 {contract.endDay} 天</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">满意度</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{contract.satisfaction}</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">状态</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">{laborStatusLabels[contract.status]}</dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">今日产出</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">
                    {Math.round(contract.todayOutput)} / {Math.round(contract.todayRequiredOutput)}
                  </dd>
                </div>
                <div className="rounded-md border border-[#303834] bg-[#171c1b] p-2">
                  <dt className="text-[#9aa29a]">昨日检查</dt>
                  <dd className="m-0 mt-1 font-extrabold text-[#efe2c8]">
                    {contract.lastOutputCheckDay
                      ? `${Math.round(contract.lastOutputActual ?? 0)} / ${Math.round(contract.lastOutputRequired ?? 0)}`
                      : '暂无'}
                  </dd>
                </div>
              </dl>

              {contract.status === 'available' && (
                <div className="rounded-md border border-[#4b514d] bg-[#171c1b] p-3 text-sm text-[#d8cfbb]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong className="block text-[#efe2c8]">签约后安排驻场人员</strong>
                      <span className="text-xs text-[#aeb5ac]">
                        签约会把合同状态改为已签约，并允许在本详情页继续安排员工。
                      </span>
                    </div>
                    <button
                      type="button"
                      data-tutorial-anchor={starterContract ? 'starter-labor-sign-button' : undefined}
                      className={cn(button, starterContract && cn('animate-pulse', tutorialTarget))}
                      onClick={() => acceptLaborContract(contract.id)}
                    >
                      签约
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-md border border-[#303834] bg-[#171c1b] p-3 text-sm text-[#d8cfbb]">
                <strong className="block text-[#efe2c8]">当前驻场员工</strong>
                {assigned ? (
                  <div className="mt-2 grid gap-1 text-xs text-[#aeb5ac]">
                    <span className="font-extrabold text-[#d8cfbb]">{assigned.nickname || assigned.name}</span>
                    <span>
                      {roleLabels[contract.requiredRole]}能力 {assignedAbility} / 要求 {contract.requiredAbility}
                    </span>
                    <span className={cn(assignedAbility >= contract.requiredAbility ? riskToneClass.success : riskToneClass.danger)}>
                      {assignedAbility >= contract.requiredAbility ? '当前员工能力达标' : `当前员工低于要求 ${contract.requiredAbility - assignedAbility}`}
                    </span>
                  </div>
                ) : (
                  <p className="mb-0 mt-2 text-xs text-[#aeb5ac]">尚未安排驻场员工。</p>
                )}
              </div>

              {!canAssign && (
                <p className={cn('m-0 text-xs font-extrabold', riskToneClass.danger)}>
                  {contract.status === 'available' ? '未签约合同只能查看详情，签约后才能安排员工。' : '该人力合同状态不允许继续安排员工。'}
                </p>
              )}
            </div>
          </section>

          <section className="min-w-0">
            <LaborEmployeePicker
              contract={contract}
              employees={employees}
              laborContracts={laborContracts}
              projectContracts={projectContracts}
              canAssign={canAssign}
              onAssignEmployee={(employeeId, mode) => assignEmployeeToLabor(employeeId, contract.id, mode)}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
