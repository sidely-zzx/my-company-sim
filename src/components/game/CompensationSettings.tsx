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

export interface CompensationLimits {
  /** 日薪滑杆下限百分比；日薪会影响现金流、社保成本、辞退赔偿和 Offer 接受判断。 */
  salaryMinPercent?: number
  /** 日薪滑杆上限百分比；教学期会收窄它，避免第一单被极端工资破坏。 */
  salaryMaxPercent?: number
  /** 社保公积金比例下限；比例越低越省钱，但会提高满意度和劳动风险问题。 */
  socialMinPercent?: number
  /** 社保公积金比例上限；通常为 100%，表示按实际工资足额缴纳。 */
  socialMaxPercent?: number
}

interface CompensationSettingsProps {
  id: string
  personName: string
  value: CompensationFormState
  salaryBase: number
  salaryLabel: string
  costLabel: string
  limits?: CompensationLimits
  limitHint?: string
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

function salaryBounds(salaryBase: number, limits?: CompensationLimits): { min: number; max: number } {
  const safeSalaryBase = Math.max(1, Math.round(salaryBase))
  const minPercent = limits?.salaryMinPercent ?? 0
  const maxPercent = limits?.salaryMaxPercent ?? 200
  return {
    min: Math.round(safeSalaryBase * minPercent / 100),
    max: Math.round(safeSalaryBase * maxPercent / 100),
  }
}

export function getCompensationSummary(
  value: CompensationFormState,
  salaryBase: number,
  limits?: CompensationLimits,
): CompensationSummary {
  const safeSalaryBase = Math.max(1, Math.round(salaryBase))
  const bounds = salaryBounds(safeSalaryBase, limits)
  const salaryPerDay = Math.min(bounds.max, Math.max(bounds.min, parseSalary(value.salary, safeSalaryBase)))
  const socialMin = limits?.socialMinPercent ?? 0
  const socialMax = limits?.socialMaxPercent ?? 100
  const socialPercent = Math.min(socialMax, Math.max(socialMin, clampPercent(value.socialPercent)))
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
  limits,
  limitHint,
  className,
  onChange,
  footer,
}: CompensationSettingsProps) {
  const summary = getCompensationSummary(value, salaryBase, limits)
  const bounds = salaryBounds(salaryBase, limits)
  const salarySliderMin = limits?.salaryMinPercent ?? 0
  const salarySliderMax = limits?.salaryMaxPercent ?? 200
  const socialSliderMin = limits?.socialMinPercent ?? 0
  const socialSliderMax = limits?.socialMaxPercent ?? 100

  return (
    <div className={cn('grid gap-4', className)}>
      {limitHint ? (
        <p className="m-0 rounded-md border border-[#7f6840] bg-[#2d281f] p-3 text-xs font-extrabold leading-5 text-[#ead7aa]">
          {limitHint}
        </p>
      ) : null}
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
            min={bounds.min}
            max={bounds.max}
            onChange={(event) => {
              const parsed = Number(event.target.value)
              if (!Number.isFinite(parsed)) {
                onChange({ salary: event.target.value })
                return
              }
              onChange({ salary: String(Math.min(bounds.max, Math.max(bounds.min, Math.round(parsed)))) })
            }}
          />
        </div>
        <Slider
          aria-label={`${personName} ${salaryLabel}快捷调整`}
          name={`${id}-salary-slider`}
          min={salarySliderMin}
          max={salarySliderMax}
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
          min={socialSliderMin}
          max={socialSliderMax}
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
