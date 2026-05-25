import { progressTone } from '../../game/ui'
import { cn, progressFill, progressToneClass, progressTrack } from '../../styles/tw'

interface StatusBarProps {
  label: string
  value: number
  inverse?: boolean
}

export function StatusBar({ label, value, inverse = false }: StatusBarProps) {
  const tone = inverse ? progressTone(100 - value) : progressTone(value)

  return (
    <div className="grid grid-cols-[72px_minmax(80px,1fr)_42px] items-center gap-2 text-[13px] text-[#d4cbb6]">
      <span>{label}</span>
      <div className={progressTrack}>
        <i className={cn(progressFill, progressToneClass[tone])} style={{ width: `${value}%` }} />
      </div>
      <em className="text-right not-italic text-[#e8ddc7]">{value}%</em>
    </div>
  )
}
