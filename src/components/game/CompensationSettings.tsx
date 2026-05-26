import type { ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'

import { SOCIAL_INSURANCE_COMPANY_RATE } from '../../game/constants'
import { cn } from '../../styles/tw'
import { money } from '../../utils'
import { Input } from '../ui/input'
import { Slider } from '../ui/slider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'

export interface CompensationFormState {
  salary: string
  socialPercent: number
}

export interface CompensationSummary {
  salaryPerDay: number
  salarySliderValue: number
  socialPercent: number
  socialInsuranceRatio: number
  socialInsuranceCost: number
  totalCost: number
}

interface CompensationSettingsProps {
  id: string
  personName: string
  value: CompensationFormState
  salaryBase: number
  salaryLabel: string
  costLabel: string
  className?: string
  onChange: (patch: Partial<CompensationFormState>) => void
  footer?: (summary: CompensationSummary) => ReactNode
}

const SOCIAL_INSURANCE_TIP =
  '法律规定社保基数为实际工资，实际工资*26%社保+实际工资*12%公积金。如果未足额缴纳员工投诉举报后要双倍补缴'

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(100, Math.max(0, Math.round(value)))
}

function parseSalary(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback
}

export function getCompensationSummary(
  value: CompensationFormState,
  salaryBase: number,
): CompensationSummary {
  const safeSalaryBase = Math.max(1, Math.round(salaryBase))
  const salaryPerDay = parseSalary(value.salary, safeSalaryBase)
  const socialPercent = clampPercent(value.socialPercent)
  const salarySliderValue = Math.round(
    Math.min(salaryPerDay, safeSalaryBase * 2) / safeSalaryBase * 100,
  )
  const socialInsuranceRatio = socialPercent / 100
  const socialInsuranceCost = Math.round(
    // 社保公积金支出受工资和缴纳比例影响，并会影响入职后或调薪后的每日现金流。
    salaryPerDay * socialInsuranceRatio * SOCIAL_INSURANCE_COMPANY_RATE,
  )
  const totalCost = salaryPerDay + socialInsuranceCost

  return {
    salaryPerDay,
    salarySliderValue,
    socialPercent,
    socialInsuranceRatio,
    socialInsuranceCost,
    totalCost,
  }
}

export function CompensationSettings({
  id,
  personName,
  value,
  salaryBase,
  salaryLabel,
  costLabel,
  className,
  onChange,
  footer,
}: CompensationSettingsProps) {
  const summary = getCompensationSummary(value, salaryBase)

  return (
    <div className={cn('grid gap-4', className)}>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <label
            className="text-[13px] font-extrabold text-[#d4cbb6]"
            htmlFor={`${id}-salary`}
          >
            {salaryLabel}
          </label>
          <Input
            id={`${id}-salary`}
            className="w-32 text-right"
            aria-label={`${personName} ${salaryLabel}`}
            name={`${id}-salary`}
            type="number"
            value={value.salary}
            min={0}
            onChange={(event) => onChange({ salary: event.target.value })}
          />
        </div>
        <Slider
          aria-label={`${personName} ${salaryLabel}快捷调整`}
          name={`${id}-salary-slider`}
          min={0}
          max={200}
          step={1}
          value={[summary.salarySliderValue]}
          onValueChange={(nextValue) => {
            const salaryPercent = nextValue[0] ?? 100
            const salary = Math.round(Math.max(1, salaryBase) * salaryPercent / 100)
            onChange({ salary: String(salary) })
          }}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#d4cbb6]">
            <span>社保公积金 {summary.socialPercent}%</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="社保公积金说明"
                  >
                    <CircleHelp className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{SOCIAL_INSURANCE_TIP}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <strong className="text-[#efe2c8]">{summary.socialPercent}%</strong>
        </div>
        <Slider
          aria-label={`${personName} 社保比例`}
          name={`${id}-social`}
          min={0}
          max={100}
          step={1}
          value={[summary.socialPercent]}
          onValueChange={(nextValue) =>
            onChange({
              salary: value.salary,
              socialPercent: nextValue[0] ?? 0,
            })
          }
        />
      </div>

      <div className="grid gap-1.5 rounded-md border border-[#303834] bg-[#171c1b] p-3 text-[13px]">
        <span className="text-[#d8cfbb]">
          社保支出：{summary.socialPercent} * {summary.salaryPerDay} / 100 * 38% = {money(summary.socialInsuranceCost)}
        </span>
        <strong className="text-[#efe2c8]">{costLabel}：{money(summary.totalCost)}</strong>
      </div>

      {footer ? footer(summary) : null}
    </div>
  )
}
