import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

export interface SelectFieldOption<TValue extends string> {
  value: TValue
  label: ReactNode
  disabled?: boolean
}

interface SelectFieldProps<TValue extends string> {
  label: ReactNode
  value: TValue
  options: readonly SelectFieldOption<TValue>[]
  onValueChange: (value: TValue) => void
  name?: string
  disabled?: boolean
  placeholder?: string
  className?: string
  triggerClassName?: string
}

export function SelectField<TValue extends string>({
  label,
  value,
  options,
  onValueChange,
  name,
  disabled = false,
  placeholder,
  className,
  triggerClassName,
}: SelectFieldProps<TValue>) {
  return (
    <label className={cn('grid gap-1 text-xs font-extrabold text-[#aaa48f]', className)}>
      <span>{label}</span>
      <Select
        name={name}
        value={value}
        disabled={disabled}
        onValueChange={(nextValue) => onValueChange(nextValue as TValue)}
      >
        {/* 当前值受玩家在下拉框里的选择影响，并会继续影响筛选条件、项目分配或设置状态。 */}
        <SelectTrigger
          className={cn(
            'min-h-8 min-w-[6rem] border-[#4b514d] bg-[#171c1b] px-2 text-[#e8ddc7] shadow-none hover:border-[#8b7f63] hover:text-[#e8ddc7] focus-visible:border-[#8b7f63] focus-visible:text-[#e8ddc7] focus-visible:ring-[#b59d65]/35 disabled:bg-[#303633] disabled:text-[#777f78]',
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="border border-[#4b514d] bg-[#171c1b] text-[#e8ddc7]">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="hover:bg-[#3a403d] hover:text-[#efe2c8] hover:**:text-[#efe2c8] focus:bg-[#f9f8d6] focus:text-[#efe2c8] focus:**:text-[#efe2c8]"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}
