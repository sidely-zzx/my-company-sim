import { progressTone } from '../../game/ui'

interface StatusBarProps {
  label: string
  value: number
  inverse?: boolean
}

export function StatusBar({ label, value, inverse = false }: StatusBarProps) {
  const tone = inverse ? progressTone(100 - value) : progressTone(value)

  return (
    <div className="status-bar-row">
      <span>{label}</span>
      <div className="progress-track">
        <i className={`progress-fill progress-${tone}`} style={{ width: `${value}%` }} />
      </div>
      <em>{value}%</em>
    </div>
  )
}
