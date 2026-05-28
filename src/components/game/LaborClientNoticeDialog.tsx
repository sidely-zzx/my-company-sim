import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog'
import { laborStatusLabels, roleLabels } from '../../game/ui'
import { useGameStore } from '../../store/gameStore'
import { button, cn, eventBorderToneClass, srOnly } from '../../styles/tw'
import { LaborEmployeePicker } from './LaborEmployeePicker'

function canAssignLaborContract(status?: string): boolean {
  return status === 'accepted' || status === 'active' || status === 'warning'
}

export function LaborClientNoticeDialog() {
  const employees = useGameStore((state) => state.employees)
  const laborContracts = useGameStore((state) => state.laborContracts)
  const projectContracts = useGameStore((state) => state.projectContracts)
  const pendingProjectClientEvents = useGameStore((state) => state.pendingProjectClientEvents)
  const pendingLaborClientNotices = useGameStore((state) => state.pendingLaborClientNotices)
  const resolveLaborClientNotice = useGameStore((state) => state.resolveLaborClientNotice)
  const notice = pendingProjectClientEvents.length > 0 ? undefined : pendingLaborClientNotices[0]
  const contract = notice ? laborContracts.find((item) => item.id === notice.contractId) : undefined
  const canReplace = canAssignLaborContract(contract?.status)

  return (
    <Dialog open={Boolean(notice)}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(calc(100vw-32px),1040px)]"
        onEscapeKeyDown={(inputEvent) => inputEvent.preventDefault()}
        onPointerDownOutside={(inputEvent) => inputEvent.preventDefault()}
        onInteractOutside={(inputEvent) => inputEvent.preventDefault()}
      >
        <DialogTitle className={srOnly}>人力外包甲方通知</DialogTitle>
        <DialogDescription className={srOnly}>必须关闭通知或更换驻场员工后才能继续游戏时间</DialogDescription>
        {notice ? (
          <section className={cn('rounded-md border-l-4 bg-[rgba(12,15,15,0.72)] px-4 py-4', eventBorderToneClass.warning)}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 text-xs font-extrabold text-[#d5c4a1]">
                  第 {notice.checkedDay} 天日报 · {notice.clientName}
                </p>
                <h2 className="m-0 mt-1 text-xl text-[#efe2c8]">驻场产出未达标</h2>
              </div>
              <span className="rounded-md border border-[#59423c] bg-[#211a18] px-2 py-1 text-xs font-extrabold text-[#f1dfc1]">
                时间已暂停
              </span>
            </div>
            <p className="mb-3 mt-0 text-sm leading-6 text-[#c9c1ad]">
              {notice.employeeName ?? '当前驻场员工'} 昨日产出 {Math.round(notice.actualOutput)} / {Math.round(notice.requiredOutput)}，
              甲方要求更换人员；当天不会结算人力收入。
            </p>
            {contract ? (
              <div className="mb-3 grid gap-2 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-xs font-extrabold text-[#d8cfbb]">
                <span>{contract.title} · {laborStatusLabels[contract.status]} · 第 {contract.endDay} 天到期</span>
                <span>
                  需求 {roleLabels[contract.requiredRole]} 能力 {contract.requiredAbility} · 今日产出 {Math.round(contract.todayOutput)} / {Math.round(contract.todayRequiredOutput)}
                </span>
              </div>
            ) : null}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button type="button" className={button} onClick={() => resolveLaborClientNotice(notice.id)}>
                关闭继续
              </button>
            </div>
            {contract ? (
              <LaborEmployeePicker
                contract={contract}
                employees={employees}
                laborContracts={laborContracts}
                projectContracts={projectContracts}
                canAssign={canReplace}
                onAssignEmployee={(employeeId) => resolveLaborClientNotice(notice.id, employeeId, 'immediate')}
              />
            ) : (
              <p className="m-0 text-sm text-[#aeb5ac]">关联合同已经不存在，只能关闭通知继续。</p>
            )}
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
