import { CircleHelp } from 'lucide-react'

import type { Employee } from '../../game/types'
import { button } from '../../styles/tw'
import { money } from '../../utils'
import { Slider } from '../ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'

interface FireCompensationControlProps {
  employee: Employee
  ratio: string
  disabled: boolean
  onRatioChange: (value: string) => void
  onFire: () => void
}

function parseRatio(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 1
  }
  return Math.min(2, Math.max(0, parsed))
}

export function FireCompensationControl({
  employee,
  ratio,
  disabled,
  onRatioChange,
  onFire,
}: FireCompensationControlProps) {
  const compensationRatio = parseRatio(ratio)
  // 辞退赔偿金额与 employeeSystem.fireEmployee 保持一致，会影响辞退时的现金扣款和后续劳动风险。
  const baseCompensation = Math.round(employee.salaryPerDay)
  const finalCompensation = Math.round(baseCompensation * compensationRatio)

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#d4cbb6]">
          <span>赔偿系数 {compensationRatio.toFixed(2)}N</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="辞退赔偿说明">
                  <CircleHelp className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>法律规定公司提出协商辞退员工最少是工作天数*日工资/6</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <strong className="text-[#efe2c8]">{money(finalCompensation)}</strong>
      </div>

      <Slider
        aria-label={`${employee.name} 辞退赔偿金额`}
        name={`detail-fire-compensation-${employee.id}`}
        min={0}
        max={2}
        step={0.05}
        value={[compensationRatio]}
        disabled={disabled}
        onValueChange={(value) => onRatioChange(String(value[0] ?? 0))}
      />

      <div className="grid gap-1.5 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-[13px] text-[#d8cfbb]">
        <span>
          赔偿基数：日工资 = {money(baseCompensation)}
        </span>
        <strong className="text-[#efe2c8]">
          最终赔偿：日工资 * {compensationRatio.toFixed(2)}N = {money(finalCompensation)}
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
