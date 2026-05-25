import type { ChangeEvent } from 'react'
import { useRef, useState } from 'react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import type { WorkHour } from '../game/types'
import { workHours } from '../game/ui'
import { useGameStore } from '../store/gameStore'
import {
  button,
  cn,
  dialogPanel,
  eyebrow,
  menuAction,
  panel,
  panelHeader,
  panelTitle,
  secondaryButton,
  select,
  srOnly,
} from '../styles/tw'
import type { VisualSettings } from '../type'

interface VisualSettingsFieldsProps {
  visualSettings: VisualSettings
  onUpdateVisualSettings: (patch: Partial<VisualSettings>) => void
  includeMotion?: boolean
}

export function VisualSettingsFields({
  visualSettings,
  onUpdateVisualSettings,
  includeMotion = true,
}: VisualSettingsFieldsProps) {
  return (
    <>
      <label>
        界面密度
        <select
          className={select}
          name="visual-density"
          value={visualSettings.density}
          onChange={(event) =>
            onUpdateVisualSettings({ density: event.target.value as VisualSettings['density'] })
          }
        >
          <option value="compact">紧凑</option>
          <option value="comfortable">舒展</option>
        </select>
      </label>
      <label>
        主题模式
        <select
          className={select}
          name="visual-theme"
          value={visualSettings.theme}
          onChange={(event) =>
            onUpdateVisualSettings({ theme: event.target.value as VisualSettings['theme'] })
          }
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </label>
      {includeMotion ? (
        <label>
          动效
          <select
            className={select}
            name="visual-motion"
            value={visualSettings.motion}
            onChange={(event) =>
              onUpdateVisualSettings({ motion: event.target.value as VisualSettings['motion'] })
            }
          >
            <option value="standard">标准</option>
            <option value="reduced">减少</option>
          </select>
        </label>
      ) : null}
      <label>
        音量 {visualSettings.volume}
        <input
          className="min-h-8 w-full rounded-md border border-[#4b514d] bg-[#171c1b] p-0 text-[#e8ddc7]"
          name="visual-volume"
          type="range"
          min="0"
          max="100"
          value={visualSettings.volume}
          onChange={(event) => onUpdateVisualSettings({ volume: Number(event.target.value) })}
        />
      </label>
    </>
  )
}

interface HomeSettingsDialogProps {
  visualSettings: VisualSettings
  onUpdateVisualSettings: (patch: Partial<VisualSettings>) => void
}

export function HomeSettingsDialog({
  visualSettings,
  onUpdateVisualSettings,
}: HomeSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className={menuAction}>
          设置
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(calc(100vw-32px),720px)]">
        <DialogTitle>设置</DialogTitle>
        <DialogDescription className="mb-[18px] mt-0 text-[#aab0a8]">
          当前为视觉占位设置，不影响游戏结算。
        </DialogDescription>
        <div className="mb-4 grid gap-3 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[13px] [&_label]:font-extrabold [&_label]:text-[#d4cbb6] [&_select]:w-full">
          <VisualSettingsFields
            visualSettings={visualSettings}
            onUpdateVisualSettings={onUpdateVisualSettings}
          />
        </div>
        <div className="mb-3.5 flex flex-wrap items-center gap-2.5 max-[560px]:[&_button]:w-full">
          <DialogClose asChild>
            <button type="button" className={button}>完成</button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface DashboardSettingsPanelProps {
  visualSettings: VisualSettings
  onOpenHome: () => void
  onUpdateVisualSettings: (patch: Partial<VisualSettings>) => void
}

export function DashboardSettingsPanel({
  visualSettings,
  onOpenHome,
  onUpdateVisualSettings,
}: DashboardSettingsPanelProps) {
  const offWorkHour = useGameStore((state) => state.settings.offWorkHour)
  const setOffWorkHour = useGameStore((state) => state.setOffWorkHour)
  const resetGame = useGameStore((state) => state.resetGame)
  const tick = useGameStore((state) => state.tick)
  const exportSaveJson = useGameStore((state) => state.exportSaveJson)
  const getSaveFileName = useGameStore((state) => state.getSaveFileName)
  const loadSaveJson = useGameStore((state) => state.loadSaveJson)
  const saveInputRef = useRef<HTMLInputElement>(null)
  const [saveStatus, setSaveStatus] = useState('')

  function downloadSave() {
    const saveJson = exportSaveJson()
    const fileName = getSaveFileName()
    const blob = new Blob([saveJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setSaveStatus(`已保存 ${fileName}`)
  }

  async function loadSave(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      loadSaveJson(await file.text())
      setSaveStatus(`已读取 ${file.name}`)
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : '读取存档失败')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <section className={cn(panel, dialogPanel)}>
      <div className={panelHeader}>
        <div>
          <p className={eyebrow}>系统</p>
          <h2 className={panelTitle}>设置</h2>
        </div>
        <button type="button" className={secondaryButton} onClick={onOpenHome}>
          返回主菜单
        </button>
      </div>
      <div className="mb-4 grid gap-3 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-[13px] [&_label]:font-extrabold [&_label]:text-[#d4cbb6] [&_select]:w-full">
        <label>
          下班时间
          <select
            className={select}
            name="dashboard-off-work-hour"
            value={offWorkHour}
            onChange={(event) => setOffWorkHour(Number(event.target.value) as WorkHour)}
          >
            {workHours.map((hour) => (
              <option key={hour} value={hour}>{hour}:00</option>
            ))}
          </select>
        </label>
        <VisualSettingsFields
          visualSettings={visualSettings}
          onUpdateVisualSettings={onUpdateVisualSettings}
          includeMotion={false}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={button} onClick={() => tick(2000)}>推进 1 分钟</button>
        <button type="button" className={button} onClick={() => tick(60 * 2000)}>推进 60 分钟</button>
        <button type="button" className={button} onClick={downloadSave}>保存 JSON</button>
        <button type="button" className={button} onClick={() => saveInputRef.current?.click()}>读取 JSON</button>
        <button type="button" className={button} onClick={resetGame}>重开</button>
        <input
          ref={saveInputRef}
          aria-label="选择 JSON 存档"
          className={srOnly}
          type="file"
          accept=".json,.companysim,application/json"
          onChange={loadSave}
        />
      </div>
      {saveStatus ? <span className="inline-flex min-h-8 max-w-full items-center text-[13px] font-extrabold text-[#aab0a8] [overflow-wrap:anywhere]" role="status">{saveStatus}</span> : null}
    </section>
  )
}
