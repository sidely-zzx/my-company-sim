import { CircleHelp } from 'lucide-react'

import { calculateFireCompensation } from '../../game/systems/employeeSystem'
import type { Employee } from '../../game/types'
import { button } from '../../styles/tw'
import { money } from '../../utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'

interface FireCompensationControlProps {
  employee: Employee
  disabled: boolean
  onFire: () => void
}

export function FireCompensationControl({
  employee,
  disabled,
  onFire,
}: FireCompensationControlProps) {
  const compensationWeeks = Math.max(1, Math.ceil(employee.workDays / 7))
  // 辞退赔偿固定按 100% 支付，和 employeeSystem.fireEmployee 保持一致；玩家不再能通过降低赔偿系数转嫁风险。
  const finalCompensation = calculateFireCompensation(employee)

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#d4cbb6]">
          <span>固定赔偿 100%</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="辞退赔偿说明">
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>当前规则固定按日薪 * 工作周数计算；工作周数由本公司工作天数向上折算。</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <strong className="text-[#efe2c8]">{money(finalCompensation)}</strong>
      </div>

      <div className="grid gap-1.5 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-[13px] text-[#d8cfbb]">
        <span>
          赔偿基数：日工资 {money(employee.salaryPerDay)} * {compensationWeeks} 周
        </span>
        <strong className="text-[#efe2c8]">
          最终赔偿：{money(finalCompensation)}
        </strong>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={disabled} onClick={onFire}>
          辞退员工
        </button>
      </div>
    </div>
  )
}
